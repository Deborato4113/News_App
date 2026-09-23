const nodemailer = require('nodemailer');
const logger = require('./logger');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null; // not configured

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return transporter;
}

// Sends the password-reset email if SMTP is configured. If it isn't (e.g.
// local development with no mail account set up), falls back to logging
// the reset link so the flow is still testable end-to-end without a real
// mail account — never blocks the request on missing SMTP config.
async function sendPasswordResetEmail(toEmail, resetUrl) {
  const t = getTransporter();

  if (!t) {
    logger.warn(
      { toEmail, resetUrl },
      'SMTP not configured — logging password reset link instead of emailing it'
    );
    return { delivered: false };
  }

  await t.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: toEmail,
    subject: 'Reset your NexusAI password',
    text: `Reset your password here: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
    html: `<p>Reset your password by clicking the link below:</p>
           <p><a href="${resetUrl}">${resetUrl}</a></p>
           <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>`,
  });

  return { delivered: true };
}

module.exports = { sendPasswordResetEmail };
