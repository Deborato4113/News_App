const Groq    = require('groq-sdk');
const Article = require('../models/Article');
const { askAboutNews, generateQuiz, translateText } = require('../services/aiService');
const { synthesize } = require('../services/ttsService');
const { googleTranslate } = require('../services/googleTranslateService');
const logger = require('../utils/logger');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

exports.askNews = async (req, res, next) => {
  try {
    const { question, region = 'mumbai' } = req.body;
    if (!question?.trim()) return res.status(400).json({ message: 'Question is required' });

    const articles = await Article.find({ region: region.toLowerCase() })
      .sort({ publishedAt: -1 }).limit(8).lean();

    const answer = await askAboutNews(question, articles, region);
    res.json({ answer, region, articlesUsed: articles.length });
  } catch (err) { next(err); }
};

exports.getQuiz = async (req, res, next) => {
  try {
    const { region = 'mumbai', count = 5 } = req.body;
    const articles = await Article.find({ region: region.toLowerCase() })
      .sort({ publishedAt: -1 }).limit(8).lean();

    if (!articles.length)
      return res.status(400).json({ message: 'No articles found. Fetch news first.' });

    const questions = await generateQuiz(articles, region, Number(count));
    res.json({ region, count: questions.length, questions });
  } catch (err) { next(err); }
};

exports.summarizeText = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'text is required' });

    const response = await groq.chat.completions.create({
      model:    process.env.NEWS_AI_MODEL || 'openai/gpt-oss-20b',
      messages: [{ role: 'user', content: `Summarize this news article in 2-3 sentences:\n\n${text}` }],
      max_tokens: 256,
    });
    res.json({ summary: response.choices[0].message.content });
  } catch (err) { next(err); }
};

// ── POST /api/ai/translate  { text, targetLang } ───────────────
exports.translate = async (req, res, next) => {
  try {
    const { text, targetLang } = req.body; // validated by zod
    // Google Translate first; if it is not set up or fails, the Groq model translates instead.
    try {
      const translated = await googleTranslate(text, targetLang);
      return res.json({ translated, targetLang, provider: 'google' });
    } catch (err) {
      if (err.code !== 'TRANSLATE_NOT_CONFIGURED') logger.warn({ err: err.message }, 'Google Translate failed, using the AI model');
    }
    const translated = await translateText(text, targetLang);
    res.json({ translated, targetLang, provider: 'ai' });
  } catch (err) { next(err); }
};

// ── POST /api/ai/speak  { text, lang } ───────────────────────────
// Returns { audio: <base64 mp3> } so the browser can play it without
// needing a voice installed for that language.
exports.speak = async (req, res, next) => {
  try {
    const audio = await synthesize(req.body.text, req.body.lang);
    res.json({ audio, format: 'mp3' });
  } catch (err) {
    if (err.code === 'TTS_NOT_CONFIGURED') return res.status(503).json({ message: err.message });
    if (err.code === 'TTS_UPSTREAM') return res.status(502).json({ message: 'The voice service is unavailable right now.' });
    next(err);
  }
};
