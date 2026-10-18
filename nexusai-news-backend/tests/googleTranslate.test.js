const { googleTranslate, CODES } = require('../services/googleTranslateService');
const { SUPPORTED_LANGUAGES } = require('../schemas/aiSchemas');

describe('language codes', () => {
  it('cover every language the API accepts', () => {
    for (const lang of SUPPORTED_LANGUAGES) expect(CODES[lang]).toBeTruthy();
  });
});

describe('googleTranslate', () => {
  const realFetch = global.fetch;
  const keys = { t: process.env.GOOGLE_TRANSLATE_API_KEY, s: process.env.GOOGLE_TTS_API_KEY };
  afterEach(() => {
    global.fetch = realFetch;
    process.env.GOOGLE_TRANSLATE_API_KEY = keys.t;
    process.env.GOOGLE_TTS_API_KEY = keys.s;
  });

  it('is "not configured" without any key', async () => {
    delete process.env.GOOGLE_TRANSLATE_API_KEY; delete process.env.GOOGLE_TTS_API_KEY;
    await expect(googleTranslate('Hello', 'Hindi')).rejects.toMatchObject({ code: 'TRANSLATE_NOT_CONFIGURED' });
  });

  it('sends plain text with the right code and returns the translation', async () => {
    process.env.GOOGLE_TRANSLATE_API_KEY = 'k';
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { translations: [{ translatedText: ' নমস্কার ' }] } }) });
    expect(await googleTranslate('Hello', 'Bengali')).toBe('নমস্কার');
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain('translation.googleapis.com');
    expect(JSON.parse(opts.body)).toEqual({ q: 'Hello', target: 'bn', format: 'text' });
  });

  it('falls back to the TTS key when no translate key is set', async () => {
    delete process.env.GOOGLE_TRANSLATE_API_KEY; process.env.GOOGLE_TTS_API_KEY = 'shared';
    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: { translations: [{ translatedText: 'x' }] } }) });
    await googleTranslate('Hello', 'French');
    expect(global.fetch.mock.calls[0][0]).toContain('key=shared');
  });

  it('reports an upstream failure', async () => {
    process.env.GOOGLE_TRANSLATE_API_KEY = 'k';
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 403 });
    await expect(googleTranslate('Hello', 'Hindi')).rejects.toMatchObject({ code: 'TRANSLATE_UPSTREAM' });
  });
});
