const { z } = require('zod');

const recordAttemptSchema = z.object({
  region: z.string().trim().min(2).max(60),
  score:  z.coerce.number().int().min(0),
  total:  z.coerce.number().int().min(1),
}).refine((data) => data.score <= data.total, {
  message: 'score cannot be greater than total',
  path: ['score'],
});

module.exports = { recordAttemptSchema };
