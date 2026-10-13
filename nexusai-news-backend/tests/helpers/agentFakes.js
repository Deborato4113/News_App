// Test doubles for the Ask NexusAI agent. Nothing here calls the real AI or
// a real database, so tests are fast, free and fully deterministic.

// ── Fake AI ─────────────────────────────────────────────────────────
// Shape of a model reply, as returned by services/agentLlm.chat().
const reply = ({ content = null, toolCalls, tokens = 10, model } = {}) => ({
  message: { role: 'assistant', content, ...(toolCalls && { tool_calls: toolCalls }) },
  usage: { total_tokens: tokens },
  ...(model && { model }),
});

// The model asks for one or more tools. `args` may be an object (stringified
// like a real API does) or a raw string, for testing malformed JSON.
const toolCall = (name, args = {}, id = `call_${name}`) => ({
  id,
  type: 'function',
  function: { name, arguments: typeof args === 'string' ? args : JSON.stringify(args) },
});
const toolReply = (name, args, id) => reply({ toolCalls: [toolCall(name, args, id)] });

// The model gives its final answer in the requested JSON format.
const finalReply = (answer, sources = []) => reply({ content: JSON.stringify({ answer, sources }) });
const textReply = (text) => reply({ content: text });

// A fake `llm` that plays back a script, one entry per call. Entries can be
// a reply, an Error (thrown), or a function (req) => reply|Error. When the
// script runs out, the LAST entry repeats — handy for "keeps asking for tools".
// `calls` records a deep copy of every request the loop made.
function scriptedLlm(script) {
  const calls = [];
  let i = 0;
  return {
    calls,
    chat: async (req) => {
      calls.push(JSON.parse(JSON.stringify(req)));
      const entry = script[Math.min(i, script.length - 1)];
      i += 1;
      const out = typeof entry === 'function' ? entry(req) : entry;
      if (out instanceof Error) throw out;
      return out;
    },
  };
}

// ── Fake data layer (for unit-testing the real tools without MongoDB) ──
function chain(result) {
  const q = { sort: () => q, limit: () => q, select: () => q, lean: () => Promise.resolve(result) };
  return q;
}

const sampleArticle = (over = {}) => ({
  _id: 'a'.repeat(24),
  title: 'Mumbai floods disrupt local trains',
  summary: 'Heavy rain flooded tracks across Mumbai on Monday.',
  description: 'Heavy rain flooded railway tracks across Mumbai, delaying suburban services for hours.',
  url: 'https://example.com/mumbai-floods',
  source: { name: 'Example News' },
  region: 'mumbai',
  category: 'General',
  sentiment: 'neg',
  biasLevel: 'low',
  factCheckNote: '',
  publishedAt: new Date('2026-10-01T08:00:00Z'),
  ...over,
});

function makeDeps({ articles = [], attempts = [], byId = {}, quiz, followedRegions = [] } = {}) {
  const seen = { articleFilters: [], attemptFilters: [] };
  const deps = {
    Article: {
      find: jest.fn((filter) => { seen.articleFilters.push(filter); return chain(articles); }),
      findById: jest.fn((id) => ({ lean: () => Promise.resolve(byId[id] || null) })),
    },
    User: {
      findById: jest.fn(() => ({ select: () => ({ lean: () => Promise.resolve({ followedRegions }) }) })),
    },
    QuizAttempt: {
      find: jest.fn((filter) => { seen.attemptFilters.push(filter); return chain(attempts); }),
    },
    newsService: {
      fetchAndEnrichNews: jest.fn(async () => []),
      saveArticles: jest.fn(async () => []),
    },
    aiService: {
      generateQuiz: jest.fn(async () => quiz ?? [
        { question: 'Q1?', options: ['A) a', 'B) b', 'C) c', 'D) d'], answer: 'A', explanation: 'Because.' },
      ]),
    },
  };
  return { deps, seen };
}

module.exports = { reply, toolCall, toolReply, finalReply, textReply, scriptedLlm, chain, sampleArticle, makeDeps };
