const { z } = require('zod');

const addCommentSchema = z.object({
  text: z.string().trim().min(1, 'Comment cannot be empty').max(500),
});

module.exports = { addCommentSchema };
