const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function callGroq(prompt, json = false) {
  const response = await groq.chat.completions.create({
    model:    'openai/gpt-oss-20b',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens:  1024,
    ...(json && { response_format: { type: 'json_object' } }),
  });
  return response.choices[0].message.content;
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

  return await callGroq(prompt);
}

async function generateQuiz(articles, region, count = 5) {
  const headlines = articles
    .slice(0, 8)
    .map(a => `- ${a.title}: ${a.summary || a.description}`)
    .join('\n');

  const prompt = `Generate ${count} multiple-choice quiz questions based on these current affairs headlines for ${region}.

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

  const text   = await callGroq(prompt, true);
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    console.error('❌ Failed to parse Groq quiz JSON response');
    return [];
  }
  return parsed.questions || parsed;
}

module.exports = { askAboutNews, generateQuiz };
