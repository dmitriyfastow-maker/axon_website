import { save } from './storage';

const KEY = 'axon_theme2';
const set = (t: string) => document.documentElement.setAttribute('data-theme', t);

/** One choice for the whole site, saved in this browser. Until the person chooses, the device setting decides. */
export function initTheme(): void {
  // main.ts and some pages both call this; a second set of listeners would flip the theme back on the same click.
  if ((window as any).__vxTheme) return;
  (window as any).__vxTheme = true;
  document.querySelectorAll('[data-theme-toggle]').forEach((b) => b.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    set(next);
    save(KEY, next);
  }));
  // Other open tabs follow at once.
  addEventListener('storage', (e) => { if (e.key === KEY && (e.newValue === 'light' || e.newValue === 'dark')) set(e.newValue); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    let saved: string | null = null;
    try { saved = localStorage.getItem(KEY); } catch { /* private mode */ }
    if (saved !== 'light' && saved !== 'dark') set(e.matches ? 'dark' : 'light');
  });
}
