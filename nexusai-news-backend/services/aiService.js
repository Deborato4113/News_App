const Groq   = require('groq-sdk');
const logger = require('../utils/logger');
const groq   = new Groq({ apiKey: process.env.GROQ_API_KEY });

// A truncated JSON response (cut off by max_tokens) fails Groq's own
// response_format validation and comes back as a 400 invalid_request_error
// whose body mentions "failed_generation". Detect that case specifically
// so callers can decide whether to retry with more headroom.
function isFailedGenerationError(err) {
  const msg = err?.message || err?.error?.message || '';
  return err?.status === 400 && /failed_generation/i.test(JSON.stringify(err?.error || msg));
}

async function callGroq(prompt, { json = false, maxTokens = 1024, retries = 1 } = {}) {
  let attempt = 0;
  let tokens = maxTokens;

  while (true) {
    try {
      const response = await groq.chat.completions.create({
        model:       'openai/gpt-oss-20b',
        messages:    [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens:  tokens,
        ...(json && { response_format: { type: 'json_object' } }),
      });
      return response.choices[0].message.content;
    } catch (err) {
      const canRetry = attempt < retries && isFailedGenerationError(err);
      if (!canRetry) {
        if (isFailedGenerationError(err)) {
          // Surface a clean, user-facing message instead of Groq's raw
          // internal error JSON leaking all the way to the frontend toast.
          const friendly = new Error(
            'The AI had trouble generating a complete response for this request. Try again, or ask for fewer items.'
          );
          friendly.status = 502;
          throw friendly;
        }
        throw err;
      }
      // Retry once with a larger token budget — the most common cause of
      // failed_generation is the response getting cut off mid-JSON.
      attempt += 1;
      tokens = Math.min(tokens * 1.5, 4096);
      logger.warn({ attempt, tokens }, 'Groq failed_generation — retrying with more tokens');
    }
  }
}

async function askAboutNews(question, articles, region) {
  const context = articles
    .slice(0, 8)
    .map(a => `- ${a.title}: ${a.summary || a.description}`)
    .join('\n');

  const prompt = `You are a helpful, concise news assistant for ${region}.
Answer questions about today's current affairs using the provided context only.
Keep answers to 3-4 sentences. Be factual and neutral.

Today's headlines for ${region}:
${context}

Question: ${question}`;

  return await callGroq(prompt, { maxTokens: 512 });
}

const DIFFICULTY_GUIDE = {
  easy:   'Easy: test recall of the main facts stated in the headlines.',
  medium: 'Medium: mix recall with simple "why/what happened next" understanding.',
  hard:   'Hard: require connecting details across headlines; make wrong options plausible.',
};

// `difficulty` is optional and defaults to 'medium', so existing callers
// (aiController's /api/ai/quiz) behave exactly as before.
async function generateQuiz(articles, region, count = 5, difficulty = 'medium') {
  const headlines = articles
    .slice(0, 8)
    .map(a => `- ${a.title}: ${a.summary || a.description}`)
    .join('\n');

  const prompt = `Generate ${count} multiple-choice quiz questions based on these current affairs headlines for ${region}.
${DIFFICULTY_GUIDE[difficulty] || DIFFICULTY_GUIDE.medium}

Return ONLY a valid JSON object:
{
  "questions": [
    {
      "question": "...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "answer": "A",
      "explanation": "one sentence"
    }
  ]
}

Headlines:
${headlines}`;

  // Each question (question text + 4 options + answer + explanation) runs
  // roughly 120-150 tokens of JSON. A fixed 1024-token cap silently
  // truncates anything past ~7 questions, which Groq then rejects as
  // invalid JSON (a "failed_generation" error) rather than returning a
  // partial result. Scale the budget with what was actually asked for,
  // plus headroom, capped well under the model's context limit.
  const maxTokens = Math.min(300 + count * 170, 4096);

  const text = await callGroq(prompt, { json: true, maxTokens, retries: 2 });
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    logger.error('Failed to parse Groq quiz JSON response');
    return [];
  }
  return parsed.questions || parsed;
}

// ── Translation ──────────────────────────────────────────────
// Translates arbitrary article text (title/summary) into the requested
// language. Kept as a plain on-demand call rather than translating every
// article up front on every fetch, to avoid burning AI-call quota on
// languages nobody asks for.
async function translateText(text, targetLang) {
  const prompt = `Translate the following news text into ${targetLang}. ` +
    `Keep names, places and numbers accurate. Return ONLY the translated text, nothing else.

Text:
${text}`;

  const translated = await callGroq(prompt, { maxTokens: 512 });
  return translated.trim();
}

module.exports = { askAboutNews, generateQuiz, translateText };
