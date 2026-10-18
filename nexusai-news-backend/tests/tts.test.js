const { synthesize } = require('../services/ttsService');
const { speakSchema } = require('../schemas/aiSchemas');

describe('speakSchema', () => {
  it('accepts a supported language and trims text', () => {
    const r = speakSchema.safeParse({ text: '  নমস্কার  ', lang: 'bn-IN' });
    expect(r.success).toBe(true);
    expect(r.data.text).toBe('নমস্কার');
  });
  it('rejects unknown languages and over-long text', () => {
    expect(speakSchema.safeParse({ text: 'hello', lang: 'xx-XX' }).success).toBe(false);
    expect(speakSchema.safeParse({ text: 'a'.repeat(1501), lang: 'hi-IN' }).success).toBe(false);
  });
});

describe('synthesize', () => {
  const realFetch = global.fetch;
  const realKey = process.env.GOOGLE_TTS_API_KEY;
  afterEach(() => { global.fetch = realFetch; process.env.GOOGLE_TTS_API_KEY = realKey; });

  it('throws a "not configured" error without a key', async () => {
    delete process.env.GOOGLE_TTS_API_KEY;
    await expect(synthesize('hello', 'hi-IN')).rejects.toMatchObject({ code: 'TTS_NOT_CONFIGURED' });
  });

  it('sends the text and language and returns the audio', async () => {
    process.env.GOOGLE_TTS_API_KEY = 'k';
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ audioContent: 'QUJD' }) });
    const audio = await synthesize('নমস্কার', 'bn-IN');
    expect(audio).toBe('QUJD');
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain('texttospeech.googleapis.com');
    expect(JSON.parse(opts.body)).toMatchObject({ input: { text: 'নমস্কার' }, voice: { languageCode: 'bn-IN' } });
  });

  it('reports an upstream failure', async () => {
    process.env.GOOGLE_TTS_API_KEY = 'k';
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 403 });
    await expect(synthesize('hello', 'hi-IN')).rejects.toMatchObject({ code: 'TTS_UPSTREAM' });
  });
});
