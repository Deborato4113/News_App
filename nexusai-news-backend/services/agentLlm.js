// The ONLY file that talks to the AI provider for the agent. The agent loop
// (agentService.js) just calls `llm.chat(...)`, so tests can swap this out
// for a fake that returns scripted replies — no network, no API key, no cost.
//
// Contract:  chat({ messages, tools, toolChoice }) -> { message, usage, model }
//   message: the assistant message ({ content, tool_calls? })
//   usage:   { total_tokens } (may be undefined)
//   model:   which model actually answered (useful when a fallback was used)
//
// MODEL FALLBACK: every Groq model has its own rate-limit bucket. If the main
// model is rate-limited (429), overloaded (5xx) or too slow, the same request
// is sent to a second model straight away. A model that said "retry in N
// seconds" is skipped until then, so later rounds of the same question don't
// waste a call re-hitting it.
const Groq = require('groq-sdk');

const DEFAULT_PRIMARY = 'openai/gpt-oss-20b';
// Same family as the main model, so if your key can use one it can use the other.
// (Models your key cannot use answer 404; those are skipped automatically.)
const DEFAULT_FALLBACK = 'openai/gpt-oss-120b';
const NOT_FOUND_BACKOFF_MS = 60 * 60 * 1000; // a model your key can't use: don't retry for an hour

// AGENT_MODEL overrides the main model. AGENT_FALLBACK_MODEL overrides the
// backup; set it to "none" to switch the fallback off. A blank value counts as
// "not set", so a leftover `AGENT_FALLBACK_MODEL=` line in .env is harmless.
function configuredModels(env = process.env) {
  const primary = (env.AGENT_MODEL || '').trim() || DEFAULT_PRIMARY;
  const raw = (env.AGENT_FALLBACK_MODEL || '').trim();
  const fallback = raw === '' ? DEFAULT_FALLBACK : (['none', 'off', 'false'].includes(raw.toLowerCase()) ? null : raw);
  const models = [primary];
  if (fallback && fallback !== primary) models.push(fallback);
  return models;
}

// Errors where trying a different model can actually help.
function isFallbackWorthy(err) {
  if (err?.status === 429) return true;
  if (err?.status === 404) return true; // model_not_found: this key can't use that model
  if (typeof err?.status === 'number' && err.status >= 500) return true;
  if (isToolUseFailed(err)) return true;
  return err?.name === 'APIConnectionTimeoutError' || err?.name === 'APIConnectionError';
}

// Groq answers 400 "tool_use_failed" when the model writes a malformed tool
// call, or calls a tool although tool_choice is "none". It's a model hiccup,
// not a bad request, so another try (or another model) usually works.
function isToolUseFailed(err) {
  const text = `${err?.error?.error?.code || ''} ${err?.error?.code || ''} ${err?.message || ''}`;
  return err?.status === 400 && /tool_use_failed|tool choice is none/i.test(text);
}

// Turns a conversation that contains tool calls into plain text: the tool
// results become a user message ("Result of search_news: ..."). Used as a last
// resort in the "answer now, no more tools" round: with no tool messages in
// sight, the model has nothing left to try to call.
function flattenToolMessages(messages) {
  const nameOf = new Map(); // tool_call_id -> tool name
  for (const m of messages) for (const c of m.tool_calls || []) nameOf.set(c.id, c.function?.name || 'tool');

  const out = [];
  for (const m of messages) {
    if (m.role === 'tool') {
      const text = `Result of ${nameOf.get(m.tool_call_id) || 'a tool'}: ${m.content}`;
      const last = out[out.length - 1];
      if (last?.role === 'user' && last.flattened) last.content += `\n${text}`;
      else out.push({ role: 'user', content: text, flattened: true });
    } else if (m.role === 'assistant' && m.tool_calls?.length) {
      if (m.content) out.push({ role: 'assistant', content: m.content });
    } else {
      out.push(m);
    }
  }
  return out.map(({ flattened, ...rest }) => rest);
}

// Builds an llm object. `getClient` and `now` are injectable so tests can
// use a fake client and a fake clock.
function createLlm({ getClient, getModels = configuredModels, now = Date.now, onFallback = () => {} }) {
  const blockedUntil = new Map(); // model -> timestamp (ms) until which it is skipped

  async function callModel(model, request) {
    try {
      return await callOnce(model, request);
    } catch (err) {
      // "No more tools" round and the model still tried one: ask again with the
      // tools removed entirely, so it can only write the final answer.
      if (request.toolChoice === 'none' && isToolUseFailed(err)) {
        const noTools = { ...request, tools: [] };
        try {
          return await callOnce(model, noTools);
        } catch (err2) {
          // Some models still try a tool call because tool messages are in the
          // history. Last resort: show them the results as plain text.
          if (!isToolUseFailed(err2)) throw err2;
          return callOnce(model, { ...noTools, messages: flattenToolMessages(request.messages) });
        }
      }
      throw err;
    }
  }

  async function callOnce(model, { messages, tools, toolChoice }) {
    const response = await getClient().chat.completions.create({
      model,
      messages,
      ...(tools?.length && { tools, tool_choice: toolChoice }),
      temperature: 0.2, // research assistant: favour consistency over creativity
      // Reasoning models spend part of this budget "thinking" before they
      // write the visible reply, so leave generous headroom or the final JSON
      // gets cut off mid-answer.
      max_tokens: 3000,
    });
    return { message: response.choices[0].message, usage: response.usage, model };
  }

  async function chat(request) {
    const models = getModels();
    // Skip models that asked us to back off — unless that would leave none.
    const usable = models.filter((m) => (blockedUntil.get(m) || 0) <= now());
    const order = usable.length ? usable : models;

    let firstError;
    let rateLimitError; // kept separately: a later 404/5xx must not hide a 429's retry-after
    for (let i = 0; i < order.length; i += 1) {
      const model = order[i];
      try {
        return await callModel(model, request);
      } catch (err) {
        if (!isFallbackWorthy(err)) throw err; // e.g. a malformed request: another model won't help
        if (err.status === 404) blockedUntil.set(model, now() + NOT_FOUND_BACKOFF_MS);
        if (err.status === 429) {
          rateLimitError = rateLimitError || err;
          const seconds = Number(err.headers?.['retry-after']);
          blockedUntil.set(model, now() + (Number.isFinite(seconds) && seconds > 0 ? seconds : 20) * 1000);
        }
        firstError = firstError || err;
        if (i < order.length - 1) onFallback({ from: model, to: order[i + 1], status: err.status, reason: err.name });
      }
    }
    // Every model failed. Prefer the rate-limit error (the caller can wait it out), else the first.
    throw rateLimitError || firstError;
  }

  return { chat };
}

let client;
// Created lazily so merely importing this module never needs an API key.
function getRealClient() {
  if (!client) {
    client = new Groq({
      apiKey: process.env.GROQ_API_KEY,
      timeout: 30_000, // a single model call should never hang the whole request
      // The SDK's built-in retry sleeps for however long Groq's rate limiter
      // says and burns the whole time budget in silence. Fail fast instead;
      // the fallback model (or the loop's own retry) takes over.
      maxRetries: 0,
    });
  }
  return client;
}

const logger = require('../utils/logger');

const defaultLlm = createLlm({
  getClient: getRealClient,
  onFallback: (info) => logger.warn(info, 'AI model failed, falling back to the backup model'),
});

module.exports = { chat: defaultLlm.chat, createLlm, configuredModels, isFallbackWorthy, isToolUseFailed, flattenToolMessages };
