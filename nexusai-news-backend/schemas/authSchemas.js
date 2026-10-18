const { z } = require('zod');

const passwordRule = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number');

const signupSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: passwordRule,
});

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const googleAuthSchema = z.object({
  idToken: z.string().min(20, 'A valid Firebase ID token is required'),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address'),
});

const resetPasswordSchema = z.object({
  token: z.string().min(10, 'Reset token is required'),
  password: passwordRule,
});

const followRegionSchema = z.object({
  region: z.string().trim().min(2).max(60),
});

const updateMeSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80).optional(),
  defaultRegion: z.string().trim().toLowerCase().max(60).optional(),
  interests: z.array(z.string().trim().min(2).max(40)).max(8).optional(),
  onboarded: z.boolean().optional(),
}).refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordRule,
}).refine((v) => v.currentPassword !== v.newPassword, {
  message: 'Choose a different password from your current one',
  path: ['newPassword'],
});

const deleteAccountSchema = z.object({
  confirmEmail: z.string().trim().toLowerCase().email(),
  password: z.string().optional(),
});

module.exports = {
  updateMeSchema,
  changePasswordSchema,
  deleteAccountSchema,
  signupSchema,
  loginSchema,
  googleAuthSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  followRegionSchema,
};
