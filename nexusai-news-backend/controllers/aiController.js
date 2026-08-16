const Groq    = require('groq-sdk');
const Article = require('../models/Article');
const { askAboutNews, generateQuiz } = require('../services/aiService');

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
      model:    'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: `Summarize this news article in 2-3 sentences:\n\n${text}` }],
      max_tokens: 256,
    });
    res.json({ summary: response.choices[0].message.content });
  } catch (err) { next(err); }
};
