const { translateSchema } = require('../schemas/aiSchemas');
const { flagArticleSchema, bulkRefreshSchema } = require('../schemas/adminSchemas');
const { addCommentSchema } = require('../schemas/commentSchemas');

describe('translateSchema', () => {
  it('accepts a supported language', () => {
    const result = translateSchema.safeParse({ text: 'Hello world', targetLang: 'Hindi' });
    expect(result.success).toBe(true);
  });

  it('rejects an unsupported language', () => {
    const result = translateSchema.safeParse({ text: 'Hello world', targetLang: 'Klingon' });
    expect(result.success).toBe(false);
  });

  it('rejects empty text', () => {
    const result = translateSchema.safeParse({ text: '', targetLang: 'Hindi' });
    expect(result.success).toBe(false);
  });
});

describe('flagArticleSchema', () => {
  it('requires a reason', () => {
    expect(flagArticleSchema.safeParse({}).success).toBe(false);
    expect(flagArticleSchema.safeParse({ reason: 'Misleading headline' }).success).toBe(true);
  });
});

describe('bulkRefreshSchema', () => {
  it('requires at least one region', () => {
    expect(bulkRefreshSchema.safeParse({ regions: [] }).success).toBe(false);
  });

  it('defaults limit to 12', () => {
    const result = bulkRefreshSchema.safeParse({ regions: ['Mumbai', 'Delhi'] });
    expect(result.success).toBe(true);
    expect(result.data.limit).toBe(12);
  });
});

describe('addCommentSchema', () => {
  it('rejects empty comments', () => {
    expect(addCommentSchema.safeParse({ text: '' }).success).toBe(false);
  });

  it('rejects overly long comments', () => {
    expect(addCommentSchema.safeParse({ text: 'a'.repeat(501) }).success).toBe(false);
  });

  it('accepts a normal comment', () => {
    expect(addCommentSchema.safeParse({ text: 'Great summary!' }).success).toBe(true);
  });
});
