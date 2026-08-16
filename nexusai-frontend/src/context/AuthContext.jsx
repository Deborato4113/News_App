import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const token = localStorage.getItem('nexusai_token');
    if (!token) { setLoading(false); return; }
    api.get('/auth/me')
      .then(r => setUser(r.data.user))
      .catch(() => localStorage.removeItem('nexusai_token'))
      .finally(() => setLoading(false));
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

  function logout() {
    localStorage.removeItem('nexusai_token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
