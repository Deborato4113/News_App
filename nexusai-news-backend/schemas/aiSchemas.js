const { z } = require('zod');
const { NAMES: SUPPORTED_LANGUAGES, SPEECH_LANGS } = require('../config/languages');

const askSchema = z.object({
  question: z.string().trim().min(3, 'Question must be at least 3 characters').max(500),
  region: z.string().trim().min(2).max(60).default('mumbai'),
});

const quizSchema = z.object({
  region: z.string().trim().min(2).max(60).default('mumbai'),
  count: z.coerce.number().int().min(1).max(10).default(5),
});

const summarizeSchema = z.object({
  text: z.string().trim().min(20, 'text must be at least 20 characters').max(8000),
});

const translateSchema = z.object({
  text: z.string().trim().min(3, 'text must be at least 3 characters').max(4000),
  targetLang: z.enum(SUPPORTED_LANGUAGES, {
    errorMap: () => ({ message: 'targetLang is not a supported language' }),
  }),
});

const speakSchema = z.object({
  text: z.string().trim().min(2, 'text must be at least 2 characters').max(1500, 'text is limited to 1500 characters'),
  lang: z.enum(SPEECH_LANGS, {
    errorMap: () => ({ message: 'lang is not a supported voice language' }),
  }),
});

module.exports = { speakSchema, SPEECH_LANGS, askSchema, quizSchema, summarizeSchema, translateSchema, SUPPORTED_LANGUAGES };
