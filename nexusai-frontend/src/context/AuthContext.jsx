import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { signInWithPopup } from 'firebase/auth';
import api from '../api/axios';
import { auth, googleProvider, firebaseEnabled } from '../firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('nexusai_token');
    setUser(null);
  }, []);

  // Restore session on mount
  useEffect(() => {
    let cancelled = false;

    async function restore() {
      const token = localStorage.getItem('nexusai_token');
      if (!token) { if (!cancelled) setLoading(false); return; }
      try {
        const r = await api.get('/auth/me');
        if (!cancelled) setUser(r.data.user);
      } catch {
        localStorage.removeItem('nexusai_token');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    restore();
    return () => { cancelled = true; };
  }, []);

  // Any 401 from anywhere in the app (expired/invalid token) forces a
  // clean logout instead of leaving the UI in a half-authenticated state.
  useEffect(() => {
    const onUnauthorized = () => setUser(null);
    window.addEventListener('nexusai:unauthorized', onUnauthorized);
    return () => window.removeEventListener('nexusai:unauthorized', onUnauthorized);
  }, []);

  async function signup(name, email, password) {
    const r = await api.post('/auth/signup', { name, email, password });
    localStorage.setItem('nexusai_token', r.data.token);
    setUser(r.data.user);
  }

  async function login(email, password) {
    const r = await api.post('/auth/login', { email, password });
    localStorage.setItem('nexusai_token', r.data.token);
    setUser(r.data.user);
  }

  // Opens Firebase's Google sign-in popup, then exchanges the resulting
  // Firebase ID token for our own app JWT via POST /api/auth/google — so
  // the rest of the app (axios interceptor, protected routes) only ever
  // has to deal with one kind of token.
  async function loginWithGoogle() {
    if (!firebaseEnabled) {
      throw new Error('Google sign-in is not configured (missing Firebase env vars).');
    }
    const result = await signInWithPopup(auth, googleProvider);
    const idToken = await result.user.getIdToken();
    const r = await api.post('/auth/google', { idToken });
    localStorage.setItem('nexusai_token', r.data.token);
    setUser(r.data.user);
  }

  async function forgotPassword(email) {
    const r = await api.post('/auth/forgot-password', { email });
    return r.data.message;
  }

  async function resetPassword(token, password) {
    const r = await api.post('/auth/reset-password', { token, password });
    return r.data.message;
  }

  async function followRegion(region) {
    const r = await api.post('/auth/follow-region', { region });
    setUser((u) => (u ? { ...u, followedRegions: r.data.followedRegions } : u));
  }

  async function unfollowRegion(region) {
    const r = await api.delete(`/auth/follow-region/${encodeURIComponent(region)}`);
    setUser((u) => (u ? { ...u, followedRegions: r.data.followedRegions } : u));
  }

  return (
    <AuthContext.Provider value={{
      user, loading, signup, login, logout,
      loginWithGoogle, firebaseEnabled,
      forgotPassword, resetPassword,
      followRegion, unfollowRegion,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// Co-locating the hook with its Provider is intentional; this only affects
// Vite's Fast Refresh during dev, not the production build.
// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
