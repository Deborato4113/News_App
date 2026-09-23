import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// All values come from your Firebase project's web app config (Project
// Settings -> General -> Your apps -> SDK setup and configuration).
// These are safe to expose in frontend code — Firebase's web config is
// meant to be public; it's not a secret the way an API server key is.
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

// Only initialize if config is actually present — lets the rest of the
// app run fine (with the Google button simply failing gracefully) before
// Firebase is set up, instead of crashing the whole page on load.
export const firebaseEnabled = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

let app, auth, googleProvider;
if (firebaseEnabled) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
}

export { auth, googleProvider };
