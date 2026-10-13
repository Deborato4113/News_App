const { z } = require('zod');

// ── Request: POST /api/agent/ask ─────────────────────────────────
// Only `question` is accepted. Anything else in the body (e.g. a sneaky
// `userId`) is stripped by zod, so identity can only ever come from the
// logged-in session.
const askAgentSchema = z.object({
  question: z
    .string({
      required_error: 'question is required',
      invalid_type_error: 'question must be a string',
    })
    .trim()
    .min(5, 'Question must be at least 5 characters')
    .max(500, 'Question must be at most 500 characters'),

  // Conversation memory: the last few turns, sent by the browser so a
  // follow-up like "and what about last week?" makes sense. Plain text only,
  // capped in count and length. It is the user's own text, so it carries no
  // more authority than the question itself, and the prompt tells the model
  // to treat it as context, not as instructions.
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1).max(1500),
      })
    )
    .max(6, 'history can hold at most 6 messages')
    .default([]),
});

// ── Other request bodies ─────────────────────────────────────────
const OBJECT_ID = /^[a-f\d]{24}$/i;
const objectId = z.string().trim().regex(OBJECT_ID, 'must be a 24-character id');

// PATCH /api/agent/runs/:id/feedback  { rating }
const feedbackSchema = z.object({ rating: z.enum(['up', 'down', 'none']) });

// POST /api/agent/actions/bookmark  { articleId } — the user pressed Confirm
const bookmarkActionSchema = z.object({ articleId: objectId });

// ── The AI's final answer ────────────────────────────────────────
// The model is told to reply with exactly this JSON shape. We never trust
// it: the agent loop parses the reply and validates it against this schema.
// Source URLs must be http(s) so a model (or an injected article) can't
// smuggle a `javascript:` link into the UI.
const httpUrl = z
  .string()
  .trim()
  .max(2000)
  .url()
  .refine((u) => /^https?:\/\//i.test(u), 'url must start with http:// or https://');

const finalAnswerSchema = z.object({
  answer: z.string().trim().min(1, 'answer is empty').max(4000),
  // Each source is a ref number (preferred: the server looks up the real link)
  // or a full {title, url}. "2" and "[2]" are accepted as 2.
  sources: z
    .array(
      z.preprocess(
        (v) => (typeof v === 'string' && /^\[?\s*\d{1,3}\s*\]?$/.test(v) ? Number(v.replace(/\D/g, '')) : v),
        z.union([
          z.number().int().min(1).max(500),
          z.object({
            title: z.string().trim().max(200).default(''),
            url: httpUrl,
          }),
        ]),
      )
    )
    .max(8)
    .default([]),
  // Optional next questions to suggest. Lenient on purpose: junk here must
  // never invalidate an otherwise good answer, so bad entries are dropped.
  followUps: z.preprocess(
    (v) => (Array.isArray(v)
      ? v.filter((s) => typeof s === 'string' && s.trim().length >= 3).map((s) => s.trim().slice(0, 120)).slice(0, 3)
      : []),
    z.array(z.string()),
  ),
});

module.exports = { askAgentSchema, finalAnswerSchema, feedbackSchema, bookmarkActionSchema, OBJECT_ID };
