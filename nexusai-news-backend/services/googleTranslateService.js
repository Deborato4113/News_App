// Translation through Google Cloud Translation (Basic, v2, REST).
// Uses GOOGLE_TRANSLATE_API_KEY, or the text-to-speech key if it was created
// for both APIs. Without a key it throws "not configured" and the caller
// falls back to the Groq model.
const ENDPOINT = 'https://translation.googleapis.com/language/translate/v2';

// The app's language names -> Google's language codes (see config/languages.js).
const { CODES } = require('../config/languages');

class TranslateNotConfiguredError extends Error {
  constructor() {
    super('Google Translate is not set up on this server.');
    this.code = 'TRANSLATE_NOT_CONFIGURED';
  }
}

async function googleTranslate(text, targetLang) {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GOOGLE_TTS_API_KEY;
  if (!key) throw new TranslateNotConfiguredError();
  const target = CODES[targetLang];
  if (!target) throw Object.assign(new Error(`Unsupported language: ${targetLang}`), { code: 'TRANSLATE_UNSUPPORTED' });

  const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, target, format: 'text' }),
  });
  if (!res.ok) {
    throw Object.assign(new Error(`Google Translate failed (${res.status}).`), { code: 'TRANSLATE_UPSTREAM' });
  }
  const data = await res.json();
  const out = data?.data?.translations?.[0]?.translatedText;
  if (!out) throw Object.assign(new Error('Google Translate returned no text.'), { code: 'TRANSLATE_UPSTREAM' });
  return out.trim();
}

module.exports = { googleTranslate, TranslateNotConfiguredError, CODES };
