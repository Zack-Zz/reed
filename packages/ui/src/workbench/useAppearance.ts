import { useEffect, useState } from 'react';

type Theme = 'system' | 'light' | 'dark';
const readTheme = (): Theme => {
  try {
    const value = globalThis.localStorage?.getItem('reed-theme');
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
};
const systemDark = () =>
  typeof globalThis.matchMedia === 'function' &&
  globalThis.matchMedia('(prefers-color-scheme: dark)').matches;

export function useAppearance() {
  const [theme, setTheme] = useState<Theme>(readTheme);
  const [dark, setDark] = useState(systemDark);
  useEffect(() => {
    if (typeof globalThis.matchMedia !== 'function') return;
    const media = globalThis.matchMedia('(prefers-color-scheme: dark)');
    const change = (event: MediaQueryListEvent) => setDark(event.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme === 'system' ? (dark ? 'dark' : 'light') : theme;
    try {
      globalThis.localStorage?.setItem('reed-theme', theme);
    } catch {
      /* In-memory preferences remain usable. */
    }
  }, [theme, dark]);
  return { theme, setTheme, dark };
}
