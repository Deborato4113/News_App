/* global process */
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { LANGUAGES, browserLanguage, filterLanguages } from '../lib/languages';

describe('languages', () => {
  it('lists a wide range with unique names', () => {
    expect(LANGUAGES.length).toBeGreaterThanOrEqual(60);
    expect(new Set(LANGUAGES.map((l) => l.name)).size).toBe(LANGUAGES.length);
  });

  it('finds a language by English or native name, ignoring case and accents', () => {
    expect(filterLanguages('hind').map((l) => l.name)).toEqual(['Hindi']);
    expect(filterLanguages('español').map((l) => l.name)).toEqual(['Spanish']);
    expect(filterLanguages('FRANCAIS').map((l) => l.name)).toEqual(['French']);
    expect(filterLanguages('日本').map((l) => l.name)).toEqual(['Japanese']);
    expect(filterLanguages('ara')[0].name).toBe('Arabic');
    expect(filterLanguages('zzz')).toEqual([]);
    expect(filterLanguages('  ')).toHaveLength(LANGUAGES.length);
  });

  it('suggests the language of the browser, but never English', () => {
    expect(browserLanguage('hi-IN').name).toBe('Hindi');
    expect(browserLanguage('es-MX').name).toBe('Spanish');
    expect(browserLanguage('en-GB')).toBeNull();
    expect(browserLanguage('')).toBeNull();
  });

  it('only offers a server voice where a code exists, and flags right-to-left scripts', () => {
    expect(LANGUAGES.find((l) => l.name === 'Swahili').cloud).toBeNull();
    expect(LANGUAGES.find((l) => l.name === 'Hindi').cloud).toBe('hi-IN');
    expect(LANGUAGES.find((l) => l.name === 'Arabic').rtl).toBe(true);
  });

  // Guards against the two lists drifting apart (runs when the backend folder sits next to the frontend folder).
  const backend = resolve(process.cwd(), '../nexusai-news-backend/config/languages.js');
  it.runIf(existsSync(backend))('matches the backend list exactly', () => {
    const { LANGUAGES: server } = createRequire(backend)(backend);
    expect(LANGUAGES.map((l) => [l.name, l.native, l.cloud, !!l.rtl]))
      .toEqual(server.map((l) => [l.name, l.native, l.tts, !!l.rtl]));
  });
});
