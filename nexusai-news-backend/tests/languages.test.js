const { LANGUAGES, NAMES, CODES, SPEECH_LANGS } = require('../config/languages');
const { translateSchema, speakSchema } = require('../schemas/aiSchemas');

describe('language list', () => {
  it('has unique names and Google codes', () => {
    expect(new Set(NAMES).size).toBe(NAMES.length);
    expect(new Set(LANGUAGES.map((l) => l.code)).size).toBe(LANGUAGES.length);
  });

  it('gives every language a native name and a plausible code', () => {
    for (const l of LANGUAGES) {
      expect(l.native).toBeTruthy();
      expect(l.code).toMatch(/^[a-z]{2,3}(-[A-Z]{2})?$/);
      if (l.tts) expect(l.tts).toMatch(/^[a-z]{2,3}-[A-Z]{2}$/);
    }
  });

  it('covers a wide range of the world, not just India', () => {
    expect(LANGUAGES.length).toBeGreaterThanOrEqual(60);
    for (const n of ['Hindi', 'Spanish', 'Chinese', 'Japanese', 'Arabic', 'Swahili', 'Russian', 'Turkish']) expect(NAMES).toContain(n);
  });

  it('accepts every listed language for translation, and no other', () => {
    for (const name of NAMES) expect(translateSchema.safeParse({ text: 'Hello world', targetLang: name }).success).toBe(true);
    expect(translateSchema.safeParse({ text: 'Hello world', targetLang: 'Klingon' }).success).toBe(false);
  });

  it('accepts every voice language and rejects others', () => {
    for (const lang of SPEECH_LANGS) expect(speakSchema.safeParse({ text: 'Hello', lang }).success).toBe(true);
    expect(speakSchema.safeParse({ text: 'Hello', lang: 'tlh-XX' }).success).toBe(false);
  });

  it('marks right-to-left scripts', () => {
    for (const n of ['Arabic', 'Urdu', 'Hebrew', 'Persian']) expect(LANGUAGES.find((l) => l.name === n).rtl).toBe(true);
    expect(CODES.Hindi).toBe('hi');
  });
});
