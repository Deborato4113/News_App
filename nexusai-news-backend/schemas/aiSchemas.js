const { z } = require('zod');

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

const SUPPORTED_LANGUAGES = [
  'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Marathi', 'Gujarati', 'Kannada',
  'Malayalam', 'Punjabi', 'Urdu', 'Spanish', 'French', 'German', 'Arabic',
  'Chinese', 'Japanese', 'Russian', 'Portuguese',
];

const translateSchema = z.object({
  text: z.string().trim().min(3, 'text must be at least 3 characters').max(4000),
  targetLang: z.enum(SUPPORTED_LANGUAGES, {
    errorMap: () => ({ message: `targetLang must be one of: ${SUPPORTED_LANGUAGES.join(', ')}` }),
  }),
});

module.exports = { askSchema, quizSchema, summarizeSchema, translateSchema, SUPPORTED_LANGUAGES };
