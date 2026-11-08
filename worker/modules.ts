// Modules (Decision 40): one click in the workspace deploys something real in the client's own account, built on the
// owner app (worker/biz.ts). CRM: a public form at /s/<slug> feeding their request board. Partner links: a link per
// partner, whose visits and requests count themselves through the source ref_<code>. Site: the same page as a one-page site.
// The site is free for everyone and carries a "Made on Vaxo" line until the first payment; the rest is Care and above.
// A page holds only escaped text and one fixed form, so nobody can publish scripts or their own forms on our domain.
import { askAi, json as parse } from './autopilot.js';
import { buyerRef } from './buyers.js';
import type { AiBinding } from './chat.js';
import type { DB } from './partner.js';

const hex = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, '0')).join('');
const cut = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const TONES: Record<string, [string, string, string, string]> = { // page, text, card, accent
  clean: ['#f8f9fa', '#111827', '#ffffff', '#2563eb'],
  dark: ['#0d0c0a', '#f4f1ea', '#1a1815', '#e8b04a'],
  warm: ['#fbf4ea', '#2d2118', '#ffffff', '#c2410c'],
};

export type Site = { lang: string; tone: string; title: string; sub: string; about: string; services: string[]; cta: string; ask?: string; img?: string };

const WORDS: Record<string, { name: string; contact: string; msg: string; send: string; done: string; made: string; fill: string; first: string }> = {
  en: { name: 'Your name', contact: 'Phone or email', msg: 'What do you need?', send: 'Send', done: 'Thank you! Your request has been sent.', made: 'Made on Vaxo', fill: 'Leave a request', first: 'Partner 1' },
  ru: { name: 'Ваше имя', contact: 'Телефон или email', msg: 'Что вам нужно?', send: 'Отправить', done: 'Спасибо! Заявка отправлена.', made: 'Сделано на Vaxo', fill: 'Оставить заявку', first: 'Партнёр 1' },
  ua: { name: "Ваше ім'я", contact: 'Телефон або email', msg: 'Що вам потрібно?', send: 'Надіслати', done: 'Дякуємо! Заявку надіслано.', made: 'Зроблено на Vaxo', fill: 'Залишити заявку', first: 'Партнер 1' },
};

const TRANSLIT: Record<string, string> = { а: 'a', б: 'b', в: 'v', г: 'g', ґ: 'g', д: 'd', е: 'e', ё: 'e', є: 'ye', ж: 'zh', з: 'z', и: 'i', і: 'i', ї: 'yi', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
export function slugOf(name: string): string {
  const s = [...name.toLowerCase()].map((c) => TRANSLIT[c] ?? c).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return `${s || 'page'}-${hex(2)}`;
}

export function cleanSite(x: Record<string, unknown>, lang: string): Site {
  const list = Array.isArray(x.services) ? x.services : String(x.services ?? '').split('\n');
  return {
    lang: lang in WORDS ? lang : 'en',
    tone: cut(x.tone, 8) in TONES ? cut(x.tone, 8) : 'clean',
    title: cut(x.title, 80), sub: cut(x.sub, 160), about: cut(x.about, 800),
    services: list.map((s) => cut(s, 100)).filter(Boolean).slice(0, 6),
    cta: cut(x.cta, 40),
    ask: cut(x.ask, 80) || undefined,
    img: /^[a-f0-9]{24}$/.test(String(x.img ?? '')) ? String(x.img) : undefined,
  };
}

async function ensureBiz(db: DB, clientId: number, name: string, lang: string) {
  let b = await db.prepare('SELECT id, name FROM biz WHERE owner_id = ? ORDER BY id LIMIT 1').bind(clientId).first<{ id: number; name: string }>();
  if (!b) {
    const n = name || 'My business';
    b = await db.prepare('INSERT INTO biz (owner_id, name, key) VALUES (?, ?, ?) RETURNING id, name').bind(clientId, n, hex(12)).first<{ id: number; name: string }>();
  }
  const page = await db.prepare('SELECT slug FROM biz_pages WHERE biz_id = ?').bind(b!.id).first();
  if (!page) await db.prepare(`INSERT INTO biz_pages (biz_id, slug, kind, data) VALUES (?, ?, 'form', ?)`).bind(b!.id, slugOf(b!.name), JSON.stringify(cleanSite({ title: b!.name }, lang))).run();
  return b!;
}

/** CRM, the site's AI chat and an own domain belong to Care and above, the free month included; the site itself stays free.
 *  They lock when a subscription invoice goes past its due date, so a trial, a month and a paid year all end the same way. */
export async function moduleAccess(db: DB, clientId: number): Promise<boolean> {
  return !!(await db.prepare(`SELECT 1 FROM leads l WHERE l.client_id = ? AND l.plan IN ('care', 'growth', 'pro')
    AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.lead_id = l.id AND i.status = 'open' AND i.description LIKE 'Vaxo %' AND i.due < date('now')) LIMIT 1`).bind(clientId).first());
}

/** The free Care month from inside the workspace: the same lead a plan button on the site makes, so billing sends the first invoice when it ends. */
export async function startTrial(db: DB, me: { id: number; email: string | null; name: string | null }, lang: string, ref: string): Promise<boolean> {
  if (await db.prepare(`SELECT 1 FROM leads WHERE client_id = ? AND plan IN ('care', 'growth', 'pro') LIMIT 1`).bind(me.id).first()) return false;
  const link = ref ? await db.prepare('SELECT slug FROM links WHERE slug = ? AND active = 1').bind(ref).first<{ slug: string }>().catch(() => null) : null;
  const contact = me.email ?? '';
  const by = await buyerRef(db, contact, link?.slug ?? null).catch(() => link?.slug ?? null);
  await db.prepare(`INSERT INTO leads (mode, name, contact, email_addr, interest, message, lang, ref, page, room, client_id, plan) VALUES ('request', ?, ?, ?, 'Care', '[PLAN care] Workspace', ?, ?, '/app/', ?, ?, 'care')`)
    .bind(me.name || contact.split('@')[0] || 'Client', contact, me.email, lang in WORDS ? lang : 'en', by, hex(12), me.id).run();
  // A site deployed before the trial gets its AI chat now: the chat answers from "about".
  const p = await db.prepare('SELECT b.id, p.data FROM biz b JOIN biz_pages p ON p.biz_id = b.id WHERE b.owner_id = ? ORDER BY b.id LIMIT 1').bind(me.id).first<{ id: number; data: string }>();
  if (p) { const s = JSON.parse(p.data) as Site; await db.prepare(`UPDATE biz SET about = COALESCE(NULLIF(about, ''), ?) WHERE id = ?`).bind([s.about, ...s.services].filter(Boolean).join('\n') || null, p.id).run(); }
  return true;
}

export async function addRef(db: DB, clientId: number, name: string): Promise<boolean> {
  const b = await db.prepare('SELECT id FROM biz WHERE owner_id = ? ORDER BY id LIMIT 1').bind(clientId).first<{ id: number }>();
  if (!b || !name) return false;
  const n = await db.prepare('SELECT COUNT(*) AS n FROM biz_refs WHERE biz_id = ?').bind(b.id).first<{ n: number }>();
  if ((n?.n ?? 0) >= 200) return false;
  await db.prepare('INSERT INTO biz_refs (biz_id, code, name) VALUES (?, ?, ?)').bind(b.id, hex(4), name).run();
  return true;
}

export async function deployModule(db: DB, ai: AiBinding | undefined, clientId: number, kind: string, name: string, lang: string, memory: { niche: string; goals: string; project: string }, access: boolean) {
  const w = WORDS[lang] ?? WORDS.en;
  const biz = await ensureBiz(db, clientId, name || memory.project.slice(0, 60) || memory.niche.slice(0, 60), lang);
  if (kind === 'partner') {
    const has = await db.prepare('SELECT 1 FROM biz_refs WHERE biz_id = ?').bind(biz.id).first();
    if (!has) await addRef(db, clientId, w.first);
  }
  if (kind === 'site') {
    const site = await writeSite(ai, lang, `Name: ${biz.name}. Field: ${memory.niche || '?'}. Goals: ${memory.goals || '?'}. Project: ${memory.project || '?'}.`, biz.name);
    await db.prepare(`UPDATE biz_pages SET kind = 'site', data = ? WHERE biz_id = ?`).bind(JSON.stringify(site), biz.id).run();
    // The site's AI chat answers only from "about", so the page's own text switches it on.
    if (access) await db.prepare(`UPDATE biz SET about = COALESCE(about, ?) WHERE id = ?`).bind([site.about, ...site.services].join('\n') || null, biz.id).run();
  }
}

const LANG_NAME: Record<string, string> = { en: 'English', ru: 'Russian', ua: 'Ukrainian' };

/** The text of a one-page site from what is known: a wish in the workspace, or the notes Vax keeps. Never invents facts. */
export async function writeSite(ai: AiBinding | undefined, lang: string, known: string, name = ''): Promise<Site> {
  const t = ai ? await askAi(ai, `Write the text of a one-page website in ${LANG_NAME[lang] ?? 'English'}. Use only what is known below. Never invent prices, addresses, phones, reviews, years, awards or numbers. If little is known, keep the text general and short. The page has one form; make its title and the hint in its message box fit the wish (an order, a booking, a pre-order, a question).
${known}
Return ONLY JSON: {"title":"name or a short headline","sub":"one line: what the visitor gets","about":"2-3 plain sentences","services":["3-6 short items, at least 3: what the visitor can get or book here"],"cta":"form title, 1-4 words","ask":"hint inside the message box, at most 8 words","tone":"clean, dark or warm"}`, 600).catch(() => '') : '';
  return cleanSite({ title: name, ...(parse<Record<string, unknown>>(t) ?? {}) }, lang);
}

/** Publish from the Canvas: the site gets this text, created first if there is none yet. */
export async function publishSite(db: DB, clientId: number, x: Record<string, unknown>, lang: string, access: boolean) {
  const site = cleanSite(x, lang);
  const biz = await ensureBiz(db, clientId, site.title.slice(0, 60), site.lang);
  await db.prepare(`UPDATE biz_pages SET kind = 'site', data = ? WHERE biz_id = ?`).bind(JSON.stringify(site), biz.id).run();
  if (access) await db.prepare(`UPDATE biz SET about = COALESCE(NULLIF(about, ''), ?) WHERE id = ?`).bind([site.about, ...site.services].join('\n') || null, biz.id).run();
}

/** The same page for the Canvas preview: no scripts, the form does nothing. */
export const sitePreview = (s: Site) => page(s, 'site', s.title || 'Site', '', 'preview', false).replace(/<script[\s\S]*?<\/script>/g, '').replace(/<link rel="manifest"[^>]*>/, '');

/** A site from the chat goes live at once. The first one becomes the account's main site (the one a domain attaches
 *  to); every next one is an extra page with its own address. All of them send requests to the same CRM. */
export async function liveSite(db: DB, clientId: number, x: Record<string, unknown>, lang: string, access: boolean): Promise<string> {
  const site = cleanSite(x, lang);
  const main = await db.prepare('SELECT b.id, p.slug, p.kind FROM biz b LEFT JOIN biz_pages p ON p.biz_id = b.id WHERE b.owner_id = ? ORDER BY b.id LIMIT 1').bind(clientId).first<{ id: number; slug: string | null; kind: string | null }>();
  if (!main?.slug || main.kind !== 'site') {
    await publishSite(db, clientId, site, lang, access);
    return (await db.prepare('SELECT p.slug FROM biz b JOIN biz_pages p ON p.biz_id = b.id WHERE b.owner_id = ? ORDER BY b.id LIMIT 1').bind(clientId).first<{ slug: string }>())!.slug;
  }
  const slug = slugOf(site.title || 'page');
  await db.prepare('INSERT INTO ws_sites (slug, client_id, biz_id, data) VALUES (?, ?, ?, ?)').bind(slug, clientId, main.id, JSON.stringify(site)).run();
  return slug;
}

/** Saves edits to one of the person's live pages, main or extra. False if the address is not theirs. */
export async function updateLiveSite(db: DB, clientId: number, slug: string, x: Record<string, unknown>, lang: string): Promise<boolean> {
  const site = JSON.stringify(cleanSite(x, lang));
  const main = await db.prepare(`UPDATE biz_pages SET data = ?, kind = 'site' WHERE slug = ? AND biz_id IN (SELECT id FROM biz WHERE owner_id = ?)`).bind(site, slug, clientId).run();
  if ((main as { meta?: { changes?: number } })?.meta?.changes) return true;
  const extra = await db.prepare('UPDATE ws_sites SET data = ? WHERE slug = ? AND client_id = ?').bind(site, slug, clientId).run();
  return !!(extra as { meta?: { changes?: number } })?.meta?.changes;
}

export async function saveSite(db: DB, clientId: number, b: Record<string, unknown>) {
  const biz = await db.prepare('SELECT b.id, p.data FROM biz b JOIN biz_pages p ON p.biz_id = b.id WHERE b.owner_id = ? ORDER BY b.id LIMIT 1').bind(clientId).first<{ id: number; data: string }>();
  if (!biz) return;
  const old = JSON.parse(biz.data) as Site;
  await db.prepare(`UPDATE biz_pages SET data = ? WHERE biz_id = ?`).bind(JSON.stringify(cleanSite({ ...old, ...b }, old.lang)), biz.id).run();
}

export async function modulesState(db: DB, clientId: number, origin: string, access: boolean) {
  const biz = await db.prepare('SELECT b.id, b.name, p.slug, p.kind, p.data FROM biz b LEFT JOIN biz_pages p ON p.biz_id = b.id WHERE b.owner_id = ? ORDER BY b.id LIMIT 1').bind(clientId).first<{ id: number; name: string; slug: string | null; kind: string | null; data: string | null }>();
  if (!biz?.slug) return { crm: null, partner: null, site: null, biz: biz ? { id: biz.id, name: biz.name } : null };
  const url = `${origin}/s/${biz.slug}`;
  const leads = (await db.prepare('SELECT id, at, name, contact, message, source, path, status FROM biz_leads WHERE biz_id = ? ORDER BY id DESC LIMIT 30').bind(biz.id).all()).results;
  const total = (await db.prepare('SELECT COUNT(*) AS n FROM biz_leads WHERE biz_id = ?').bind(biz.id).first<{ n: number }>())?.n ?? 0;
  const refs = (await db.prepare(`SELECT r.name, r.code,
      (SELECT COUNT(DISTINCT sid) FROM biz_events e WHERE e.biz_id = r.biz_id AND e.type = 'pv' AND e.source = 'ref_' || r.code) AS visits,
      (SELECT COUNT(*) FROM biz_leads l WHERE l.biz_id = r.biz_id AND l.source = 'ref_' || r.code) AS leads
    FROM biz_refs r WHERE r.biz_id = ? ORDER BY r.id`).bind(biz.id).all<{ name: string; code: string; visits: number; leads: number }>()).results;
  const extra = (await db.prepare('SELECT slug, data FROM ws_sites WHERE client_id = ? ORDER BY at DESC LIMIT 20').bind(clientId).all<{ slug: string; data: string }>().catch(() => ({ results: [] }))).results;
  const pages = [...extra.map((p) => ({ ...(JSON.parse(p.data) as Site), slug: p.slug, url: `${origin}/s/${p.slug}` })), ...(biz.kind === 'site' ? [{ ...(JSON.parse(biz.data || '{}') as Site), slug: biz.slug, url, main: true }] : [])];
  return {
    biz: { id: biz.id, name: biz.name },
    pages,
    crm: access ? { url, total, leads } : null,
    requests: total,
    partner: refs.length ? { links: refs.map((r) => ({ ...r, url: `${url}?utm_source=ref_${r.code}` })) } : null,
    site: biz.kind === 'site' ? { url, slug: biz.slug, ...(JSON.parse(biz.data || '{}') as Site) } : null,
  };
}

const STEPS: Record<string, [string, string, string, string, string, string]> = {
  en: ['What you get', 'About us', 'How it works', 'Leave a request', 'We get back to you and agree the details', 'You get the result', ],
  ru: ['Что вы получите', 'О нас', 'Как это работает', 'Оставьте заявку', 'Мы свяжемся и уточним детали', 'Вы получаете результат'],
  ua: ['Що ви отримаєте', 'Про нас', 'Як це працює', 'Залиште заявку', 'Ми звʼяжемося й уточнимо деталі', 'Ви отримуєте результат'],
};
const ICON = ['M5 12.5 9.5 17 19 7.5', 'M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.6 6.7 19.4l1.2-6L3.4 9.3l6-.7z', 'M12 21s-7-4.5-7-11a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 6.5-7 11-7 11z', 'M4 12h16M12 4v16', 'M3 12h4l3 7 4-14 3 7h4', 'M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4'];

/** The public page: a hero with the business's picture, what you get, about, how it works, one request form. Escaped text only. */
function page(s: Site, kind: string, name: string, key: string, slug: string, index: boolean): string {
  const w = WORDS[s.lang] ?? WORDS.en, st = STEPS[s.lang] ?? STEPS.en;
  const [bg, ink, card, acc] = TONES[s.tone] ?? TONES.clean;
  const title = s.title || name, site = kind === 'site', cta = s.cta || w.fill;
  const img = s.img && /^[a-f0-9]{24}$/.test(s.img) ? `/i/${s.img}.jpg` : '';
  const svg = (d: string) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  const services = site && s.services.length ? `<section class="sec"><h2>${esc(st[0])}</h2><div class="grid">${s.services.map((x, i) => `<div class="card"><span class="ic">${svg(ICON[i % ICON.length])}</span><b>${esc(x)}</b></div>`).join('')}</div></section>` : '';
  const about = site && s.about ? `<section class="sec about"><h2>${esc(st[1])}</h2><p>${esc(s.about)}</p></section>` : '';
  const how = site ? `<section class="sec"><h2>${esc(st[2])}</h2><ol class="steps"><li><i>1</i>${esc(st[3])}</li><li><i>2</i>${esc(st[4])}</li><li><i>3</i>${esc(st[5])}</li></ol></section>` : '';
  return `<!doctype html><html lang="${s.lang === 'ua' ? 'uk' : s.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(s.sub || title)}">${index ? '' : '<meta name="robots" content="noindex">'}
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(s.sub || title)}">${img ? `<meta property="og:image" content="https://vaxogroup.com${img}">` : ''}
<link rel="manifest" href="/s/${slug}/manifest.webmanifest"><meta name="theme-color" content="${bg}">
<style>*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:${bg};color:${ink};font:17px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}
a{color:inherit}.bar{position:sticky;top:0;z-index:5;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 20px;background:color-mix(in srgb,${bg} 82%,transparent);backdrop-filter:blur(12px);border-bottom:1px solid color-mix(in srgb,${ink} 8%,transparent)}
.bar b{font-size:16px;letter-spacing:-.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.btn{display:inline-block;background:${acc};color:#fff;text-decoration:none;font-weight:700;border-radius:999px;padding:11px 20px;font-size:15px;border:0;cursor:pointer;white-space:nowrap}
.btn.ghost{background:transparent;color:inherit;box-shadow:inset 0 0 0 1.5px currentColor}
.hero{position:relative;min-height:${img ? '78vh' : '56vh'};display:grid;align-items:end;padding:${img ? '120px' : '72px'} 20px 48px;${img ? `background:#111 url(${img}) center/cover no-repeat;color:#fff` : `background:radial-gradient(1200px 500px at 20% -10%,color-mix(in srgb,${acc} 22%,transparent),transparent)`}}
${img ? '.hero:before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.15) 0%,rgba(0,0,0,.35) 45%,rgba(0,0,0,.82) 100%)}' : ''}
.hero>div{position:relative;max-width:760px;margin:0 auto;width:100%}h1{font-size:clamp(36px,8vw,64px);line-height:1.04;letter-spacing:-.03em;margin:0 0 14px}.sub{font-size:clamp(18px,3.4vw,22px);opacity:.88;margin:0 0 26px;max-width:600px}.acts{display:flex;gap:10px;flex-wrap:wrap}
main{max-width:860px;margin:0 auto;padding:12px 20px 24px}.sec{padding:44px 0 8px}h2{font-size:clamp(26px,5vw,34px);letter-spacing:-.02em;line-height:1.15;margin:0 0 20px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}.card{background:${card};border-radius:18px;padding:20px;border:1px solid color-mix(in srgb,${ink} 9%,transparent);display:grid;gap:12px;align-content:start}.card b{font-size:17px;line-height:1.35}
.ic{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:color-mix(in srgb,${acc} 14%,transparent);color:${acc}}.about p{font-size:19px;max-width:680px;margin:0;opacity:.9}
.steps{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}.steps li{background:${card};border-radius:18px;padding:18px 20px;display:flex;gap:14px;align-items:center;font-weight:600;border:1px solid color-mix(in srgb,${ink} 9%,transparent)}.steps i{font-style:normal;flex:none;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:${acc};color:#fff;font-weight:800}
#form{scroll-margin-top:70px}form{background:${card};padding:26px 22px;border-radius:22px;border:1px solid color-mix(in srgb,${ink} 10%,transparent);display:grid;gap:12px;box-shadow:0 24px 60px color-mix(in srgb,${ink} 10%,transparent)}form h2{margin:0 0 4px}
input,textarea{font:16px inherit;width:100%;padding:14px 15px;border-radius:12px;border:1px solid color-mix(in srgb,${ink} 18%,transparent);background:${bg};color:inherit}input:focus,textarea:focus{outline:2px solid ${acc};outline-offset:1px}form .btn{padding:15px;font-size:16px;border-radius:12px}.ok{font-weight:700;font-size:19px;margin:0}
footer{max-width:860px;margin:0 auto;padding:28px 20px 40px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:13px;opacity:.6}</style></head><body>
<div class="bar"><b>${esc(title)}</b><a class="btn" href="#form">${esc(cta)}</a></div>
<header class="hero"><div><h1>${esc(title)}</h1>${s.sub ? `<p class="sub">${esc(s.sub)}</p>` : ''}<div class="acts"><a class="btn" href="#form">${esc(cta)}</a>${services ? `<a class="btn ghost" href="#more">${esc(st[0])}</a>` : ''}</div></div></header>
<main id="more">${services}${about}${how}
<section class="sec" id="form"><form id="f"><h2>${esc(cta)}</h2><input name="name" maxlength="80" placeholder="${esc(w.name)}" autocomplete="name"><input name="contact" maxlength="120" placeholder="${esc(w.contact)}" required><textarea name="message" rows="3" maxlength="1500" placeholder="${esc(s.ask || w.msg)}"></textarea><button class="btn">${esc(w.send)}</button></form></section>
</main><footer><span>© ${new Date().getFullYear()} ${esc(title)}</span>${index ? '' : `<a href="https://vaxogroup.com/">${esc(w.made)}</a>`}</footer>
<script src="/w.js?k=${key}" async></script><script>document.getElementById('f').onsubmit=function(e){e.preventDefault();var p=document.createElement('p');p.className='ok';p.textContent=${JSON.stringify(w.done).replace(/</g, '\\u003c')};this.replaceChildren(p)}</script></body></html>`;
}

/** /s/<slug> and its manifest: the public side of a deployed module. */
export async function servePage(db: DB, slug: string, manifest: boolean): Promise<Response> {
  const r = (await db.prepare('SELECT b.id, b.name, b.key, b.owner_id, p.kind, p.data FROM biz_pages p JOIN biz b ON b.id = p.biz_id WHERE p.slug = ?').bind(slug).first<{ id: number; name: string; key: string; owner_id: number; kind: string; data: string }>().catch(() => null))
    ?? (await db.prepare(`SELECT b.id, b.name, b.key, b.owner_id, 'site' AS kind, s.data FROM ws_sites s JOIN biz b ON b.id = s.biz_id WHERE s.slug = ?`).bind(slug).first<{ id: number; name: string; key: string; owner_id: number; kind: string; data: string }>().catch(() => null));
  if (!r) return new Response('Not found', { status: 404 });
  const s = JSON.parse(r.data) as Site;
  if (manifest) return new Response(JSON.stringify({ name: s.title || r.name, short_name: (s.title || r.name).slice(0, 12), start_url: `/s/${slug}`, display: 'standalone', background_color: (TONES[s.tone] ?? TONES.clean)[0], icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }] }), { headers: { 'Content-Type': 'application/manifest+json' } });
  // Only paying clients' pages go into search: free pages stay out, so the domain does not fill up with empty ones.
  const paid = await db.prepare(`SELECT 1 FROM leads l JOIN invoices i ON i.lead_id = l.id WHERE l.client_id = ? AND i.status = 'paid' LIMIT 1`).bind(r.owner_id).first().catch(() => null);
  return new Response(page(s, r.kind, r.name, r.key, slug, !!paid), { headers: {
    'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data: https://vaxogroup.com; connect-src 'self'; form-action 'none'; base-uri 'none'",
  } });
}
