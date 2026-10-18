// Text-to-speech through Google Cloud Text-to-Speech (REST). Used so "Listen"
// works in Bengali, Hindi and the other languages even when the reader's own
// device has no voice for them. Needs GOOGLE_TTS_API_KEY; without it the
// endpoint answers 503 and the app falls back to the browser's own voices.
const ENDPOINT = 'https://texttospeech.googleapis.com/v1/text:synthesize';

class TtsNotConfiguredError extends Error {
  constructor() {
    super('Text-to-speech is not set up on this server.');
    this.code = 'TTS_NOT_CONFIGURED';
  }
}

async function synthesize(text, languageCode) {
  const key = process.env.GOOGLE_TTS_API_KEY;
  if (!key) throw new TtsNotConfiguredError();

  const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode },
      audioConfig: { audioEncoding: 'MP3', speakingRate: 1 },
    }),
  });

  if (!res.ok) {
    const err = new Error(`Text-to-speech request failed (${res.status}).`);
    err.code = 'TTS_UPSTREAM';
    throw err;
  }
  const data = await res.json();
  if (!data.audioContent) {
    const err = new Error('Text-to-speech returned no audio.');
    err.code = 'TTS_UPSTREAM';
    throw err;
  }
  return data.audioContent; // base64 MP3
}

module.exports = { synthesize, TtsNotConfiguredError };
