import { setOpen } from './accordion';

export function initCasesFilter(): void {
  const buttons = [...document.querySelectorAll<HTMLButtonElement>('[data-case-filter]')];
  const cards = [...document.querySelectorAll<HTMLElement>('[data-case-tier]')];
  buttons.forEach((btn) =>
    btn.addEventListener('click', () => {
      const v = Number(btn.dataset.caseFilter);
      buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      cards.forEach((card) => {
        card.hidden = v !== -1 && Number(card.dataset.caseTier) !== v;
        const toggle = card.querySelector<HTMLElement>('[data-acc-btn]');
        if (toggle) setOpen(toggle, false);
      });
    }),
  );
}
