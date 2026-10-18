const router   = require('express').Router();
const auth     = require('../middleware/auth');
const validate = require('../middleware/validate');
const { authLimiter } = require('../middleware/rateLimiters');
const {
  signupSchema, loginSchema, googleAuthSchema,
  forgotPasswordSchema, resetPasswordSchema, followRegionSchema,
  updateMeSchema, changePasswordSchema, deleteAccountSchema,
} = require('../schemas/authSchemas');
const {
  signup, login, getMe, googleAuth,
  forgotPassword, resetPassword, followRegion, unfollowRegion,
  updateMe, changePassword, deleteMe,
} = require('../controllers/authController');

router.post('/signup', authLimiter, validate(signupSchema), signup);
router.post('/login',  authLimiter, validate(loginSchema),  login);
router.get('/me',      auth, getMe);
router.patch('/me',    auth, validate(updateMeSchema), updateMe);
router.delete('/me',   auth, authLimiter, validate(deleteAccountSchema), deleteMe);
router.post('/change-password', auth, authLimiter, validate(changePasswordSchema), changePassword);

router.post('/google', authLimiter, validate(googleAuthSchema), googleAuth);

router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password',  authLimiter, validate(resetPasswordSchema),  resetPassword);

router.post('/follow-region',          auth, validate(followRegionSchema), followRegion);
router.delete('/follow-region/:region', auth, unfollowRegion);

module.exports = router;
