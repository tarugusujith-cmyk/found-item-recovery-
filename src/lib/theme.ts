import { useState } from 'react';

export function useTheme() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  function toggle() {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('lf_theme', next ? 'dark' : 'light'); } catch { /* storage unavailable */ }
    setDark(next);
  }
  return { dark, toggle };
}
