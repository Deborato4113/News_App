const { z } = require('zod');

const refreshNewsSchema = z.object({
  region: z.string().trim().min(2).max(60).default('mumbai'),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

module.exports = { refreshNewsSchema };
