import { useCallback, useState } from 'react';

const KEY = 'nexusai_theme';

function current() {
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
}

// Light / dark switch. The initial theme is applied by a tiny script in
// index.html (before first paint); this hook only toggles and remembers it.
export default function useTheme() {
  const [theme, setTheme] = useState(current);

  const toggle = useCallback(() => {
    const next = current() === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem(KEY, next); } catch { /* storage unavailable */ }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', next === 'light' ? '#F4F6F9' : '#0E0F11');
    setTheme(next);
  }, []);

  return [theme, toggle];
}
