import axios from 'axios';

// Exported so code that can't use axios (the live event stream needs fetch)
// talks to the same server.
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

// Slow-request signal. Free hosting puts the server to sleep when idle, so the
// first request can take a while; if any request is still pending after 4s the
// UI shows a "waking up" notice, and hides it once nothing is slow any more.
const SLOW_AFTER_MS = 4000;
let slowCount = 0;
const emitSlow = (on) => window.dispatchEvent(new CustomEvent('nexusai:slow', { detail: on }));

function settle(config) {
  const meta = config?.metadata;
  if (!meta) return;
  clearTimeout(meta.timer);
  if (meta.slow) {
    meta.slow = false;
    slowCount = Math.max(0, slowCount - 1);
    if (slowCount === 0) emitSlow(false);
  }
}

// Attach JWT token on every request if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nexusai_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const meta = { slow: false };
  meta.timer = setTimeout(() => {
    meta.slow = true;
    slowCount += 1;
    if (slowCount === 1) emitSlow(true);
  }, SLOW_AFTER_MS);
  config.metadata = meta;
  return config;
});

// Global 401 handling: a dead/expired token should force a clean logout
// from anywhere in the app, not just on the initial /auth/me check.
// AuthContext listens for this event and clears user state + redirects.
api.interceptors.response.use(
  (response) => {
    settle(response.config);
    return response;
  },
  (error) => {
    settle(error.config);
    if (error.response?.status === 401) {
      localStorage.removeItem('nexusai_token');
      window.dispatchEvent(new CustomEvent('nexusai:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export default api;
