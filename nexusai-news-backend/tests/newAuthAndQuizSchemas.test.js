const {
  googleAuthSchema, forgotPasswordSchema, resetPasswordSchema, followRegionSchema,
} = require('../schemas/authSchemas');
const { recordAttemptSchema } = require('../schemas/quizSchemas');

describe('googleAuthSchema', () => {
  it('rejects a missing/short idToken', () => {
    expect(googleAuthSchema.safeParse({}).success).toBe(false);
    expect(googleAuthSchema.safeParse({ idToken: 'short' }).success).toBe(false);
  });

  it('accepts a plausible idToken', () => {
    expect(googleAuthSchema.safeParse({ idToken: 'a'.repeat(50) }).success).toBe(true);
  });
});

describe('forgotPasswordSchema / resetPasswordSchema', () => {
  it('requires a valid email for forgot-password', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'not-an-email' }).success).toBe(false);
    expect(forgotPasswordSchema.safeParse({ email: 'a@b.com' }).success).toBe(true);
  });

  it('requires token + a strong password for reset-password', () => {
    expect(resetPasswordSchema.safeParse({ token: 'abc', password: 'weak' }).success).toBe(false);
    expect(resetPasswordSchema.safeParse({ token: 'a'.repeat(20), password: 'Str0ngPass' }).success).toBe(true);
  });
});

describe('followRegionSchema', () => {
  it('rejects a too-short region', () => {
    expect(followRegionSchema.safeParse({ region: 'x' }).success).toBe(false);
  });
  it('accepts a normal region', () => {
    expect(followRegionSchema.safeParse({ region: 'Mumbai' }).success).toBe(true);
  });
});

describe('recordAttemptSchema', () => {
  it('rejects score greater than total', () => {
    expect(recordAttemptSchema.safeParse({ region: 'mumbai', score: 6, total: 5 }).success).toBe(false);
  });
  it('accepts a valid attempt', () => {
    const result = recordAttemptSchema.safeParse({ region: 'mumbai', score: 4, total: 5 });
    expect(result.success).toBe(true);
  });
});
