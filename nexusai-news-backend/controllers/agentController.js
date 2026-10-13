const AgentRun = require('../models/AgentRun');
const Article = require('../models/Article');
const agentLlm = require('../services/agentLlm');
const { createTools, clip } = require('../services/agentTools');
const { runAgent } = require('../services/agentService');
const { computeStats } = require('../services/agentStats');
const { OBJECT_ID } = require('../schemas/agentSchemas');
const logger = require('../utils/logger');

const STATS_SAMPLE = 1000;        // most recent runs considered for the analytics view
const HEARTBEAT_MS = 15_000;      // keeps proxies from closing an idle event stream

// Saving analytics must never break the user's answer. Returns the new run's
// id (so the UI can attach a 👍/👎 to it) or null if saving failed.
async function recordRun(data) {
  try {
    const doc = await AgentRun.create(data);
    return String(doc._id);
  } catch (err) {
    logger.warn({ err }, 'Failed to record agent run');
    return null;
  }
}

// Provider trouble → a clear, safe message (never the raw provider error).
function providerError(err) {
  const busy = err?.status === 429;
  return {
    status: busy ? 429 : 502,
    message: busy
      ? 'The AI service is busy right now. Please try again in a minute.'
      : 'The AI service is unavailable right now. Please try again shortly.',
  };
}

// Runs the agent for the logged-in user and returns the JSON payload for the
// UI. Used by both the plain endpoint and the streaming one.
// Identity comes ONLY from the verified session (middleware/auth.js);
// req.body was already reduced to { question, history } by zod.
async function runForUser({ req, onEvent, shouldStop }) {
  const userId = req.user.id;
  const { question, history = [] } = req.body;
  const startedAt = Date.now();

  try {
    const tools = createTools({ userId });
    const result = await runAgent({ question, history, tools, llm: agentLlm, logger, onEvent, shouldStop });

    const status =
      result.stoppedReason === 'answered'
        ? (result.format === 'json' ? 'ok' : 'fallback')
        : result.stoppedReason; // 'max_rounds' | 'timeout' | 'cancelled'

    const runId = await recordRun({
      user: userId,
      question: clip(question, 500),
      status,
      rounds: result.rounds,
      steps: result.steps.length,
      toolsUsed: result.steps.map((s) => s.tool),
      durationMs: result.durationMs,
      totalTokens: result.totalTokens,
      models: result.models,
    });

    return {
      runId,
      answer: result.answer,
      sources: result.sources,
      followUps: result.followUps || [],
      steps: result.steps,
      // Both come from the tools' own results, never from text the AI wrote.
      quiz: [...result.artifacts].reverse().find((a) => a.kind === 'quiz') || null,
      pendingActions: result.artifacts.filter((a) => a.kind === 'action'),
      meta: {
        rounds: result.rounds,
        durationMs: result.durationMs,
        totalTokens: result.totalTokens,
        stoppedReason: result.stoppedReason,
        format: result.format,
        models: result.models,
        trace: result.trace,
      },
    };
  } catch (err) {
    await recordRun({
      user: userId,
      question: clip(question, 500),
      status: 'error',
      durationMs: Date.now() - startedAt,
    });
    logger.error({ err }, 'Agent run failed');
    throw err;
  }
}

// ── POST /api/agent/ask  { question, history? } ─────────────────────
exports.ask = async (req, res) => {
  try {
    res.json(await runForUser({ req }));
  } catch (err) {
    const { status, message } = providerError(err);
    res.status(status).json({ message });
  }
};

// ── POST /api/agent/ask/stream  (same body; Server-Sent Events) ─────
// Sends progress as it happens — model_start, tool_start, tool_done,
// model_done — then one final `result` event (the same JSON as /ask), or an
// `error` event. The browser reads it with fetch() because EventSource can
// only do GET requests and can't send the login token.
exports.askStream = async (req, res) => {
  res.status(200).set({
    'Content-Type': 'text/event-stream; charset=utf-8',
    // no-transform stops the compression middleware from buffering the stream
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // nginx: don't buffer
  });
  res.flushHeaders();

  // 'close' also fires on a normal finish, so only a close BEFORE we ended
  // the response means the browser went away.
  let clientGone = false;
  res.on('close', () => { if (!res.writableEnded) clientGone = true; });

  const write = (chunk) => {
    if (clientGone || res.writableEnded) return;
    res.write(chunk);
    res.flush?.();
  };
  const send = (event, data) => write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  const heartbeat = setInterval(() => write(': ping\n\n'), HEARTBEAT_MS);

  try {
    // If the user closes the tab, stop spending AI tokens on their question.
    const payload = await runForUser({ req, onEvent: (e) => send(e.type, e), shouldStop: () => clientGone });
    send('result', payload);
  } catch (err) {
    send('error', providerError(err));
  } finally {
    clearInterval(heartbeat);
    res.end();
  }
};

// ── PATCH /api/agent/runs/:id/feedback  { rating: 'up' | 'down' | 'none' } ──
// A user can only rate their OWN runs: the owner is part of the query filter.
exports.rateRun = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!OBJECT_ID.test(id)) return res.status(404).json({ message: 'Run not found' });

    const { rating } = req.body;
    const update = rating === 'none' ? { $unset: { feedback: 1 } } : { $set: { feedback: rating } };
    const run = await AgentRun.findOneAndUpdate({ _id: id, user: req.user.id }, update, { new: true })
      .select('feedback')
      .lean();
    if (!run) return res.status(404).json({ message: 'Run not found' });

    res.json({ feedback: run.feedback || null });
  } catch (err) { next(err); }
};

// ── POST /api/agent/actions/bookmark  { articleId } ─────────────────
// The "Confirm" button behind the agent's bookmark_article proposal. The AI
// can never reach this: only the user's browser, with the user's own login.
// Idempotent: the filter skips articles this user already saved, so pressing
// Confirm twice saves once (and doesn't touch the article's updatedAt again).
exports.confirmBookmark = async (req, res, next) => {
  try {
    const { articleId } = req.body;
    const userId = req.user.id;

    const result = await Article.updateOne(
      { _id: articleId, savedBy: { $ne: userId } },
      { $addToSet: { savedBy: userId } },
    );
    if (result.matchedCount) return res.json({ saved: true, alreadySaved: false });

    // Nothing matched: either the article doesn't exist, or it was already saved.
    const exists = await Article.exists({ _id: articleId });
    if (!exists) return res.status(404).json({ message: 'Article not found' });
    res.json({ saved: true, alreadySaved: true });
  } catch (err) { next(err); }
};

async function statsFor(filter) {
  const runs = await AgentRun.find(filter)
    .sort({ createdAt: -1 })
    .limit(STATS_SAMPLE)
    .select('status steps durationMs totalTokens toolsUsed feedback')
    .lean();
  return computeStats(runs);
}

// ── GET /api/agent/stats  (the logged-in user's own runs) ───────────
exports.getMyStats = async (req, res, next) => {
  try {
    res.json(await statsFor({ user: req.user.id }));
  } catch (err) { next(err); }
};

// ── GET /api/agent/stats/all  (admin only — everyone's runs, aggregated) ──
exports.getAllStats = async (req, res, next) => {
  try {
    res.json(await statsFor({}));
  } catch (err) { next(err); }
};
