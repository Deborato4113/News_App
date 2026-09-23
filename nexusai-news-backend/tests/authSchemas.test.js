const { signupSchema, loginSchema } = require('../schemas/authSchemas');

describe('signupSchema', () => {
  it('accepts a valid signup payload', () => {
    const result = signupSchema.safeParse({
      name: 'Akash Mondal',
      email: 'AKASH@Example.com',
      password: 'Passw0rd123',
    });
    expect(result.success).toBe(true);
    // email gets lowercased/trimmed by the schema
    expect(result.data.email).toBe('akash@example.com');
  });

  it('rejects a weak password', () => {
    const result = signupSchema.safeParse({
      name: 'Akash Mondal',
      email: 'akash@example.com',
      password: 'weakpass',
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid email', () => {
    const result = signupSchema.safeParse({
      name: 'Akash Mondal',
      email: 'not-an-email',
      password: 'Passw0rd123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a missing name', () => {
    const result = signupSchema.safeParse({
      email: 'akash@example.com',
      password: 'Passw0rd123',
    });
    expect(result.success).toBe(false);
  });
});

describe('loginSchema', () => {
  it('accepts a valid login payload', () => {
    const result = loginSchema.safeParse({ email: 'akash@example.com', password: 'anything' });
    expect(result.success).toBe(true);
  });

  it('rejects an empty password', () => {
    const result = loginSchema.safeParse({ email: 'akash@example.com', password: '' });
    expect(result.success).toBe(false);
  });
});
