// Pure functions that grade agent runs and summarise the grades. No
// database, no AI: fully unit-tested (tests/agent/evaluation.test.js).

// result: what runAgent() returned. testCase: one entry from cases.js.
function scoreCase(testCase, result) {
  const used = new Set(result.steps.map((s) => s.tool));

  const toolsOk = testCase.expectNoTools
    ? used.size === 0
    : (testCase.expectTools || []).every((t) => used.has(t)) &&
      !(testCase.forbidTools || []).some((t) => used.has(t));

  const answered = result.stoppedReason === 'answered';
  // Tool summaries start with the number of articles ("3 article(s) found").
  const foundArticles = result.steps.some((s) => s.ok && /^[1-9]\d* article/.test(s.summary || ''));
  const citationApplicable = Boolean(testCase.mustCite) && foundArticles;
  const cited = result.sources.length > 0;

  return {
    id: testCase.id,
    category: testCase.category,
    toolsOk,
    answered,
    citationApplicable,
    cited,
    pass: toolsOk && answered,
    toolsUsed: [...used],
    steps: result.steps.length,
    durationMs: result.durationMs,
    tokens: result.totalTokens,
    droppedSources: result.droppedSources || 0,
    models: result.models || [],
    error: null,
  };
}

// The AI provider refused because the free tier's quota is used up (429), or
// the request is bigger than the per-minute limit (413). That says nothing
// about the agent's quality, so such rows are reported separately.
function isQuotaError(err) {
  return [429, 413].includes(err?.status) || /^\s*(429|413)\b/.test(String(err?.message || ''));
}

// A run that crashed counts as a failure — unless it was only the provider's quota.
function scoreError(testCase, err) {
  return {
    quotaLimited: isQuotaError(err),
    id: testCase.id,
    category: testCase.category,
    toolsOk: false,
    answered: false,
    citationApplicable: false,
    cited: false,
    pass: false,
    toolsUsed: [],
    steps: 0,
    durationMs: 0,
    tokens: 0,
    droppedSources: 0,
    models: [],
    error: String(err?.message || err).slice(0, 200),
  };
}

const pct = (num, den) => (den ? Math.round((num / den) * 100) : null);
const mean = (xs) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);
const median = (xs) => {
  if (!xs.length) return 0;
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
};

function summarize(allRows) {
  const quotaLimited = allRows.filter((r) => r.quotaLimited);
  const rows = allRows.filter((r) => !r.quotaLimited); // only questions the agent really got to attempt are graded
  const ran = rows.filter((r) => !r.error);
  const applicable = rows.filter((r) => r.citationApplicable);

  const byCategory = {};
  for (const r of rows) {
    const c = (byCategory[r.category] ||= { total: 0, toolsOk: 0 });
    c.total += 1;
    if (r.toolsOk) c.toolsOk += 1;
  }

  return {
    total: allRows.length,
    scored: rows.length,
    quotaLimited: quotaLimited.length,
    errors: rows.length - ran.length,
    toolSelectionPct: pct(rows.filter((r) => r.toolsOk).length, rows.length),
    answeredPct: pct(rows.filter((r) => r.answered).length, rows.length),
    passPct: pct(rows.filter((r) => r.pass).length, rows.length),
    citationPct: pct(applicable.filter((r) => r.cited).length, applicable.length), // null if no case applied
    citationCases: applicable.length,
    avgDurationMs: mean(ran.map((r) => r.durationMs)),
    medianDurationMs: median(ran.map((r) => r.durationMs)),
    avgSteps: ran.length ? Math.round((ran.reduce((s, r) => s + r.steps, 0) / ran.length) * 10) / 10 : 0,
    avgTokens: mean(ran.map((r) => r.tokens)),
    droppedSources: rows.reduce((s, r) => s + r.droppedSources, 0),
    byCategory: Object.fromEntries(
      Object.entries(byCategory).map(([k, v]) => [k, { ...v, pct: pct(v.toolsOk, v.total) }]),
    ),
  };
}

// Runs every case one after another (never in parallel: the free AI tier is
// limited per minute) with a pause between them. `runOne(case)` returns a
// runAgent() result or throws.
async function runCases({ cases, runOne, delayMs = 0, retryQuotaAfterMs = 0, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), onProgress = () => {} }) {
  const attempt = async (testCase) => {
    try {
      return scoreCase(testCase, await runOne(testCase));
    } catch (err) {
      return scoreError(testCase, err);
    }
  };

  const rows = [];
  for (let i = 0; i < cases.length; i += 1) {
    const row = await attempt(cases[i]);
    rows.push(row);
    onProgress(row, i, cases.length);
    if (delayMs && i < cases.length - 1) await sleep(delayMs);
  }

  // Second chance for questions the provider refused only because of quota.
  if (retryQuotaAfterMs && rows.some((r) => r.quotaLimited)) {
    await sleep(retryQuotaAfterMs);
    for (let i = 0; i < rows.length; i += 1) {
      if (!rows[i].quotaLimited) continue;
      rows[i] = await attempt(cases[i]);
      onProgress(rows[i], i, cases.length, { retry: true });
      if (delayMs) await sleep(delayMs);
    }
  }
  return rows;
}

const mark = (ok) => (ok ? '✅' : '❌');
const sec = (ms) => `${(ms / 1000).toFixed(1)}s`;

function toMarkdown(summary, rows, meta = {}) {
  const lines = [];
  lines.push('# Ask NexusAI — evaluation results', '');
  lines.push(`Run on ${meta.date || new Date().toISOString().slice(0, 10)}${meta.model ? ` · main model \`${meta.model}\`` : ''} · ${summary.total} fixed questions`, '');
  lines.push('| Metric | Result |', '|---|---|');
  lines.push(`| Chose the right tool(s) | **${summary.toolSelectionPct}%** |`);
  lines.push(`| Finished with an answer (no timeout / step limit) | **${summary.answeredPct}%** |`);
  lines.push(`| Cited sources (when articles were found) | **${summary.citationPct === null ? 'n/a' : `${summary.citationPct}%`}**${summary.citationCases ? ` (${summary.citationCases} applicable)` : ''} |`);
  lines.push(`| Average response time | ${sec(summary.avgDurationMs)} (median ${sec(summary.medianDurationMs)}) |`);
  lines.push(`| Average tool calls per question | ${summary.avgSteps} |`);
  lines.push(`| Average tokens per question | ${summary.avgTokens} |`);
  lines.push(`| Made-up source links caught and removed | ${summary.droppedSources} |`);
  lines.push(`| Runs that crashed | ${summary.errors} |`);
  if (summary.quotaLimited) {
    lines.push(`| Not graded: AI provider quota/size limit | ${summary.quotaLimited} of ${summary.total} (excluded from the percentages above) |`);
  }
  lines.push('');

  lines.push('## Tool choice by category', '', '| Category | Correct | |', '|---|---|---|');
  for (const [name, c] of Object.entries(summary.byCategory)) lines.push(`| ${name} | ${c.toolsOk}/${c.total} | ${c.pct}% |`);

  lines.push('', '## Every question', '', '| ID | Right tools | Answered | Cited | Time | Tools used |', '|---|---|---|---|---|---|');
  for (const r of rows) {
    const cited = r.citationApplicable ? mark(r.cited) : '–';
    lines.push(`| ${r.id} | ${mark(r.toolsOk)} | ${mark(r.answered)} | ${cited} | ${sec(r.durationMs)} | ${r.error ? `${r.quotaLimited ? 'not graded (quota)' : 'error'}: ${r.error}` : (r.toolsUsed.join(', ') || 'none')} |`);
  }
  lines.push('');
  return lines.join('\n');
}

module.exports = { scoreCase, scoreError, summarize, runCases, toMarkdown };
