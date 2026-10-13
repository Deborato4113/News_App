import axios from 'axios';

// Exported so code that can't use axios (the live event stream needs fetch)
// talks to the same server.
export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

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
    return Promise.reject(error);
  }
);

export default api;
