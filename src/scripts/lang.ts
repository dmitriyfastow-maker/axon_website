import { save } from './storage';

export function initLang(): void {
  document.querySelectorAll<HTMLAnchorElement>('[data-lang-link]').forEach((a) =>
    // Save before navigating so "/" does not bounce back to a previously stored language.
    // The cookie lets the worker respect a manual choice (Ukrainian visitors otherwise land on /ua/ by default).
    a.addEventListener('click', () => {
      save('axon_lang', a.dataset.langLink!);
      document.cookie = `vaxo_lang=${a.dataset.langLink}; path=/; max-age=31536000; samesite=lax`;
    }),
  );
}
