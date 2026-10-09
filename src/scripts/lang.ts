import { save } from './storage';

export function initLang(): void {
  document.querySelectorAll<HTMLAnchorElement>('[data-lang-link]').forEach((a) =>
    // Save before navigating so "/" does not bounce back to a previously stored language.
    a.addEventListener('click', () => save('axon_lang', a.dataset.langLink!)),
  );
}
