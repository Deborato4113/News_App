import axios from 'axios';

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL,
  // The free hosting plan puts the server to sleep when idle, and waking it can take
  // close to a minute, so a short timeout made the first request after a pause (often
  // sign-up or login) fail with "timeout exceeded".
  timeout: 60000,
});

// Wake the server as soon as the site opens, so it is ready by the time someone has
// filled in the sign-up or login form. Fire and forget: the answer does not matter.
if (import.meta.env.PROD && typeof fetch === 'function') {
  try {
    fetch(baseURL.replace(/\/api\/?$/, '/'), { mode: 'no-cors', cache: 'no-store' }).catch(() => {});
  } catch { /* nothing to do if the browser blocks it */ }
}

// Attach JWT token on every request if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nexusai_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global 401 handling: a dead/expired token should force a clean logout
// from anywhere in the app, not just on the initial /auth/me check.
// AuthContext listens for this event and clears user state + redirects.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('nexusai_token');
      window.dispatchEvent(new CustomEvent('nexusai:unauthorized'));
    }
    // No answer at all (timed out, offline, server still waking): say so in plain words
    // instead of "timeout of 15000ms exceeded".
    if (!error.response && (error.code === 'ECONNABORTED' || error.code === 'ERR_NETWORK')) {
      error.message = error.code === 'ECONNABORTED'
        ? 'The server is taking a while to wake up. Please try again in a few seconds.'
        : 'Could not reach the server. Check your connection and try again.';
    }
    return Promise.reject(error);
  }
);

export default api;
