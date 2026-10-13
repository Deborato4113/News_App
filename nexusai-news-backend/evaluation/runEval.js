// Grades the REAL agent against the fixed question set and writes a report.
//
//   npm run eval                       all 20 questions
//   npm run eval -- --limit=5          just the first 5 (a quick check)
//   npm run eval -- --delay=30000      pause 30s between questions
//   npm run eval -- --user=me@x.com    run as this user (default: first user)
//   npm run eval -- --retry-wait=90000 wait this long, then retry questions refused for quota
//
// It calls the live AI, so it needs GROQ_API_KEY and MONGODB_URI in .env and
// uses AI quota: 20 questions is roughly 100k tokens. Open a few regions in
// the app first so there are articles to find, and run it when the free tier
// isn't already busy. The free tier also has a DAILY
// token cap per model (200k on gpt-oss-20b): a full run uses about half, so run it
// once on a fresh day and don't stack several runs. Questions run one at a time with a pause between them.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const { CASES } = require('./cases');
const { runCases, summarize, toMarkdown } = require('./scoring');

function argOf(name, fallback) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
}

async function main() {
  // Required here (not at the top) so merely importing this file in a test
  // never needs an API key or a database.
  const User = require('../models/User');
  const agentLlm = require('../services/agentLlm');
  const { createTools } = require('../services/agentTools');
  const { runAgent } = require('../services/agentService');

  const delayMs = Number(argOf('delay', 20000));
  const limit = Number(argOf('limit', CASES.length));
  const email = argOf('user', '');

  await mongoose.connect(process.env.MONGODB_URI);
  const user = email ? await User.findOne({ email: email.toLowerCase() }) : await User.findOne({}).sort({ createdAt: 1 });
  if (!user) throw new Error('No user found. Sign up in the app first, or pass --user=<email>.');
  console.log(`Running as ${user.email}. ${Math.min(limit, CASES.length)} question(s), ${delayMs / 1000}s apart.\n`);

  const quiet = { info() {}, warn() {}, error() {} };
  const rows = await runCases({
    cases: CASES.slice(0, limit),
    delayMs,
    retryQuotaAfterMs: Number(argOf('retry-wait', 90000)), // questions refused only for quota get one more try
    runOne: (testCase) => runAgent({
      question: testCase.question,
      tools: createTools({ userId: String(user._id) }),
      llm: agentLlm,
      logger: quiet,
    }),
    onProgress: (row, i, total, extra = {}) => {
      const status = row.error ? `ERROR ${row.error}` : `${row.toolsOk ? 'tools ok' : 'WRONG TOOLS'} · ${row.answered ? 'answered' : 'stopped early'} · ${(row.durationMs / 1000).toFixed(1)}s`;
      console.log(`[${i + 1}/${total}] ${row.id}${extra.retry ? ' (retry)' : ''}: ${row.quotaLimited ? 'QUOTA-LIMITED (not graded)' : status}`);
    },
  });

  const summary = summarize(rows);
  const meta = { date: new Date().toISOString().slice(0, 10), model: process.env.AGENT_MODEL || 'openai/gpt-oss-20b' };
  const md = toMarkdown(summary, rows, meta);

  fs.writeFileSync(path.join(__dirname, 'results.md'), md);
  fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify({ meta, summary, rows }, null, 2));

  console.log('\n' + md.split('\n').slice(0, 16).join('\n'));
  console.log('\nFull report: evaluation/results.md');
}

if (require.main === module) {
  main()
    .catch((err) => { console.error(err.message); process.exitCode = 1; })
    .finally(() => mongoose.disconnect());
}

module.exports = { main };
