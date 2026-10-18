const { z } = require('zod');

const collectionNameSchema = z.object({
  name: z.string().trim().min(1, 'Give the collection a name').max(40),
});

const noteSchema = z.object({
  text: z.string().trim().min(1, 'Write something first').max(500, 'Notes are limited to 500 characters'),
});

module.exports = { collectionNameSchema, noteSchema };
