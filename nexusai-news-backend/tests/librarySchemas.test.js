const { collectionNameSchema, noteSchema } = require('../schemas/librarySchemas');
const { updateMeSchema, changePasswordSchema, deleteAccountSchema } = require('../schemas/authSchemas');

describe('collectionNameSchema', () => {
  it('trims and accepts a normal name', () => {
    const r = collectionNameSchema.safeParse({ name: '  Exam prep ' });
    expect(r.success).toBe(true);
    expect(r.data.name).toBe('Exam prep');
  });
  it('rejects empty and over-long names', () => {
    expect(collectionNameSchema.safeParse({ name: '   ' }).success).toBe(false);
    expect(collectionNameSchema.safeParse({ name: 'x'.repeat(41) }).success).toBe(false);
  });
});

describe('noteSchema', () => {
  it('accepts up to 500 characters', () => {
    expect(noteSchema.safeParse({ text: 'a'.repeat(500) }).success).toBe(true);
  });
  it('rejects empty and 501 characters', () => {
    expect(noteSchema.safeParse({ text: '' }).success).toBe(false);
    expect(noteSchema.safeParse({ text: 'a'.repeat(501) }).success).toBe(false);
  });
});

describe('updateMeSchema', () => {
  it('requires at least one field', () => {
    expect(updateMeSchema.safeParse({}).success).toBe(false);
  });
  it('lowercases the default region and accepts interests', () => {
    const r = updateMeSchema.safeParse({ defaultRegion: ' Kolkata ', interests: ['Technology', 'Sports'] });
    expect(r.success).toBe(true);
    expect(r.data.defaultRegion).toBe('kolkata');
  });
  it('caps interests at 8', () => {
    const many = Array.from({ length: 9 }, (_, i) => `topic${i}`);
    expect(updateMeSchema.safeParse({ interests: many }).success).toBe(false);
  });
  it('does not let a client set role', () => {
    const r = updateMeSchema.safeParse({ name: 'Akash', role: 'admin' });
    expect(r.success).toBe(true);
    expect(r.data.role).toBeUndefined();
  });
});

describe('changePasswordSchema', () => {
  it('enforces the password rules on the new password', () => {
    expect(changePasswordSchema.safeParse({ currentPassword: 'Old12345', newPassword: 'weak' }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ currentPassword: 'Old12345', newPassword: 'NewPass123' }).success).toBe(true);
  });
  it('rejects reusing the current password', () => {
    expect(changePasswordSchema.safeParse({ currentPassword: 'Same1234', newPassword: 'Same1234' }).success).toBe(false);
  });
});

describe('deleteAccountSchema', () => {
  it('needs a valid email to confirm', () => {
    expect(deleteAccountSchema.safeParse({ confirmEmail: 'nope' }).success).toBe(false);
    expect(deleteAccountSchema.safeParse({ confirmEmail: 'A@B.com', password: 'x' }).success).toBe(true);
  });
});
