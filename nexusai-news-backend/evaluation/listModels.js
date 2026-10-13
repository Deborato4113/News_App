// Lists the Groq models your API key can actually use.
//   npm run models
require('dotenv').config();
const Groq = require('groq-sdk');

(async () => {
  if (!process.env.GROQ_API_KEY) {
    console.error('GROQ_API_KEY is not set in .env');
    process.exit(1);
  }
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY, maxRetries: 0 });
  const { data } = await groq.models.list();
  const ids = data.map((m) => m.id).filter((id) => !/whisper|tts|guard|playai/i.test(id)).sort();
  console.log('Models your key can use:\n');
  ids.forEach((id) => console.log('  ' + id));
  console.log('\nPut one in .env as AGENT_FALLBACK_MODEL=<id> (and NEWS_AI_MODEL=<id> for article enrichment).');
})().catch((e) => {
  console.error('Could not list models:', e.message);
  process.exit(1);
});
