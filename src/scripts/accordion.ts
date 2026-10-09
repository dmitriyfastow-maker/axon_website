function panelOf(btn: HTMLElement): HTMLElement | null {
  return document.getElementById(btn.getAttribute('aria-controls') ?? '');
}

export function setOpen(btn: HTMLElement, open: boolean): void {
  btn.setAttribute('aria-expanded', String(open));
  panelOf(btn)?.toggleAttribute('data-closed', !open);
}

export function initAccordions(): void {
  document.querySelectorAll<HTMLElement>('[data-acc-group]').forEach((group) => {
    const exclusive = !group.hasAttribute('data-acc-independent');
    const buttons = [...group.querySelectorAll<HTMLElement>('[data-acc-btn]')];
    buttons.forEach((btn) =>
      btn.addEventListener('click', () => {
        const open = btn.getAttribute('aria-expanded') !== 'true';
        if (open && exclusive) buttons.forEach((b) => b !== btn && setOpen(b, false));
        setOpen(btn, open);
      }),
    );
  });
}

/** Opens a pricing tier's details (used by the hero cascade cards). */
export function openTier(i: number): void {
  const btn = document.querySelector<HTMLElement>(`[data-tier-btn="${i}"]`);
  if (btn) setOpen(btn, true);
}

export function initHeroTiers(): void {
  document.querySelectorAll<HTMLElement>('[data-hero-tier]').forEach((a) =>
    a.addEventListener('click', () => openTier(Number(a.dataset.heroTier))),
  );
}
