const jwt    = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User   = require('../models/User');
const logger = require('../utils/logger');
const { verifyFirebaseToken } = require('../utils/firebaseAdmin');
const { sendPasswordResetEmail } = require('../utils/mailer');

function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    authProvider: user.authProvider,
    followedRegions: user.followedRegions || [],
  };
}

exports.signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body; // already validated by zod

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 12);
    const user   = await User.create({ name, email, password: hashed, authProvider: 'local' });
    const token  = signToken(user._id);

    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) { next(err); }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body; // already validated by zod

    const user = await User.findOne({ email }).select('+password');
    if (!user) return res.status(401).json({ message: 'Invalid email or password' });

    if (user.authProvider === 'google' && !user.password) {
      return res.status(400).json({ message: 'This account uses Google sign-in. Use "Continue with Google" instead.' });
    }

    if (!(await bcrypt.compare(password, user.password)))
      return res.status(401).json({ message: 'Invalid email or password' });

    const token = signToken(user._id);
    res.json({ token, user: publicUser(user) });
  } catch (err) { next(err); }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user: publicUser(user) });
  } catch (err) { next(err); }
};

// ── POST /api/auth/google  { idToken } ──────────────────────────
// Verifies a Firebase ID token (from the frontend's Google sign-in popup)
// and either logs into an existing account or creates a new one. Issues
// our own JWT afterward so the rest of the app (middleware/auth.js) never
// needs to know Firebase was involved.
exports.googleAuth = async (req, res, next) => {
  try {
    const { idToken } = req.body; // validated by zod

    let decoded;
    try {
      decoded = await verifyFirebaseToken(idToken);
    } catch (err) {
      if (err.message?.includes('Firebase is not configured')) {
        return res.status(503).json({ message: 'Google sign-in is not set up on this server yet.' });
      }
      return res.status(401).json({ message: 'Invalid or expired Google sign-in token.' });
    }

    const { uid, email, name } = decoded;
    if (!email) return res.status(400).json({ message: 'Your Google account has no email address.' });

    let user = await User.findOne({ $or: [{ googleId: uid }, { email: email.toLowerCase() }] });

    if (!user) {
      user = await User.create({
        name: name || email.split('@')[0],
        email: email.toLowerCase(),
        authProvider: 'google',
        googleId: uid,
      });
    } else if (!user.googleId) {
      // An existing local (email/password) account with the same email —
      // link it to this Google identity instead of creating a duplicate.
      user.googleId = uid;
      await user.save();
    }

    const token = signToken(user._id);
    res.json({ token, user: publicUser(user) });
  } catch (err) { next(err); }
};

// ── POST /api/auth/forgot-password  { email } ───────────────────
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body; // validated by zod
    const user = await User.findOne({ email });

    // Only local accounts have a password to reset. Respond identically
    // either way (whether the account exists, or is Google-only) so the
    // response can't be used to enumerate registered emails.
    if (user && user.authProvider === 'local') {
      const rawToken    = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

      user.resetPasswordToken   = hashedToken;
      user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await user.save();

      const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${rawToken}`;
      try {
        await sendPasswordResetEmail(user.email, resetUrl);
      } catch (err) {
        logger.error({ err }, 'Failed to send password reset email');
      }
    }

    res.json({ message: 'If that email is registered, a password reset link has been sent.' });
  } catch (err) { next(err); }
};

// ── POST /api/auth/reset-password  { token, password } ──────────
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body; // validated by zod
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) return res.status(400).json({ message: 'This reset link is invalid or has expired.' });

    user.password = await bcrypt.hash(password, 12);
    user.authProvider = 'local'; // in case this was a Google-only account
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: 'Password has been reset. You can now log in.' });
  } catch (err) { next(err); }
};

// ── POST /api/auth/follow-region  { region } ─────────────────────
exports.followRegion = async (req, res, next) => {
  try {
    const { region } = req.body; // validated by zod
    const lower = region.toLowerCase();

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (!user.followedRegions.includes(lower)) {
      if (user.followedRegions.length >= 6) {
        return res.status(400).json({ message: 'You can follow up to 6 regions — unfollow one first.' });
      }
      user.followedRegions.push(lower);
      await user.save();
    }

    res.json({ followedRegions: user.followedRegions });
  } catch (err) { next(err); }
};

// ── DELETE /api/auth/follow-region/:region ───────────────────────
exports.unfollowRegion = async (req, res, next) => {
  try {
    const lower = req.params.region.toLowerCase();
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { followedRegions: lower } },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ followedRegions: user.followedRegions });
  } catch (err) { next(err); }
};
