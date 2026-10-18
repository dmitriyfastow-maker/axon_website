// Easter egg: click any Vax image ([data-vax-poke]) — he changes his face and tells a random joke.
const FACES = ['happy', 'shocked', 'smug', 'front'];
const POKED = 'vaxo_poked';

function remembered(): boolean {
  try { return localStorage.getItem(POKED) === '1'; } catch { return true; }
}

// Once per visitor: when a clickable Vax first scrolls into view, a small "tap me" bubble shows for a few seconds.
function initHint(): void {
  const text = JSON.parse(document.getElementById('vax-hint')?.textContent || '""') as string;
  if (!text || remembered()) return;
  const show = () => {
    // The first clickable Vax that is really visible (not on a hidden tab) and on screen.
    const first = [...document.querySelectorAll<HTMLImageElement>('img[data-vax-poke]')].find((img) => {
      const r = img.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight - r.height * 0.5;
    });
    if (!first) return;
    window.removeEventListener('scroll', show);
    setTimeout(() => {
      if (remembered()) return;
      const tip = document.createElement('div');
      tip.className = 'vax-hint';
      tip.textContent = text;
      const b = first.getBoundingClientRect();
      tip.style.left = `${Math.min(window.innerWidth - 190, Math.max(12, b.left + b.width / 2 - 85))}px`;
      tip.style.top = `${Math.max(12, b.top + window.scrollY - 44)}px`;
      document.body.append(tip);
      setTimeout(() => tip.remove(), 4000);
    }, 1200);
  };
  window.addEventListener('scroll', show, { passive: true });
  show();
}

export function initVaxPoke(): void {
  const jokesEl = document.getElementById('vax-jokes');
  if (!jokesEl) return;
  const jokes = JSON.parse(jokesEl.textContent || '[]') as string[];
  initHint();
  let last = -1;
  document.addEventListener('click', (e) => {
    const img = (e.target as Element).closest<HTMLImageElement>('img[data-vax-poke]');
    if (!img || !jokes.length) return;
    e.preventDefault();
    try { localStorage.setItem(POKED, '1'); } catch {}
    document.querySelector('.vax-hint')?.remove();
    const cur = FACES.findIndex((f) => img.src.includes(`vax-${f}`));
    img.src = `/mascot/vax-${FACES[(cur + 1) % FACES.length]}.webp`;
    img.classList.remove('vax-wiggle'); void img.offsetWidth; img.classList.add('vax-wiggle');
    let i = Math.floor(Math.random() * jokes.length);
    if (i === last) i = (i + 1) % jokes.length;
    last = i;
    document.querySelector('.vax-pop')?.remove();
    const pop = document.createElement('div');
    pop.className = 'vax-pop';
    pop.setAttribute('role', 'status');
    pop.textContent = jokes[i];
    const r = img.getBoundingClientRect();
    pop.style.left = `${Math.min(window.innerWidth - 260, Math.max(12, r.left + r.width / 2 - 120))}px`;
    pop.style.top = `${Math.max(12, r.top + window.scrollY - 64)}px`;
    document.body.append(pop);
    setTimeout(() => pop.remove(), 3200);
  });
}
