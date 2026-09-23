const admin = require('firebase-admin');
const logger = require('./logger');

// Lazily initialized so the whole server doesn't crash on boot just
// because Firebase env vars aren't set yet — the /api/auth/google route
// is the only thing that needs this, and it fails cleanly on its own if
// Firebase isn't configured (see authController.googleAuth).
let initialized = false;

function ensureInitialized() {
  if (initialized) return;

  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;

  if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
    throw new Error(
      'Firebase is not configured — set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and ' +
      'FIREBASE_PRIVATE_KEY in your .env (see .env.example).'
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:  FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      // .env stores the private key with literal "\n" sequences (since a
      // real PEM has actual newlines, which don't survive a single-line
      // .env value) — convert them back before handing it to Firebase.
      privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });

  initialized = true;
  logger.info('Firebase Admin initialized');
}

// Verifies a Firebase ID token (sent by the frontend after a successful
// Google sign-in) and returns its decoded payload (uid, email, name, etc).
async function verifyFirebaseToken(idToken) {
  ensureInitialized();
  return admin.auth().verifyIdToken(idToken);
}

module.exports = { verifyFirebaseToken };
