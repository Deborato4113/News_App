const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name:      { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, lowercase: true },

  // Required for local (email/password) accounts, absent for Google
  // accounts — a Google-authenticated user never has a local password.
  password:  {
    type: String,
    required: function () { return this.authProvider === 'local'; },
    select: false,
  },

  // No signup route accepts this field — it can only be set directly in the
  // database (or by another admin, once an admin-management UI exists), so
  // a user can never self-promote by sending "role" in a request body.
  role:      { type: String, enum: ['user', 'admin'], default: 'user' },

  // ── Auth provider ────────────────────────────────────────────
  authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
  googleId:     { type: String, unique: true, sparse: true, select: false },

  // ── Password reset ───────────────────────────────────────────
  // The token stored here is a SHA-256 hash of the raw token emailed to the
  // user — the raw token never touches the database, same principle as
  // never storing a plaintext password.
  resetPasswordToken:   { type: String, select: false },
  resetPasswordExpires: { type: Date, select: false },

  // ── Multi-region following ───────────────────────────────────
  followedRegions: { type: [String], default: [] },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
