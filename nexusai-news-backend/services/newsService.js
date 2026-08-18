const axios     = require('axios');
const Parser    = require('rss-parser');
const Groq      = require('groq-sdk');

const groq   = new Groq({ apiKey: process.env.GROQ_API_KEY });
const parser = new Parser({ timeout: 10000 });

// ── Relevance check ───────────────────────────────────────────
// Returns true if at least 30% of articles mention the city name
function isRelevant(articles, region) {
  if (!articles.length) return false;
  const keyword = region.toLowerCase();
  const hits = articles.filter(a =>
    (a.title       || '').toLowerCase().includes(keyword) ||
    (a.description || '').toLowerCase().includes(keyword)
  );
  return hits.length / articles.length >= 0.30;
}

// ── Source 1: NewsAPI ─────────────────────────────────────────
async function fetchFromNewsAPI(region, pageSize = 12) {
  const response = await axios.get('https://newsapi.org/v2/everything', {
    params: {
      q:        region,
      language: 'en',
      sortBy:   'publishedAt',
      pageSize,
      apiKey:   process.env.NEWS_API_KEY,
    },
    timeout: 10000,
  });

  if (response.data.status !== 'ok')
    throw new Error(`NewsAPI: ${response.data.message}`);

  return response.data.articles
    .filter(a => a.title && a.title !== '[Removed]')
    .map(a => ({
      title:       a.title,
      description: a.description || '',
      url:         a.url,
      source:      a.source,
      publishedAt: a.publishedAt,
    }));
}

// ── Source 2: Google News RSS (fallback) ──────────────────────
async function fetchFromGoogleRSS(region, limit = 12) {
  // Detect Indian cities → use Indian locale for better regional coverage
  const indianLocale = /india|mumbai|delhi|bangalore|bengaluru|kolkata|chennai|hyderabad|pune|asansol|durgapur|howrah|siliguri|patna|lucknow|jaipur|surat|ahmedabad|bhopal|nagpur|indore|vadodara|coimbatore|visakhapatnam|rajkot|kerala|maharashtra|gujarat|bengal|odisha|bihar|punjab|haryana|assam|jalpaiguri/i.test(region);

  const locale = indianLocale
    ? `hl=en-IN&gl=IN&ceid=IN:en`
    : `hl=en-US&gl=US&ceid=US:en`;

  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(region)}&${locale}`;

  const feed = await parser.parseURL(url);

  return feed.items.slice(0, limit).map(item => ({
    title:       item.title?.replace(/\s*-\s*[^-]+$/, '').trim() || '', // strip "- Source Name" suffix
    description: item.contentSnippet || item.content || '',
    url:         item.link,
    source:      { name: item.creator || extractSource(item.title) || 'Google News' },
    publishedAt: item.pubDate || new Date().toISOString(),
  }));
}

// Extract source name from Google News title format "Headline - Source Name"
function extractSource(title = '') {
  const parts = title.split(' - ');
  return parts.length > 1 ? parts[parts.length - 1].trim() : 'Google News';
}

// ── AI enrichment via Groq ────────────────────────────────────
async function enrichArticles(articles, region) {
  const titles = articles
    .map((a, i) => `${i + 1}. ${a.title}: ${a.description || ''}`)
    .join('\n');

  const prompt = `You are a news enrichment AI for ${region}.

For each article below, return a JSON object with an "articles" array (one object per article, same order):
{
  "articles": [
    {
      "index": 1,
      "summary": "2-3 sentence plain-English summary",
      "category": "Politics|Business|Technology|Sports|Weather|Health|General",
      "sentiment": "pos|neg|neu"
    }
  ]
}

Articles:
${titles}`;

  const response = await groq.chat.completions.create({
    model:           'llama-3.1-8b-instant',
    messages:        [{ role: 'user', content: prompt }],
    temperature:     0.3,
    max_tokens:      2048,
    response_format: { type: 'json_object' },
  });

  let parsed;
  try {
    parsed = JSON.parse(response.choices[0].message.content);
  } catch {
    console.error('❌ Failed to parse Groq JSON response');
    return [];
  }
  return parsed.articles || [];
}

// ── Main export ───────────────────────────────────────────────
async function fetchAndEnrichNews(region, pageSize = 12) {
  let rawArticles = [];
  let usedSource  = 'newsapi';

  // Step 1 — Try NewsAPI
  try {
    const newsApiResults = await fetchFromNewsAPI(region, pageSize);

    if (newsApiResults.length > 0 && isRelevant(newsApiResults, region)) {
      console.log(`✅ NewsAPI: ${newsApiResults.length} relevant articles for "${region}"`);
      rawArticles = newsApiResults;
      usedSource  = 'newsapi';
    } else {
      console.log(`⚠️  NewsAPI: results not relevant for "${region}" — falling back to Google News RSS`);
    }
  } catch (err) {
    console.log(`⚠️  NewsAPI failed (${err.message}) — falling back to Google News RSS`);
  }

  // Step 2 — Fallback to Google News RSS
  if (rawArticles.length === 0) {
    try {
      rawArticles = await fetchFromGoogleRSS(region, pageSize);
      usedSource  = 'google-rss';
      console.log(`✅ Google RSS: ${rawArticles.length} articles for "${region}"`);
    } catch (err) {
      console.log(`❌ Google RSS also failed: ${err.message}`);
      throw new Error(`Could not fetch news for "${region}" from any source.`);
    }
  }

  if (rawArticles.length === 0) {
    throw new Error(`No articles found for "${region}".`);
  }

  // Step 3 — Enrich with Groq AI (graceful fallback)
  let enriched = [];
  try {
    enriched = await enrichArticles(rawArticles, region);
  } catch (err) {
    console.error('❌ AI enrichment failed, using raw articles:', err.message);
  }

  return rawArticles.map((article, i) => {
    const meta = enriched.find(e => e.index === i + 1) || {};
    return {
      title:       article.title,
      description: article.description,
      summary:     meta.summary   || article.description,
      url:         article.url,
      source:      article.source,
      region:      region.toLowerCase(),
      category:    meta.category  || 'General',
      sentiment:   meta.sentiment || 'neu',
      publishedAt: article.publishedAt,
      fetchSource: usedSource,   // 'newsapi' or 'google-rss'
    };
  });
}

module.exports = { fetchAndEnrichNews };
