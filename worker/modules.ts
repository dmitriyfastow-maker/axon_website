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

export type Site = { lang: string; tone: string; title: string; sub: string; about: string; services: string[]; cta: string };

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
    const t = ai ? await askAi(ai, `Write the text of a one-page website in ${lang === 'ru' ? 'Russian' : lang === 'ua' ? 'Ukrainian' : 'English'}. Use only what is known below. Never invent prices, addresses, phones, reviews, years, awards or numbers. If little is known, keep the text general and short.
Name: ${biz.name}. Field: ${memory.niche || '?'}. Goals: ${memory.goals || '?'}. Project: ${memory.project || '?'}.
Return ONLY JSON: {"title":"name or a short headline","sub":"one line: what the visitor gets","about":"2-3 plain sentences","services":["3-5 short items"],"cta":"button text, 1-3 words"}`, 500) : '';
    const site = cleanSite({ title: biz.name, ...(parse<Record<string, unknown>>(t) ?? {}) }, lang);
    await db.prepare(`UPDATE biz_pages SET kind = 'site', data = ? WHERE biz_id = ?`).bind(JSON.stringify(site), biz.id).run();
    // The site's AI chat answers only from "about", so the page's own text switches it on.
    if (access) await db.prepare(`UPDATE biz SET about = COALESCE(about, ?) WHERE id = ?`).bind([site.about, ...site.services].join('\n') || null, biz.id).run();
  }
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
  const leads = (await db.prepare('SELECT id, at, name, contact, message, source, status FROM biz_leads WHERE biz_id = ? ORDER BY id DESC LIMIT 30').bind(biz.id).all()).results;
  const total = (await db.prepare('SELECT COUNT(*) AS n FROM biz_leads WHERE biz_id = ?').bind(biz.id).first<{ n: number }>())?.n ?? 0;
  const refs = (await db.prepare(`SELECT r.name, r.code,
      (SELECT COUNT(DISTINCT sid) FROM biz_events e WHERE e.biz_id = r.biz_id AND e.type = 'pv' AND e.source = 'ref_' || r.code) AS visits,
      (SELECT COUNT(*) FROM biz_leads l WHERE l.biz_id = r.biz_id AND l.source = 'ref_' || r.code) AS leads
    FROM biz_refs r WHERE r.biz_id = ? ORDER BY r.id`).bind(biz.id).all<{ name: string; code: string; visits: number; leads: number }>()).results;
  return {
    biz: { id: biz.id, name: biz.name },
    crm: access ? { url, total, leads } : null,
    requests: total,
    partner: refs.length ? { links: refs.map((r) => ({ ...r, url: `${url}?utm_source=ref_${r.code}` })) } : null,
    site: biz.kind === 'site' ? { url, ...(JSON.parse(biz.data || '{}') as Site) } : null,
  };
}

function page(s: Site, kind: string, name: string, key: string, slug: string, index: boolean): string {
  const w = WORDS[s.lang] ?? WORDS.en;
  const [bg, ink, card, acc] = TONES[s.tone] ?? TONES.clean;
  const title = s.title || name, site = kind === 'site';
  return `<!doctype html><html lang="${s.lang === 'ua' ? 'uk' : s.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(s.sub || title)}">${index ? '' : '<meta name="robots" content="noindex">'}
<link rel="manifest" href="/s/${slug}/manifest.webmanifest"><meta name="theme-color" content="${bg}">
<style>*{box-sizing:border-box}body{margin:0;background:${bg};color:${ink};font:17px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}main{max-width:680px;margin:0 auto;padding:56px 20px 32px;display:grid;gap:28px}h1{font-size:clamp(32px,7vw,48px);line-height:1.1;margin:0}.sub{font-size:20px;opacity:.8;margin:12px 0 0}p{margin:0}ul{list-style:none;margin:0;padding:0;display:grid;gap:10px}li{background:${card};padding:14px 16px;border-radius:12px;border:1px solid color-mix(in srgb,${ink} 10%,transparent)}form{background:${card};padding:20px;border-radius:16px;border:1px solid color-mix(in srgb,${ink} 10%,transparent);display:grid;gap:10px}h2{font-size:20px;margin:0}input,textarea{font:16px inherit;width:100%;padding:12px 14px;border-radius:10px;border:1px solid color-mix(in srgb,${ink} 20%,transparent);background:transparent;color:inherit}button{font:600 16px inherit;padding:13px;border:0;border-radius:10px;background:${acc};color:#fff;cursor:pointer}.ok{font-weight:600}footer{text-align:center;font-size:13px;opacity:.6;padding:8px 0 28px}footer a{color:inherit}</style></head><body><main>
<header><h1>${esc(title)}</h1>${s.sub ? `<p class="sub">${esc(s.sub)}</p>` : ''}</header>
${site && s.about ? `<p>${esc(s.about)}</p>` : ''}${site && s.services.length ? `<ul>${s.services.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
<form id="f"><h2>${esc(s.cta || w.fill)}</h2><input name="name" maxlength="80" placeholder="${esc(w.name)}" autocomplete="name"><input name="contact" maxlength="120" placeholder="${esc(w.contact)}" required><textarea name="message" rows="3" maxlength="1500" placeholder="${esc(w.msg)}"></textarea><button>${esc(w.send)}</button></form>
</main>${index ? '' : `<footer><a href="https://vaxogroup.com/">${esc(w.made)}</a></footer>`}
<script src="/w.js?k=${key}" async></script><script>document.getElementById('f').onsubmit=function(e){e.preventDefault();var p=document.createElement('p');p.className='ok';p.textContent=${JSON.stringify(w.done).replace(/</g, '\\u003c')};this.replaceChildren(p)}</script></body></html>`;
}

/** /s/<slug> and its manifest: the public side of a deployed module. */
export async function servePage(db: DB, slug: string, manifest: boolean): Promise<Response> {
  const r = await db.prepare('SELECT b.id, b.name, b.key, b.owner_id, p.kind, p.data FROM biz_pages p JOIN biz b ON b.id = p.biz_id WHERE p.slug = ?').bind(slug).first<{ id: number; name: string; key: string; owner_id: number; kind: string; data: string }>().catch(() => null);
  if (!r) return new Response('Not found', { status: 404 });
  const s = JSON.parse(r.data) as Site;
  if (manifest) return new Response(JSON.stringify({ name: s.title || r.name, short_name: (s.title || r.name).slice(0, 12), start_url: `/s/${slug}`, display: 'standalone', background_color: (TONES[s.tone] ?? TONES.clean)[0], icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }] }), { headers: { 'Content-Type': 'application/manifest+json' } });
  // Only paying clients' pages go into search: free pages stay out, so the domain does not fill up with empty ones.
  const paid = await db.prepare(`SELECT 1 FROM leads l JOIN invoices i ON i.lead_id = l.id WHERE l.client_id = ? AND i.status = 'paid' LIMIT 1`).bind(r.owner_id).first().catch(() => null);
  return new Response(page(s, r.kind, r.name, r.key, slug, !!paid), { headers: {
    'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; form-action 'none'; base-uri 'none'",
  } });
}
