/**
 * Manual theme override (Settings). 'system' follows prefers-color-scheme (the default,
 * spec §3.8); 'light'/'dark' force it via a data-theme attribute that the CSS variables honor.
 */
export type ThemeSetting = 'system' | 'light' | 'dark';

export function applyTheme(theme: ThemeSetting): void {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}
