// Our own behaviour analytics (like Yandex Metrica / Clarity, but first-party, no cookies, no personal data):
// where people click, clicks on things that are not clickable ("dead"), angry repeated clicks ("rage"), how far they
// scroll and how long they stay. Sent in one beacon when the page is hidden → /api/ux → CRM «Аналитика».
// It also remembers the first source of the visit (utm_source / other site / direct), so every lead shows where it came from.

const KEY = 'vx_src';
type Src = { s: string; c?: string; at: string };

function firstSource(): Src {
  const u = new URL(location.href);
  const utm = u.searchParams.get('utm_source');
  const ref = u.searchParams.get('ref');
  let saved: Src | null = null;
  try { saved = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch {}
  let other = '';
  try { const r = new URL(document.referrer); if (r.hostname !== location.hostname) other = r.hostname.replace(/^www\./, ''); } catch {}
  const now = utm ? { s: utm, c: u.searchParams.get('utm_content') || u.searchParams.get('utm_campaign') || undefined } : ref ? { s: 'partner:' + ref } : other ? { s: other } : null;
  // First touch wins; a new tagged visit replaces an untagged "direct" one.
  if (now && (!saved || saved.s === 'direct')) { saved = { ...now, at: new Date().toISOString().slice(0, 10) }; try { localStorage.setItem(KEY, JSON.stringify(saved)); } catch {} }
  return saved || { s: 'direct', at: '' };
}

/** "instagram_dmitriy / bio" — what the chats send with a new conversation. */
export function sourceLabel(): string {
  const s = firstSource();
  return (s.s + (s.c ? ' / ' + s.c : '')).slice(0, 80);
}
(window as unknown as { vxSrc: () => string }).vxSrc = sourceLabel;

const CLICKABLE = 'a,button,input,select,textarea,label,summary,[role=button],[onclick],[data-topic],[tabindex]';
function describe(el: Element): string {
  const c = el.closest(CLICKABLE) || el;
  const text = (c.getAttribute('aria-label') || (c as HTMLElement).innerText || c.getAttribute('alt') || '').replace(/\s+/g, ' ').trim().slice(0, 40);
  const tag = c.tagName.toLowerCase();
  const id = c.id ? '#' + c.id : '';
  const data = [...c.attributes].find((a) => a.name.startsWith('data-') && !a.name.startsWith('data-astro'))?.name || '';
  return `${tag}${id}${data ? '[' + data + ']' : ''}${text ? ' «' + text + '»' : ''}`.slice(0, 90);
}

export function startTracking(): void {
  const src = sourceLabel();
  let sess = '';
  try { sess = sessionStorage.getItem('vx_sess') || Math.random().toString(36).slice(2, 10); sessionStorage.setItem('vx_sess', sess); } catch {}
  const evs: Record<string, unknown>[] = [];
  const t0 = Date.now();
  let maxScroll = 0;
  const last: { t: number; x: number; y: number; n: number } = { t: 0, x: 0, y: 0, n: 0 };
  const docH = () => Math.max(document.documentElement.scrollHeight, 1);
  addEventListener('scroll', () => { maxScroll = Math.max(maxScroll, Math.round(((scrollY + innerHeight) / docH()) * 100)); }, { passive: true });
  addEventListener('click', (e) => {
    const t = e.target as Element | null;
    if (!t || evs.length > 80) return;
    const x = Math.round((e.pageX / Math.max(document.documentElement.scrollWidth, 1)) * 100);
    const y = Math.round((e.pageY / docH()) * 100);
    const dead = !t.closest(CLICKABLE);
    // Rage: 3+ clicks within a second in about the same spot.
    const near = Math.abs(e.pageX - last.x) < 30 && Math.abs(e.pageY - last.y) < 30 && Date.now() - last.t < 1000;
    last.n = near ? last.n + 1 : 1; last.t = Date.now(); last.x = e.pageX; last.y = e.pageY;
    evs.push({ k: last.n === 3 ? 'rage' : dead ? 'dead' : 'click', sel: describe(t), x, y });
  }, { capture: true, passive: true });
  let sent = false;
  const flush = () => {
    if (sent) return;
    sent = true;
    const body = JSON.stringify({ p: location.pathname, sess, src, evs: [...evs, { k: 'scroll', val: maxScroll || Math.round((innerHeight / docH()) * 100) }, { k: 'time', val: Math.round((Date.now() - t0) / 1000) }] });
    navigator.sendBeacon?.('/api/ux', new Blob([body], { type: 'application/json' }));
  };
  addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); else sent = false; });
}
