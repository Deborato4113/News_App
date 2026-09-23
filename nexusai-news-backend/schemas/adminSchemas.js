const { z } = require('zod');

const flagArticleSchema = z.object({
  reason: z.string().trim().min(3, 'Give a short reason').max(300),
});

const bulkRefreshSchema = z.object({
  regions: z.array(z.string().trim().min(2).max(60)).min(1).max(20),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

module.exports = { flagArticleSchema, bulkRefreshSchema };
