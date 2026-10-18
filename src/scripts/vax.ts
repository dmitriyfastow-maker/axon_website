// Easter egg: click any Vax image ([data-vax-poke]) — he changes his face and tells a random joke.
const FACES = ['happy', 'shocked', 'smug', 'front'];

export function initVaxPoke(): void {
  const jokesEl = document.getElementById('vax-jokes');
  if (!jokesEl) return;
  const jokes = JSON.parse(jokesEl.textContent || '[]') as string[];
  let last = -1;
  document.addEventListener('click', (e) => {
    const img = (e.target as Element).closest<HTMLImageElement>('img[data-vax-poke]');
    if (!img || !jokes.length) return;
    e.preventDefault();
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
