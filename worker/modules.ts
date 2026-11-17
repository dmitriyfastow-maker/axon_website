// Modules (Decision 40): one click in the workspace deploys something real in the client's own account, built on the
// owner app (worker/biz.ts). CRM: a public form at /s/<slug> feeding their request board. Partner links: a link per
// partner, whose visits and requests count themselves through the source ref_<code>. Site: the same page as a one-page site.
// The site is free for everyone and carries a "Made on Vaxo" line until the first payment; the rest is Care and above.
// A page holds only escaped text and one fixed form, so nobody can publish scripts or their own forms on our domain.
import { sitePay } from './sitepay.js';
import { askAi, json as parse } from './autopilot.js';
import { buyerRef } from './buyers.js';
import type { AiBinding } from './chat.js';
import type { DB } from './partner.js';
import { editLayer, renderSite, styleOf, STYLES } from './sitekit.js';
import { cleanBook, type Book } from './booking.js';

const hex = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, '0')).join('');
const cut = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const TONES: Record<string, [string, string, string, string]> = { // page, text, card, accent
  clean: ['#f8f9fa', '#111827', '#ffffff', '#2563eb'],
  dark: ['#0d0c0a', '#f4f1ea', '#1a1815', '#e8b04a'],
  warm: ['#fbf4ea', '#2d2118', '#ffffff', '#c2410c'],
};

export type Site = { lang: string; tone: string; title: string; sub: string; about: string; services: string[]; cta: string; ask?: string; img?: string;
  style?: string; color?: string; hero?: string; kicker?: string; accent?: string; details?: string[]; steps?: string[]; faq?: { q: string; a: string }[]; imgs?: string[]; promise?: string; book?: Book };

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

const ID = /^[a-f0-9]{24}$/;
export function cleanSite(x: Record<string, unknown>, lang: string): Site {
  const lines = (v: unknown) => (Array.isArray(v) ? v : String(v ?? '').split('\n'));
  // Services may come as "Name — description" lines from the Canvas editor, or as two lists from the model.
  const raw = lines(x.services).map((s) => (typeof s === 'object' && s ? `${(s as any).t ?? ''} — ${(s as any).d ?? ''}` : String(s)));
  const split = raw.map((l) => l.split(/\s+[—–-]\s+/));
  const services = split.map((p) => cut(p[0], 80)).filter(Boolean).slice(0, 6);
  const given = lines(x.details).map((d) => cut(String(d), 200));
  const details = split.filter((p) => cut(p[0], 80)).slice(0, 6).map((p, i) => cut(p.slice(1).join(' — '), 200) || given[i] || '');
  const faq = (Array.isArray(x.faq) ? x.faq : lines(x.faq).map((l) => { const [q, ...a] = String(l).split(/\s+[—–-]\s+/); return { q, a: a.join(' — ') }; }))
    .map((f: any) => ({ q: cut(f?.q, 140), a: cut(f?.a, 400) })).filter((f) => f.q && f.a).slice(0, 5);
  const steps = lines(x.steps).map((s) => cut(String(s), 90)).filter(Boolean).slice(0, 3);
  const imgs = (Array.isArray(x.imgs) ? x.imgs : [x.img]).map(String).filter((i) => ID.test(i)).slice(0, 3);
  const style = styleOf(cut(x.style, 12) || cut(x.tone, 8));
  return {
    lang: lang in WORDS ? lang : 'en',
    tone: cut(x.tone, 8) in TONES ? cut(x.tone, 8) : 'clean', style,
    title: cut(String(x.title ?? '').replace(/<\/?[a-z][^>]*>/gi, ''), 80), sub: cut(x.sub, 180), about: cut(x.about, 900),
    kicker: cut(x.kicker, 60) || undefined, accent: cut(x.accent, 30) || undefined, color: /^#[0-9a-f]{6}$/i.test(String(x.color || '')) ? String(x.color) : undefined, hero: ['full', 'split', 'center'].includes(String(x.hero)) ? String(x.hero) : undefined, promise: cut(x.promise, 120) || undefined,
    services, details: details.some(Boolean) ? details : undefined, steps: steps.length === 3 ? steps : undefined, faq: faq.length ? faq : undefined,
    cta: cut(x.cta, 40),
    ask: cut(x.ask, 80) || undefined,
    img: imgs[0], imgs: imgs.length ? imgs : undefined,
    book: cleanBook(x.book),
  };
}

/** The business a call works on: the one asked for if it is theirs, otherwise their oldest. */
export async function pickBiz(db: DB, clientId: number, bizId?: number | null) {
  if (bizId) { const b = await db.prepare('SELECT id, name FROM biz WHERE id = ? AND owner_id = ?').bind(bizId, clientId).first<{ id: number; name: string }>(); if (b) return b; }
  return db.prepare('SELECT id, name FROM biz WHERE owner_id = ? ORDER BY id LIMIT 1').bind(clientId).first<{ id: number; name: string }>();
}

async function ensureBiz(db: DB, clientId: number, name: string, lang: string, bizId?: number | null) {
  let b = await pickBiz(db, clientId, bizId);
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
/** Decision 50: every signed-in account gets every module (site, booking, CRM, AI consultant, partners, payments);
 *  the plans differ by volume. Paid-only: own domain, no "Made on Vaxo" line, search indexing, Claude's strong models. */
export async function moduleAccess(_db: DB, clientId: number): Promise<boolean> {
  return clientId > 0;
}

export async function paidAccess(db: DB, clientId: number): Promise<boolean> {
  return !!(await db.prepare(`SELECT 1 FROM leads l WHERE l.client_id = ? AND l.plan IN ('personal', 'care', 'growth', 'pro')
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
  const all = (await db.prepare('SELECT b.id, p.data FROM biz b JOIN biz_pages p ON p.biz_id = b.id WHERE b.owner_id = ?').bind(me.id).all<{ id: number; data: string }>()).results;
  for (const p of all) { const s = JSON.parse(p.data) as Site; await db.prepare(`UPDATE biz SET about = COALESCE(NULLIF(about, ''), ?) WHERE id = ?`).bind([s.about, ...s.services].filter(Boolean).join('\n') || null, p.id).run(); }
  return true;
}

export async function addRef(db: DB, clientId: number, name: string, bizId?: number | null): Promise<boolean> {
  const b = await pickBiz(db, clientId, bizId);
  if (!b || !name) return false;
  const n = await db.prepare('SELECT COUNT(*) AS n FROM biz_refs WHERE biz_id = ?').bind(b.id).first<{ n: number }>();
  if ((n?.n ?? 0) >= 200) return false;
  await db.prepare('INSERT INTO biz_refs (biz_id, code, name) VALUES (?, ?, ?)').bind(b.id, hex(4), name).run();
  return true;
}

/** Partner payouts kept inside biz_refs.name: "name" + "\u2063" + JSON {p}. Plain old names stay plain (no schema change). */
const REF_MARK = '\u2063';
export function unpackRef(raw: string | null): { name: string; paid: number } {
  const s = raw ?? '', i = s.indexOf(REF_MARK);
  if (i < 0) return { name: s, paid: 0 };
  try { const o = JSON.parse(s.slice(i + 1)); return { name: s.slice(0, i), paid: typeof o.p === 'number' && o.p > 0 ? o.p : 0 }; } catch { return { name: s.slice(0, i), paid: 0 }; }
}
export function packRef(name: string, paid: number): string {
  const p = Math.min(Math.max(0, Math.round(paid * 100) / 100), 1e9);
  return p > 0 ? name + REF_MARK + JSON.stringify({ p }) : name;
}
/** The owner marks money paid to one partner (a negative amount corrects a mistake). Returns false if the link is not theirs. */
export async function markRefPaid(db: DB, clientId: number, code: string, add: number, bizId?: number | null): Promise<boolean> {
  const b = await pickBiz(db, clientId, bizId);
  if (!b || !code || !Number.isFinite(add) || add === 0 || Math.abs(add) > 1e7) return false;
  const r = await db.prepare('SELECT id, name FROM biz_refs WHERE biz_id = ? AND code = ?').bind(b.id, code).first<{ id: number; name: string }>();
  if (!r) return false;
  const cur = unpackRef(r.name);
  await db.prepare('UPDATE biz_refs SET name = ? WHERE id = ?').bind(packRef(cur.name, cur.paid + add), r.id).run();
  await db.prepare("CREATE TABLE IF NOT EXISTS biz_ref_pay (id INTEGER PRIMARY KEY AUTOINCREMENT, biz_id INTEGER NOT NULL, code TEXT NOT NULL, amount REAL NOT NULL, at TEXT NOT NULL DEFAULT (datetime('now')))").run().catch(() => {});
  await db.prepare('INSERT INTO biz_ref_pay (biz_id, code, amount) VALUES (?, ?, ?)').bind(b.id, code, Math.round(add * 100) / 100).run().catch(() => {});
  return true;
}

export async function deployModule(db: DB, ai: AiBinding | undefined, clientId: number, kind: string, name: string, lang: string, memory: { niche: string; goals: string; project: string }, access: boolean, bizId?: number | null) {
  const w = WORDS[lang] ?? WORDS.en;
  const biz = await ensureBiz(db, clientId, name || memory.project.slice(0, 60) || memory.niche.slice(0, 60), lang, bizId);
  if (kind === 'partner') {
    const has = await db.prepare('SELECT 1 FROM biz_refs WHERE biz_id = ?').bind(biz.id).first();
    if (!has) await addRef(db, clientId, w.first, biz.id);
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
/** The text of a site from what is known: a wish in the workspace, or the notes Vax keeps. Rich, but never invents facts.
 *  Also chooses the style for the niche and writes three photo prompts (pictures are drawn by worker/images.ts). */
export async function writeSite(ai: AiBinding | undefined, lang: string, known: string, name = ''): Promise<Site & { photos?: string[] }> {
  const L = LANG_NAME[lang] ?? 'English';
  const t = ai ? await askAi(ai, `You are a top web copywriter. Write the content of a premium one-page website in ${L}. Base it ONLY on what is known below.
Rules: never invent prices, addresses, phone numbers, opening hours, years, awards, reviews, client names or statistics. Write confidently about what such a business does and why it is good to choose it, without numbers you do not know. Short sentences, no clichés like "high quality" or "individual approach".
Choose "style" for the niche: editorial (restaurants, coffee, bars, beauty, premium services), clinic (medicine, dental, law, finance, consulting, education), bold (barbers, fitness, sports, tech, auto, events), soft (bakeries, florists, kids, family, crafts, pets), nature (gardening, landscaping, cleaning, eco, farms, wellness, yoga).
${known}
Return ONLY JSON:
{"style":"...","color":"#hex brand colour that fits THIS business and its mood (not a default; two businesses of one niche get different colours)","hero":"full|split|center — the first-screen layout that suits it","title":"business name or a 2-5 word headline","accent":"one word from the title to highlight","kicker":"3-6 words above the title","sub":"one line: what the visitor gets, max 18 words","about":"3 sentences about the business and its approach","services":["4-6 offers, 1-4 words each"],"details":["one sentence describing each offer, same order"],"steps":["3 steps, 3-7 words each: 1 the visitor leaves a request, 2 what THE BUSINESS does next (we prepare / we call / we agree), 3 what the visitor gets"],"faq":[{"q":"a question a visitor would ask","a":"an honest answer without invented facts; if a fact is unknown, say it is agreed in the request"}],"promise":"one strong sentence for a photo banner, max 12 words","cta":"form title, 1-4 words, fits the wish (order, booking, pre-order...)","ask":"hint in the message box, max 8 words","photos":["3 English prompts for realistic photos for this site: 1 the place or product wide shot, 2 the process or people at work from behind or the side, 3 a beautiful detail close-up. No text, no logos, no faces looking at the camera"],"booking":false}
BOOKING: set "booking":true when people come or meet at a set time (barbers, beauty, nails, massage, clinics, dental, fitness and yoga classes, tutors, coaches, consultations, lawyers, auto service, photo studios, car wash, pet grooming); then step 1 is "pick a free time online" and the cta is about booking. For shops, delivery, restaurants without tables, production and B2B set false.
When booking is true also give "slot": usual minutes per visit (15,20,30,45,60,90,120), "qs": [{"q":"question","o":["option","option"]}] — 2 short questions a visitor answers with one tap that help the business prepare (each with 2-4 short options, never asking for contacts, health secrets or money), and "bonus_idea": one small welcome gift for a first visit that such a business often gives (the owner decides whether to use it).
Give exactly 3 faq items. If the business involves sex, drugs, weapons, gambling or anything illegal, return {"block":true}.`, 1600).catch(() => '') : '';
  const j = parse<Record<string, unknown>>(t) ?? {};
  if (j.block) return cleanSite({ title: name }, lang);
  const photos = (Array.isArray(j.photos) ? j.photos : []).map((p) => cut(String(p), 300)).filter(Boolean).slice(0, 3);
  // Hours are never invented: the default week is Mon–Sat 10–20 and the owner sets theirs in the project's Booking tab.
  // If the writer gave no usable questions, one that helps every business: where the client came from.
  const QS: Record<string, { q: string; o: string[] }> = { ru: { q: 'Как вы о нас узнали?', o: ['Instagram', 'Google', 'Друзья', 'Другое'] }, ua: { q: 'Як ви про нас дізналися?', o: ['Instagram', 'Google', 'Друзі', 'Інше'] }, en: { q: 'How did you hear about us?', o: ['Instagram', 'Google', 'Friends', 'Other'] } };
  const qs = cleanBook({ qs: j.qs })?.qs ?? [];
  const book = j.booking === true ? { on: true, days: [1, 2, 3, 4, 5, 6], from: '10:00', to: '20:00', step: Number(j.slot) || 60, cap: 1, qs: qs.length ? qs : [QS[lang] ?? QS.en], idea: j.bonus_idea } : undefined;
  return { ...cleanSite({ title: name, ...j, book }, lang), photos };
}

/** Publish from the Canvas: the site gets this text, created first if there is none yet. */
export async function publishSite(db: DB, clientId: number, x: Record<string, unknown>, lang: string, access: boolean) {
  const site = cleanSite(x, lang);
  const biz = await ensureBiz(db, clientId, site.title.slice(0, 60), site.lang);
  await db.prepare(`UPDATE biz_pages SET kind = 'site', data = ? WHERE biz_id = ?`).bind(JSON.stringify(site), biz.id).run();
  if (access) await db.prepare(`UPDATE biz SET about = COALESCE(NULLIF(about, ''), ?) WHERE id = ?`).bind([site.about, ...site.services].join('\n') || null, biz.id).run();
}

/** The same page for the Canvas preview: no scripts, the form does nothing. */
export const sitePreview = (s: Site, edit?: { ai: string; photo: string; hint: string; more?: string }) => {
  const html = renderSite({ ...s, style: styleOf(s.style || s.tone) }, { key: '', slug: 'preview', index: false, name: s.title || 'Site', edit: !!edit }).replace(/<script(?! data-keep)[\s\S]*?<\/script>/g, '').replace(/<link rel="manifest"[^>]*>/, '');
  return edit ? html.replace('</body>', editLayer(edit) + '</body>') : html;
};

/** A site from the chat goes live at once. The first one becomes the account's main site (the one a domain attaches
 *  to); every next one is an extra page with its own address. All of them send requests to the same CRM. */
export async function liveSite(db: DB, clientId: number, x: Record<string, unknown>, lang: string, access: boolean, bizId?: number | null): Promise<{ slug: string; bizId: number }> {
  const site = cleanSite(x, lang), w = WORDS[site.lang] ?? WORDS.en;
  let biz = bizId ? await pickBiz(db, clientId, bizId) : null;
  if (!biz || biz.id !== bizId) {
    // A new business: its own key, page, CRM, partner link; the site chat switches on with the page's own text (Care).
    biz = await db.prepare('INSERT INTO biz (owner_id, name, key) VALUES (?, ?, ?) RETURNING id, name').bind(clientId, site.title || 'My business', hex(12)).first<{ id: number; name: string }>();
    const slug = slugOf(site.title || 'page');
    await db.prepare(`INSERT INTO biz_pages (biz_id, slug, kind, data) VALUES (?, ?, 'site', ?)`).bind(biz!.id, slug, JSON.stringify(site)).run();
    await addRef(db, clientId, w.first, biz!.id);
    if (access) await db.prepare('UPDATE biz SET about = ? WHERE id = ?').bind([site.title, site.sub, site.about, ...site.services].filter(Boolean).join('\n') || null, biz!.id).run();
    return { slug, bizId: biz!.id };
  }
  const main = await db.prepare('SELECT slug, kind FROM biz_pages WHERE biz_id = ?').bind(biz.id).first<{ slug: string; kind: string }>();
  if (!main || main.kind !== 'site') {
    // The business had only a form so far: this page becomes its main site, with an address from its own title.
    const slug = slugOf(site.title || 'page');
    if (main) await db.prepare(`UPDATE biz_pages SET kind = 'site', data = ?, slug = ? WHERE biz_id = ?`).bind(JSON.stringify(site), slug, biz.id).run();
    else await db.prepare(`INSERT INTO biz_pages (biz_id, slug, kind, data) VALUES (?, ?, 'site', ?)`).bind(biz.id, slug, JSON.stringify(site)).run();
    if (access) await db.prepare(`UPDATE biz SET about = COALESCE(NULLIF(about, ''), ?) WHERE id = ?`).bind([site.title, site.sub, site.about, ...site.services].filter(Boolean).join('\n') || null, biz.id).run();
    return { slug, bizId: biz.id };
  }
  const slug = slugOf(site.title || 'page');
  await db.prepare('INSERT INTO ws_sites (slug, client_id, biz_id, data) VALUES (?, ?, ?, ?)').bind(slug, clientId, biz.id, JSON.stringify(site)).run();
  return { slug, bizId: biz.id };
}

/** Saves edits to one of the person's live pages, main or extra. False if the address is not theirs. */
export async function updateLiveSite(db: DB, clientId: number, slug: string, x: Record<string, unknown>, lang: string): Promise<boolean> {
  const site = JSON.stringify(cleanSite(x, lang));
  const main = await db.prepare(`UPDATE biz_pages SET data = ?, kind = 'site' WHERE slug = ? AND biz_id IN (SELECT id FROM biz WHERE owner_id = ?)`).bind(site, slug, clientId).run();
  if ((main as { meta?: { changes?: number } })?.meta?.changes) return true;
  const extra = await db.prepare('UPDATE ws_sites SET data = ? WHERE slug = ? AND client_id = ?').bind(site, slug, clientId).run();
  return !!(extra as { meta?: { changes?: number } })?.meta?.changes;
}

/** The page a visitor is on (/s/<slug>, main or extra): its own name and facts, so the site chat talks about this page only. */
export async function pageFacts(db: DB, bizId: number, path: string): Promise<{ name: string; facts: string } | null> {
  const slug = path.match(/^\/s\/([a-z0-9-]{3,60})/)?.[1];
  if (!slug) return null;
  const r = (await db.prepare('SELECT data FROM biz_pages WHERE slug = ? AND biz_id = ?').bind(slug, bizId).first<{ data: string }>().catch(() => null))
    ?? (await db.prepare('SELECT data FROM ws_sites WHERE slug = ? AND biz_id = ?').bind(slug, bizId).first<{ data: string }>().catch(() => null));
  if (!r) return null;
  const s = JSON.parse(r.data) as Site;
  const bk = s.book?.on ? `Online booking on this page: visitors pick a free time themselves (working days ${s.book.days.join(',')} where 1 is Monday, ${s.book.from}–${s.book.to})${s.book.bonus ? `; first visit gift: ${s.book.bonus}` : ''}` : '';
  return { name: s.title, facts: [s.title, s.sub, s.about, s.services.length ? `Offer: ${s.services.join('; ')}` : '', s.details?.filter(Boolean).join(' '), ...(s.faq ?? []).map((f) => `${f.q} ${f.a}`), bk].filter(Boolean).join('. ') };
}

export async function saveSite(db: DB, clientId: number, b: Record<string, unknown>, bizId?: number | null) {
  const pk = await pickBiz(db, clientId, bizId);
  const biz = pk ? await db.prepare('SELECT b.id, p.data FROM biz b JOIN biz_pages p ON p.biz_id = b.id WHERE b.id = ?').bind(pk.id).first<{ id: number; data: string }>() : null;
  if (!biz) return;
  const old = JSON.parse(biz.data) as Site;
  await db.prepare(`UPDATE biz_pages SET data = ? WHERE biz_id = ?`).bind(JSON.stringify(cleanSite({ ...old, ...b }, old.lang)), biz.id).run();
}

export async function modulesState(db: DB, clientId: number, origin: string, access: boolean, bizId?: number | null) {
  const pk = await pickBiz(db, clientId, bizId);
  const biz = pk ? await db.prepare('SELECT b.id, b.name, b.about, p.slug, p.kind, p.data FROM biz b LEFT JOIN biz_pages p ON p.biz_id = b.id WHERE b.id = ?').bind(pk.id).first<{ id: number; name: string; about: string | null; slug: string | null; kind: string | null; data: string | null }>() : null;
  if (!biz?.slug) return { crm: null, partner: null, site: null, biz: biz ? { id: biz.id, name: biz.name } : null };
  const url = `${origin}/s/${biz.slug}`;
  const leads = (await db.prepare('SELECT id, at, name, contact, message, source, path, status FROM biz_leads WHERE biz_id = ? ORDER BY id DESC LIMIT 30').bind(biz.id).all()).results;
  const total = (await db.prepare('SELECT COUNT(*) AS n FROM biz_leads WHERE biz_id = ?').bind(biz.id).first<{ n: number }>())?.n ?? 0;
  const refs = (await db.prepare(`SELECT r.name, r.code,
      (SELECT COUNT(DISTINCT sid) FROM biz_events e WHERE e.biz_id = r.biz_id AND e.type = 'pv' AND e.source = 'ref_' || r.code) AS visits,
      (SELECT COUNT(*) FROM biz_leads l WHERE l.biz_id = r.biz_id AND l.source = 'ref_' || r.code) AS leads,
      (SELECT COUNT(*) FROM biz_leads l WHERE l.biz_id = r.biz_id AND l.source = 'ref_' || r.code AND l.status = 'won') AS won
    FROM biz_refs r WHERE r.biz_id = ? ORDER BY r.id`).bind(biz.id).all<{ name: string; code: string; visits: number; leads: number; won: number }>()).results;
  // What each partner earned: the reward % × the amounts of their won deals (amounts live in the lead's note).
  const refRate = Number((await db.prepare('SELECT value FROM settings WHERE key = ?').bind('biz_ref_rate_' + biz.id).first<{ value: string }>().catch(() => null))?.value ?? 10);
  const earnedBy: Record<string, number> = {};
  if (refs.length) {
    const { unpackNote } = await import('./biz.js');
    const won = (await db.prepare("SELECT source, note FROM biz_leads WHERE biz_id = ? AND status = 'won' AND source LIKE 'ref_%'").bind(biz.id).all<{ source: string; note: string | null }>().catch(() => ({ results: [] }))).results;
    for (const x of won) { const c = x.source.slice(4); earnedBy[c] = Math.round(((earnedBy[c] || 0) + (unpackNote(x.note).amount || 0) * refRate / 100) * 100) / 100; }
  }
  const extra = (await db.prepare('SELECT slug, data FROM ws_sites WHERE client_id = ? AND biz_id = ? ORDER BY at DESC LIMIT 20').bind(clientId, biz.id).all<{ slug: string; data: string }>().catch(() => ({ results: [] }))).results;
  const pages = [...extra.map((p) => ({ ...(JSON.parse(p.data) as Site), slug: p.slug, url: `${origin}/s/${p.slug}` })), ...(biz.kind === 'site' ? [{ ...(JSON.parse(biz.data || '{}') as Site), slug: biz.slug, url, main: true }] : [])];
  const pub = (await db.prepare('SELECT value FROM settings WHERE key = ?').bind('biz_partner_public_' + biz.id).first<{ value: string }>().catch(() => null))?.value !== '0';
  return {
    biz: { id: biz.id, name: biz.name },
    pub,
    bot: { on: !!(access && biz.about), about: biz.about || '' },
    pages,
    crm: access ? { url, total, leads } : null,
    requests: total,
    partner: refs.length ? { rate: refRate, links: refs.map((r) => ({ ...r, ...unpackRef(r.name), earned: earnedBy[r.code] || 0, url: `${url}?utm_source=ref_${r.code}`, page: `${origin}/rp/${r.code}` })) } : null,
    site: biz.kind === 'site' ? { url, slug: biz.slug, ...(JSON.parse(biz.data || '{}') as Site) } : null,
  };
}

const STEPS: Record<string, [string, string, string, string, string, string]> = {
  en: ['What you get', 'About us', 'How it works', 'Leave a request', 'We get back to you and agree the details', 'You get the result', ],
  ru: ['Что вы получите', 'О нас', 'Как это работает', 'Оставьте заявку', 'Мы свяжемся и уточним детали', 'Вы получаете результат'],
  ua: ['Що ви отримаєте', 'Про нас', 'Як це працює', 'Залиште заявку', 'Ми звʼяжемося й уточнимо деталі', 'Ви отримуєте результат'],
};
const ICON = ['M5 12.5 9.5 17 19 7.5', 'M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.6 6.7 19.4l1.2-6L3.4 9.3l6-.7z', 'M12 21s-7-4.5-7-11a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 6.5-7 11-7 11z', 'M4 12h16M12 4v16', 'M3 12h4l3 7 4-14 3 7h4', 'M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4'];

/** The public page of a site or form: the site kit (worker/sitekit.ts). */
function page(s: Site, kind: string, name: string, key: string, slug: string, index: boolean, url?: string): string {
  return renderSite({ ...s, style: styleOf(s.style || s.tone), services: kind === 'site' ? s.services : [], about: kind === 'site' ? s.about : '' }, { key, slug, index, name, url });
}

/** /s/<slug> and its manifest: the public side of a deployed module. */
export async function servePage(db: DB, slug: string, manifest: boolean): Promise<Response> {
  const r = (await db.prepare('SELECT b.id, b.name, b.key, b.owner_id, p.kind, p.data FROM biz_pages p JOIN biz b ON b.id = p.biz_id WHERE p.slug = ?').bind(slug).first<{ id: number; name: string; key: string; owner_id: number; kind: string; data: string }>().catch(() => null))
    ?? (await db.prepare(`SELECT b.id, b.name, b.key, b.owner_id, 'site' AS kind, s.data FROM ws_sites s JOIN biz b ON b.id = s.biz_id WHERE s.slug = ?`).bind(slug).first<{ id: number; name: string; key: string; owner_id: number; kind: string; data: string }>().catch(() => null));
  if (!r) {
    // A page renamed to its own title keeps working at its old address.
    const al = await db.prepare('SELECT value FROM settings WHERE key = ?').bind('slug_alias_' + slug).first<{ value: string }>().catch(() => null);
    return al ? Response.redirect(`https://vaxogroup.com/s/${al.value}${manifest ? '/manifest.webmanifest' : ''}`, 301) : new Response('Not found', { status: 404 });
  }
  const s = JSON.parse(r.data) as Site;
  if (s.book?.on && !manifest) { const pay = await sitePay(db, r.id).catch(() => null); if (pay) s.book = { ...s.book, pay }; }
  if (manifest) return new Response(JSON.stringify({ name: s.title || r.name, short_name: (s.title || r.name).slice(0, 12), start_url: `/s/${slug}`, display: 'standalone', background_color: (TONES[s.tone] ?? TONES.clean)[0], icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }] }), { headers: { 'Content-Type': 'application/manifest+json' } });
  // Only paying clients' pages go into search: free pages stay out, so the domain does not fill up with empty ones.
  const paid = await db.prepare(`SELECT 1 FROM leads l JOIN invoices i ON i.lead_id = l.id WHERE l.client_id = ? AND i.status = 'paid' LIMIT 1`).bind(r.owner_id).first().catch(() => null);
  // A working own domain is the page's real address (canonical), so search engines do not see two copies.
  const dom = await db.prepare(`SELECT host FROM biz_domains WHERE biz_id = ? AND status = 'active' LIMIT 1`).bind(r.id).first<{ host: string }>().catch(() => null);
  return new Response(page(s, r.kind, r.name, r.key, slug, !!paid, dom ? `https://${dom.host}/` : undefined), { headers: {
    'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Frame-Options': 'DENY',
    'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https://vaxogroup.com; font-src https://fonts.gstatic.com; connect-src 'self'; form-action 'none'; base-uri 'none'",
  } });
}

// A client's partner sees their own results by a private link: no login, no names or contacts of leads — only counts and dates.
const PW: Record<string, Record<string, string>> = {
  en: { pays: 'Payments to you', earned: 'Earned', due: 'To be paid', rate: 'Your reward', rateOf: 'of every deal', h: 'Your partner page', for: 'Partner of', link: 'Your personal link', copy: 'Copy', copied: 'Copied', v: 'Visits', l: 'Requests', w: 'Deals', lv: 'Level', lvs: 'Start|Silver|Gold', next: 'To the next level', recent: 'Latest requests from your link', none: 'No requests yet. Share your link with friends and clients — every request is counted for you.', st: 'New|In progress|Deal|Closed', how: 'Rewards are agreed with the owner of the business. This page updates by itself.', by: 'Runs on Vaxo', paid: 'Paid to you' },
  ru: { pays: 'Выплаты вам', earned: 'Заработано', due: 'К выплате', rate: 'Ваше вознаграждение', rateOf: 'с каждой сделки', h: 'Ваша страница партнёра', for: 'Партнёр', link: 'Ваша личная ссылка', copy: 'Скопировать', copied: 'Скопировано', v: 'Переходы', l: 'Заявки', w: 'Сделки', lv: 'Уровень', lvs: 'Старт|Серебро|Золото', next: 'До следующего уровня', recent: 'Последние заявки по вашей ссылке', none: 'Заявок пока нет. Делитесь ссылкой с друзьями и клиентами — каждая заявка засчитывается вам.', st: 'Новая|В работе|Сделка|Закрыта', how: 'Награду вы обсуждаете с владельцем бизнеса. Страница обновляется сама.', by: 'Работает на Vaxo', paid: 'Вам выплачено' },
  ua: { pays: 'Виплати вам', earned: 'Зароблено', due: 'До виплати', rate: 'Ваша винагорода', rateOf: 'з кожної угоди', h: 'Ваша сторінка партнера', for: 'Партнер', link: 'Ваше особисте посилання', copy: 'Скопіювати', copied: 'Скопійовано', v: 'Переходи', l: 'Заявки', w: 'Угоди', lv: 'Рівень', lvs: 'Старт|Срібло|Золото', next: 'До наступного рівня', recent: 'Останні заявки за вашим посиланням', none: 'Заявок поки немає. Діліться посиланням з друзями та клієнтами — кожна заявка зараховується вам.', st: 'Нова|В роботі|Угода|Закрита', how: 'Винагороду ви обговорюєте з власником бізнесу. Сторінка оновлюється сама.', by: 'Працює на Vaxo', paid: 'Вам виплачено' },
};
export async function servePartner(db: DB, code: string, origin: string): Promise<Response> {
  const r = await db.prepare(`SELECT r.name, r.code, b.id, b.name AS biz, p.slug, p.data FROM biz_refs r JOIN biz b ON b.id = r.biz_id LEFT JOIN biz_pages p ON p.biz_id = b.id WHERE r.code = ?`).bind(code).first<{ name: string; code: string; id: number; biz: string; slug: string | null; data: string | null }>().catch(() => null);
  if (!r?.slug) return new Response('Not found', { status: 404 });
  const rp = unpackRef(r.name); r.name = rp.name;
  let lang = 'en'; try { lang = (JSON.parse(r.data || '{}') as Site).lang || 'en'; } catch {}
  const t = PW[lang] ?? PW.en, src = 'ref_' + r.code;
  const c = await db.prepare(`SELECT
      (SELECT COUNT(DISTINCT sid) FROM biz_events WHERE biz_id = ?1 AND type = 'pv' AND source = ?2) AS v,
      (SELECT COUNT(*) FROM biz_leads WHERE biz_id = ?1 AND source = ?2) AS l,
      (SELECT COUNT(*) FROM biz_leads WHERE biz_id = ?1 AND source = ?2 AND status = 'won') AS w`).bind(r.id, src).first<{ v: number; l: number; w: number }>().catch(() => null) ?? { v: 0, l: 0, w: 0 };
  const rows = (await db.prepare('SELECT at, status FROM biz_leads WHERE biz_id = ? AND source = ? ORDER BY id DESC LIMIT 10').bind(r.id, src).all<{ at: string; status: string | null }>().catch(() => ({ results: [] }))).results;
  // The owner's reward rate (Settings in the CRM, default 10%) × the amounts of the deals this partner brought.
  const rate = Number((await db.prepare('SELECT value FROM settings WHERE key = ?').bind('biz_ref_rate_' + r.id).first<{ value: string }>().catch(() => null))?.value ?? 10);
  const wonNotes = (await db.prepare("SELECT note FROM biz_leads WHERE biz_id = ? AND source = ? AND status = 'won'").bind(r.id, src).all<{ note: string | null }>().catch(() => ({ results: [] }))).results;
  const { unpackNote } = await import('./biz.js');
  const earned = Math.round(wonNotes.reduce((s0, x) => s0 + (unpackNote(x.note).amount || 0), 0) * rate) / 100;
  const due = Math.max(0, Math.round((earned - rp.paid) * 100) / 100);
  const pays = (await db.prepare('SELECT at, amount FROM biz_ref_pay WHERE biz_id = ? AND code = ? ORDER BY id DESC LIMIT 12').bind(r.id, r.code).all<{ at: string; amount: number }>().catch(() => ({ results: [] }))).results;
  const lv = c.w >= 10 ? 2 : c.w >= 3 ? 1 : 0, need = lv === 0 ? 3 - c.w : lv === 1 ? 10 - c.w : 0, lvs = t.lvs.split('|'), sts = t.st.split('|');
  const stOf = (s: string | null) => sts[s === 'won' ? 2 : s === 'work' || s === 'contacted' ? 1 : s === 'lost' || s === 'closed' ? 3 : 0];
  const url = `${origin}/s/${r.slug}?utm_source=${src}`;
  // Decision 63: the partner's page wears the business's own style and photo, and makes sharing one tap.
  let sd: { style?: string; accent?: string; imgs?: string[]; img?: string } = {}; try { sd = JSON.parse(r.data || '{}'); } catch {}
  const st = STYLES[styleOf(sd.style)], acc = /^#[0-9a-f]{6}$/i.test(String(sd.accent || '')) ? String(sd.accent) : st.acc;
  const ph = [sd.imgs?.[0], sd.img].find((x) => x && /^[a-f0-9]{24}$/.test(x));
  const shareTxt = encodeURIComponent(`${r.biz}: ${url}`);
  const html = `<!doctype html><html lang="${lang === 'ua' ? 'uk' : lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(t.h)} · ${esc(r.biz)}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${st.fonts}&display=swap"><style>:root{--bg:${st.bg};--card:${st.card};--ink:${st.ink};--mut:${st.mut};--line:${st.line};--acc:${acc};--accInk:${st.accInk}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 ${st.body}}main{max-width:680px;margin:0 auto;padding:0 16px 48px}
.top{margin:0 -16px 8px;padding:56px 22px 26px;color:#fff;background:#111 center/cover;position:relative;border-radius:0 0 22px 22px;overflow:hidden}.top:before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.2),rgba(0,0,0,.78))}.top>*{position:relative}.top .mut{color:rgba(255,255,255,.85)}.share{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.share a{flex:1;min-width:120px;text-align:center;padding:11px;border-radius:999px;border:1px solid var(--line);text-decoration:none;color:var(--ink);font-weight:600}
h1{font:700 clamp(28px,6vw,40px)/1.1 ${st.head};margin:6px 0 6px;letter-spacing:-.01em}.mut{color:var(--mut)}.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:18px;margin-top:16px}
.row{display:flex;gap:8px}.row input{flex:1;min-width:0;padding:12px;border:1px solid var(--line);border-radius:10px;background:var(--bg);color:var(--ink);font:inherit}
button{min-height:44px;padding:0 18px;border:0;border-radius:999px;background:var(--acc);color:var(--accInk);font:inherit;font-weight:600;cursor:pointer}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;text-align:center}.stats b{display:block;font-size:28px}.bar{height:8px;background:var(--line);border-radius:8px;overflow:hidden;margin-top:8px}.bar i{display:block;height:100%;background:var(--acc)}
ul{list-style:none;margin:0;padding:0}li{display:flex;justify-content:space-between;padding:10px 0;border-top:1px solid var(--line)}li:first-child{border-top:0}small{font-size:13px}a{color:var(--acc)}</style></head><body><main>
<div class="top"${ph ? ` style="background-image:url(/i/${ph}.jpg)"` : ` style="background:linear-gradient(135deg,${acc},#111)"`}><p class="mut">${esc(t.for)} · <b>${esc(r.biz)}</b></p><h1>${esc(t.h)}</h1><p class="mut">${esc(r.name)} · ${esc(t.rate)}: <b>${rate}%</b> ${esc(t.rateOf)}</p></div>
<div class="card stats"><div><b>${earned}</b><small class="mut">${esc(t.earned)}</small></div><div><b>${rp.paid}</b><small class="mut">${esc(t.paid)}</small></div><div><b>${due}</b><small class="mut">${esc(t.due)}</small></div></div>
${pays.length ? `<div class="card"><p style="margin:0 0 8px"><b>${esc(t.pays)}</b></p><ul>${pays.map((x) => `<li><span>${esc(String(x.at).slice(0, 10))}</span><b>${x.amount}</b></li>`).join('')}</ul></div>` : ''}
<div class="card"><p style="margin:0 0 8px"><b>${esc(t.link)}</b></p><div class="row"><input readonly value="${esc(url)}" aria-label="${esc(t.link)}"><button id="cp">${esc(t.copy)}</button></div><div class="share"><a href="https://t.me/share/url?url=${encodeURIComponent(url)}" target="_blank" rel="noopener">Telegram</a><a href="https://wa.me/?text=${shareTxt}" target="_blank" rel="noopener">WhatsApp</a><a href="viber://forward?text=${shareTxt}">Viber</a></div></div>
<div class="card stats"><div><b>${c.v}</b><small class="mut">${esc(t.v)}</small></div><div><b>${c.l}</b><small class="mut">${esc(t.l)}</small></div><div><b>${c.w}</b><small class="mut">${esc(t.w)}</small></div></div>
<div class="card"><b>${esc(t.lv)}: ${esc(lvs[lv])}</b>${need ? `<p class="mut" style="margin:4px 0 0">${esc(t.next)}: ${need} · ${esc(t.w).toLowerCase()}</p><div class="bar"><i style="width:${Math.round((c.w / (lv === 0 ? 3 : 10)) * 100)}%"></i></div>` : ''}</div>
<div class="card"><p style="margin:0 0 8px"><b>${esc(t.recent)}</b></p>${rows.length ? `<ul>${rows.map((x) => `<li><span>${esc(String(x.at).slice(0, 10))}</span><span class="mut">${esc(stOf(x.status))}</span></li>`).join('')}</ul>` : `<p class="mut" style="margin:0">${esc(t.none)}</p>`}</div>
<p class="mut" style="margin-top:16px"><small>${esc(t.how)}</small></p><p class="mut"><small><a href="${origin}/">${esc(t.by)}</a></small></p>
<script>document.getElementById('cp').onclick=async function(){var i=document.querySelector('input');try{await navigator.clipboard.writeText(i.value)}catch(e){i.select();document.execCommand('copy')}this.textContent=${JSON.stringify(t.copied)};var b=this;setTimeout(function(){b.textContent=${JSON.stringify(t.copy)}},1500)}</script>
</main></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer' } });
}

/** «Become a partner» of a client's business (15.11): a person leaves a name and a contact, gets a private page and a link
 *  at once; the owner sees the new partner in the CRM as a request with the source «partner». */
const PJ: Record<string, Record<string, string>> = {
  en: { h: 'Become a partner of', p: 'Recommend us to friends and clients and get a reward for every deal. Your personal link and your results are on a private page.', name: 'Your name', contact: 'Phone, Telegram or email', go: 'Get my link', adult: 'I am 18 or older', err: 'Fill in the name and the contact.' },
  ru: { h: 'Станьте партнёром', p: 'Рекомендуйте нас друзьям и клиентам и получайте вознаграждение за каждую сделку. Ваша личная ссылка и результаты — на личной странице.', name: 'Ваше имя', contact: 'Телефон, Telegram или почта', go: 'Получить ссылку', adult: 'Мне есть 18 лет', err: 'Заполните имя и контакт.' },
  ua: { h: 'Станьте партнером', p: 'Рекомендуйте нас друзям і клієнтам та отримуйте винагороду за кожну угоду. Ваше особисте посилання й результати — на особистій сторінці.', name: 'Ваше імʼя', contact: 'Телефон, Telegram або пошта', go: 'Отримати посилання', adult: 'Мені є 18 років', err: 'Заповніть імʼя й контакт.' },
};
const PJX: Record<string, Record<string, unknown>> = {
  ru: { h1a: 'Рекомендуйте нас и получайте', h1b: 'с каждой оплаты', bigLive: 'ссылка работает всегда', howT: 'Три шага до первого вознаграждения', calcT: 'Посчитайте свой доход', year: 'в год', whoT: 'Кто уже может зарабатывать с нами', svc: 'Что вы рекомендуете:', getT: 'Всё прозрачно и под рукой', rulesT: 'Честно для всех', joinP: 'Имя и контакт — и через секунду у вас личная ссылка и страница с результатами.', title: 'Партнёрская программа «{b}» — {r}% с каждой оплаты', kicker: 'Партнёрская программа', h1: 'Рекомендуйте «{b}» и получайте {r}% с каждой оплаты', sub: 'Делитесь своей ссылкой с друзьями, подписчиками и клиентами. Каждый, кто придёт по ней и оплатит, приносит вам вознаграждение.', cta: 'Получить мою ссылку', bigRate: 'с каждой оплаты клиента', bigFree: 'стоит участие', bigAge: 'только совершеннолетние', howH: 'Как это работает', how: [['Получите ссылку', 'Имя и контакт — и через секунду у вас личная ссылка и страница с результатами.'], ['Поделитесь', 'В сторис, в чате, в группе, лично. Переходы и заявки по ссылке считаются сами.'], ['Получайте {r}%', 'Клиент пришёл и оплатил — вам {r}% с его оплаты. Всё видно на вашей странице.']], calcH: 'Сколько можно заработать', calcN: 'Клиентов в месяц:', calcC: 'Средний чек', calcOut: 'Ваш доход', calcNote: 'Пример расчёта, не обещание дохода.', month: 'мес', whoH: 'Кому подходит', groups: ['Постоянные клиенты', 'Блогеры', 'Соседние бизнесы', 'Друзья и знакомые'], getH: 'Что вы получаете', get: [['Личная ссылка', 'Своя ссылка и страница: переходы, заявки, сделки и сумма к выплате.'], ['Честный учёт', 'Каждая заявка по вашей ссылке закрепляется за вами.'], ['Выплаты от «{b}»', 'Вознаграждение выплачивает сам бизнес после оплаты клиента.']], rulesH: 'Правила', rules: ['Только 18+.', 'Честная рекомендация: без спама, фейковых отзывов и обмана.', 'Вознаграждение — за клиентов, которые оплатили.', 'Сроки и способ выплаты согласуете с «{b}».'], faqH: 'Вопросы', faq: [['Это бесплатно?', 'Да. Участие ничего не стоит.'], ['Как узнать, что клиент пришёл от меня?', 'По вашей ссылке: переходы и заявки видны на вашей личной странице.'], ['Когда выплата?', 'После оплаты клиента. Точные сроки и способ — у «{b}».'], ['Сколько клиентов можно привести?', 'Сколько угодно — вознаграждение за каждого.']], joinH: 'Станьте партнёром' },
  ua: { h1a: 'Рекомендуйте нас і отримуйте', h1b: 'з кожної оплати', bigLive: 'посилання працює завжди', howT: 'Три кроки до першої винагороди', calcT: 'Порахуйте свій дохід', year: 'на рік', whoT: 'Хто вже може заробляти з нами', svc: 'Що ви рекомендуєте:', getT: 'Усе прозоро й під рукою', rulesT: 'Чесно для всіх', joinP: 'Імʼя й контакт — і за секунду у вас особисте посилання та сторінка з результатами.', title: 'Партнерська програма «{b}» — {r}% з кожної оплати', kicker: 'Партнерська програма', h1: 'Рекомендуйте «{b}» та отримуйте {r}% з кожної оплати', sub: 'Діліться своїм посиланням із друзями, підписниками й клієнтами. Кожен, хто прийде за ним і оплатить, приносить вам винагороду.', cta: 'Отримати моє посилання', bigRate: 'з кожної оплати клієнта', bigFree: 'коштує участь', bigAge: 'лише повнолітні', howH: 'Як це працює', how: [['Отримайте посилання', 'Імʼя й контакт — і за секунду у вас особисте посилання та сторінка з результатами.'], ['Поділіться', 'У сторіс, у чаті, у групі, особисто. Переходи й заявки за посиланням рахуються самі.'], ['Отримуйте {r}%', 'Клієнт прийшов і оплатив — вам {r}% з його оплати. Усе видно на вашій сторінці.']], calcH: 'Скільки можна заробити', calcN: 'Клієнтів на місяць:', calcC: 'Середній чек', calcOut: 'Ваш дохід', calcNote: 'Приклад розрахунку, не обіцянка доходу.', month: 'міс', whoH: 'Кому підходить', groups: ['Постійні клієнти', 'Блогери', 'Сусідні бізнеси', 'Друзі й знайомі'], getH: 'Що ви отримуєте', get: [['Особисте посилання', 'Своє посилання й сторінка: переходи, заявки, угоди й сума до виплати.'], ['Чесний облік', 'Кожна заявка за вашим посиланням закріплюється за вами.'], ['Виплати від «{b}»', 'Винагороду виплачує сам бізнес після оплати клієнта.']], rulesH: 'Правила', rules: ['Лише 18+.', 'Чесна рекомендація: без спаму, фейкових відгуків і обману.', 'Винагорода — за клієнтів, які оплатили.', 'Строки й спосіб виплати погоджуєте з «{b}».'], faqH: 'Питання', faq: [['Це безкоштовно?', 'Так. Участь нічого не коштує.'], ['Як дізнатися, що клієнт прийшов від мене?', 'За вашим посиланням: переходи й заявки видно на вашій особистій сторінці.'], ['Коли виплата?', 'Після оплати клієнта. Точні строки й спосіб — у «{b}».'], ['Скільки клієнтів можна привести?', 'Скільки завгодно — винагорода за кожного.']], joinH: 'Станьте партнером' },
  en: { h1a: 'Recommend us and earn', h1b: 'of every payment', bigLive: 'your link works around the clock', howT: 'Three steps to your first reward', calcT: 'Count your income', year: 'a year', whoT: 'Who can earn with us already', svc: 'What you recommend:', getT: 'Transparent and at hand', rulesT: 'Fair for everyone', joinP: 'Your name and a contact, and in a second you have a personal link and a results page.', title: '{b} partner programme: {r}% of every payment', kicker: 'Partner programme', h1: 'Recommend {b} and earn {r}% of every payment', sub: 'Share your link with friends, followers and clients. Everyone who comes by it and pays brings you a reward.', cta: 'Get my link', bigRate: 'of every client payment', bigFree: 'to join', bigAge: 'adults only', howH: 'How it works', how: [['Get your link', 'Your name and a contact, and in a second you have a personal link and a results page.'], ['Share it', 'In stories, chats, groups, in person. Visits and requests by your link are counted by themselves.'], ['Earn {r}%', 'A client comes and pays, and you get {r}% of the payment. All of it is on your page.']], calcH: 'What you can earn', calcN: 'Clients a month:', calcC: 'Average order', calcOut: 'Your income', calcNote: 'An example, not a promise of income.', month: 'mo', whoH: 'Who it suits', groups: ['Regular clients', 'Bloggers', 'Nearby businesses', 'Friends'], getH: 'What you get', get: [['A personal link', 'Your own link and page: visits, requests, deals and what you are owed.'], ['Fair tracking', 'Every request by your link is credited to you.'], ['Payouts from {b}', 'The business itself pays the reward after the client pays.']], rulesH: 'Rules', rules: ['18+ only.', 'Honest recommendations: no spam, fake reviews or tricks.', 'Rewards are for clients who paid.', 'Payout timing and method are agreed with {b}.'], faqH: 'Questions', faq: [['Is it free?', 'Yes. Joining costs nothing.'], ['How do I know a client came from me?', 'By your link: visits and requests show on your personal page.'], ['When is the payout?', 'After the client pays. Exact timing and method are with {b}.'], ['How many clients can I bring?', 'As many as you like, a reward for each.']], joinH: 'Become a partner' },
};
export async function servePartnerJoin(db: DB, slug: string, request: Request, origin: string): Promise<Response> {
  const b = (await db.prepare('SELECT b.id, b.name, p.data FROM biz_pages p JOIN biz b ON b.id = p.biz_id WHERE p.slug = ?').bind(slug).first<{ id: number; name: string; data: string | null }>())
    ?? (await db.prepare('SELECT b.id, b.name, s.data FROM ws_sites s JOIN biz b ON b.id = s.biz_id WHERE s.slug = ?').bind(slug).first<{ id: number; name: string; data: string | null }>().catch(() => null));
  if (!b) return new Response('Not found', { status: 404 });
  let lang = 'en'; try { lang = (JSON.parse(b.data || '{}') as Site).lang || 'en'; } catch {}
  const t = PJ[lang] ?? PJ.en;
  // Decision 63: the owner can hide the public programme page (in the «Partners» tab or by asking Vax).
  if ((await db.prepare('SELECT value FROM settings WHERE key = ?').bind('biz_partner_public_' + b.id).first<{ value: string }>().catch(() => null))?.value === '0')
    return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(b.name)}</title><body style="font:17px/1.5 system-ui;display:grid;place-items:center;min-height:90vh;margin:0;padding:20px;text-align:center"><div><h1 style="margin:0 0 8px">${esc(b.name)}</h1><p>${lang === 'ru' ? 'Партнёрская программа сейчас закрыта.' : lang === 'ua' ? 'Партнерська програма зараз закрита.' : 'The partner programme is closed right now.'}</p><p><a href="${origin}/s/${esc(slug)}">← ${esc(b.name)}</a></p></div></body>`, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
  if (request.method === 'POST') {
    const f = await request.formData().catch(() => null);
    const name = String(f?.get('name') || '').trim().slice(0, 60), contact = String(f?.get('contact') || '').trim().slice(0, 120);
    if (!name || !contact || f?.get('adult') !== 'on') return new Response(t.err, { status: 400 });
    const n = await db.prepare('SELECT COUNT(*) AS n FROM biz_refs WHERE biz_id = ?').bind(b.id).first<{ n: number }>();
    if ((n?.n ?? 0) >= 500) return new Response('Limit', { status: 429 });
    const code = [...crypto.getRandomValues(new Uint8Array(4))].map((x) => x.toString(16).padStart(2, '0')).join('');
    await db.prepare('INSERT INTO biz_refs (biz_id, code, name) VALUES (?, ?, ?)').bind(b.id, code, name).run();
    await db.prepare("INSERT INTO biz_leads (biz_id, name, contact, message, source) VALUES (?, ?, ?, ?, 'partner')").bind(b.id, name, contact, `New partner · ${origin}/rp/${code}`).run();
    return Response.redirect(`${origin}/rp/${code}`, 303);
  }
  // Decision 61/63 (17.11): the public partner programme of the client's business, dressed in the business's own site
  // style (fonts, colours, photos), so it reads as part of their brand: hero with their photo, the reward, how it works,
  // an earnings calculator, who it suits, what partners get, rules, questions, sign-up.
  let site: Partial<Site> & { accent?: string; imgs?: string[] } = {}; try { site = JSON.parse(b.data || '{}'); } catch {}
  const rate = Number((await db.prepare('SELECT value FROM settings WHERE key = ?').bind('biz_ref_rate_' + b.id).first<{ value: string }>().catch(() => null))?.value ?? 10);
  const st = STYLES[styleOf((site as { style?: string }).style)];
  const acc = /^#[0-9a-f]{6}$/i.test(String(site.accent || '')) ? String(site.accent) : st.acc;
  const photo = (id?: string) => (id && /^[a-f0-9]{24}$/.test(id) ? `/i/${id}.jpg` : '');
  const hero = photo(site.imgs?.[0] || (site as { img?: string }).img), side = photo(site.imgs?.[1]);
  const L = (PJX[lang] ?? PJX.en) as Record<string, any>;
  const partners = (n => n)(((await db.prepare('SELECT name FROM biz_refs WHERE biz_id = ? ORDER BY id LIMIT 40').bind(b.id).all<{ name: string }>().catch(() => ({ results: [] }))).results || []).map((r) => unpackRef(r.name).name));
  const own = partners.filter((n) => n && n.length <= 30 && !/\d/.test(n) && /^[A-ZА-ЯЁІЇЄҐ]/.test(n));
  const groups = (own.length >= 2 ? own : L.groups).slice(0, 6) as string[];
  const svc = (site.services || []).slice(0, 4);
  const r = (x: string) => esc(x).replace(/\{r\}/g, String(rate)).replace(/\{b\}/g, esc(b.name));
  const html = `<!doctype html><html lang="${lang === 'ua' ? 'uk' : lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${r(L.title)}</title><meta name="description" content="${r(L.sub)}">
<meta property="og:title" content="${r(L.title)}"><meta property="og:description" content="${r(L.sub)}">${hero ? `<meta property="og:image" content="${origin}${hero}">` : ''}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${st.fonts}&display=swap">
<style>:root{--bg:${st.bg};--ink:${st.ink};--mut:${st.mut};--card:${st.card};--line:${st.line};--acc:${acc};--accInk:${st.accInk};--r:${st.radius}px;--head:${st.head};--body:${st.body}}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.6 var(--body)}
.w{max-width:1120px;margin:0 auto;padding:0 max(20px,env(safe-area-inset-left))}h1,h2,h3{font-family:var(--head);letter-spacing:-.015em;line-height:1.08;margin:0}
.hero{position:relative;min-height:min(86vh,760px);display:grid;align-items:end;color:#fff;overflow:hidden;background:#111}.hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform:scale(1.04);animation:kb 18s ease-out both}.hero:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.15) 0%,rgba(0,0,0,.35) 45%,rgba(0,0,0,.82) 100%)}
${hero ? '' : '.hero{background:radial-gradient(1200px 600px at 20% 10%,color-mix(in srgb,var(--acc) 70%,#000),#0c0c0e 70%)}'}
@keyframes kb{to{transform:scale(1.12)}}.hero .w{position:relative;z-index:1;padding-block:120px 64px}.k{text-transform:uppercase;letter-spacing:.18em;font:600 12.5px var(--body);opacity:.9;margin:0 0 16px}
.hero h1{font-size:clamp(38px,7vw,84px);max-width:13ch;text-wrap:balance}.hero h1 em{font-style:normal;color:var(--acc)}.hero p.s{font-size:clamp(17px,2vw,20px);max-width:560px;opacity:.92;margin:20px 0 30px}
.cta{display:inline-flex;align-items:center;gap:10px;background:var(--acc);color:var(--accInk);border-radius:999px;padding:16px 28px;font:700 16px var(--body);text-decoration:none;box-shadow:0 12px 30px rgba(0,0,0,.25);transition:transform .2s}.cta:hover{transform:translateY(-2px)}
.stats{display:flex;gap:36px;flex-wrap:wrap;margin-top:42px}.stats b{display:block;font:700 clamp(34px,4vw,52px)/1 var(--head)}.stats span{font-size:14px;opacity:.85}
section{padding:96px 0}h2{font-size:clamp(30px,4.4vw,52px);margin-bottom:34px;max-width:18ch;text-wrap:balance}.eyebrow{color:var(--acc);text-transform:uppercase;letter-spacing:.16em;font:700 12.5px var(--body);margin:0 0 12px}
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:22px}.step{border-top:2px solid var(--acc);padding-top:22px}.step b{display:block;font:700 15px var(--body);color:var(--acc);margin-bottom:10px}.step h3{font-size:26px;margin-bottom:10px}.step p{color:var(--mut);margin:0}
.split{display:grid;grid-template-columns:1.05fr 1fr;gap:56px;align-items:center}.ph{border-radius:var(--r);overflow:hidden;aspect-ratio:4/5;max-width:100%}.ph img{width:100%;height:100%;object-fit:cover}
.calc{background:var(--card);border:1px solid var(--line);border-radius:calc(var(--r) + 6px);padding:34px;display:grid;gap:26px}.calc label{display:grid;gap:10px;font-weight:600}.calc input[type=range]{width:100%;accent-color:var(--acc)}.calc input[type=number]{padding:14px;border:1px solid var(--line);border-radius:12px;background:var(--bg);color:var(--ink);font:inherit;max-width:220px}
.res{border-top:1px solid var(--line);padding-top:22px}.res small{color:var(--mut)}.res b{display:block;font:700 clamp(44px,6vw,72px)/1 var(--head);color:var(--acc);margin:6px 0}.res .y{color:var(--mut)}
.chips{display:flex;flex-wrap:wrap;gap:12px}.chips span{border:1px solid var(--line);background:var(--card);border-radius:999px;padding:12px 20px;font-weight:600}
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}.card{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:28px}.card h3{font-size:22px;margin-bottom:10px}.card p{color:var(--mut);margin:0}
.svc{color:var(--mut);margin:-18px 0 30px}.rules{display:grid;gap:12px;padding:0;margin:0;list-style:none}.rules li{display:flex;gap:12px}.rules li:before{content:"";flex:none;width:8px;height:8px;border-radius:50%;background:var(--acc);margin-top:10px}
details{border-bottom:1px solid var(--line);padding:20px 0}summary{font:600 19px var(--body);cursor:pointer;list-style:none;display:flex;justify-content:space-between;gap:16px}summary:after{content:"+";color:var(--acc);font-size:24px;line-height:1}details[open] summary:after{content:"–"}details p{color:var(--mut);margin:12px 0 0;max-width:62ch}
.join{background:var(--acc);color:var(--accInk);border-radius:calc(var(--r) + 10px);padding:56px;display:grid;grid-template-columns:1fr 1fr;gap:40px;align-items:center}.join h2{margin-bottom:12px;color:inherit}.join p{opacity:.85;margin:0}
form{display:grid;gap:12px;background:var(--card);color:var(--ink);border-radius:var(--r);padding:26px;box-shadow:0 20px 50px rgba(0,0,0,.18)}form input[type=text]{padding:15px 16px;border:1px solid var(--line);border-radius:12px;background:var(--bg);color:var(--ink);font:inherit}form label{display:flex;gap:10px;align-items:center;color:var(--mut);font-size:15px}form button{border:0;border-radius:999px;background:var(--ink);color:var(--bg);padding:16px;font:700 16px var(--body);cursor:pointer}
footer{padding:40px 0 60px;color:var(--mut);font-size:14px}footer a{color:inherit}.bar{position:fixed;left:0;right:0;bottom:0;padding:12px max(16px,env(safe-area-inset-left)) calc(12px + env(safe-area-inset-bottom));background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(10px);border-top:1px solid var(--line);display:none;z-index:5}.bar .cta{width:100%;justify-content:center}
@media(max-width:860px){.steps,.cards{grid-template-columns:1fr}.split,.join{grid-template-columns:1fr}.join{padding:30px}section{padding:64px 0}.bar{display:block}footer{padding-bottom:110px}.hero .w{padding-block:96px 44px}}
@media(prefers-reduced-motion:reduce){.hero img{animation:none}html{scroll-behavior:auto}}</style></head>
<body>
<header class="hero">${hero ? `<img src="${hero}" alt="">` : ''}<div class="w"><p class="k">${r(L.kicker)} · ${esc(b.name)}</p><h1>${r(L.h1a)} <em>${rate}%</em> ${r(L.h1b)}</h1><p class="s">${r(L.sub)}</p><a class="cta" href="#join">${r(L.cta)} →</a>
<div class="stats"><div><b>${rate}%</b><span>${r(L.bigRate)}</span></div><div><b>0</b><span>${r(L.bigFree)}</span></div><div><b>24/7</b><span>${r(L.bigLive)}</span></div></div></div></header>
<section><div class="w"><p class="eyebrow">${r(L.howH)}</p><h2>${r(L.howT)}</h2><div class="steps">${(L.how as string[][]).map(([h, p2], i) => `<div class="step"><b>0${i + 1}</b><h3>${r(h)}</h3><p>${r(p2)}</p></div>`).join('')}</div></div></section>
<section style="padding-top:0"><div class="w split"><div class="calc"><div><p class="eyebrow">${r(L.calcH)}</p><h3 style="font-size:28px">${r(L.calcT)}</h3></div><label>${r(L.calcN)} <span id="nv">5</span><input id="n" type="range" min="1" max="50" value="5"></label><label>${r(L.calcC)}<input id="ck" type="number" min="1" step="1" value="${lang === 'en' ? 60 : 1000}"></label><div class="res"><small>${r(L.calcOut)}</small><b id="res">—</b><small class="y" id="yr"></small><br><small>${r(L.calcNote)}</small></div></div>
${side || hero ? `<div class="ph"><img src="${side || hero}" alt="" loading="lazy"></div>` : `<div><p class="eyebrow">${r(L.whoH)}</p><div class="chips">${groups.map((g) => `<span>${esc(g)}</span>`).join('')}</div></div>`}</div></section>
<section style="padding-top:0"><div class="w"><p class="eyebrow">${r(L.whoH)}</p><h2>${r(L.whoT)}</h2>${svc.length ? `<p class="svc">${r(L.svc)} ${svc.map(esc).join(' · ')}</p>` : ''}<div class="chips">${groups.map((g) => `<span>${esc(g)}</span>`).join('')}</div></div></section>
<section style="padding-top:0"><div class="w"><p class="eyebrow">${r(L.getH)}</p><h2>${r(L.getT)}</h2><div class="cards">${(L.get as string[][]).map(([h, p2]) => `<div class="card"><h3>${r(h)}</h3><p>${r(p2)}</p></div>`).join('')}</div></div></section>
<section style="padding-top:0"><div class="w split"><div><p class="eyebrow">${r(L.rulesH)}</p><h2>${r(L.rulesT)}</h2><ul class="rules">${(L.rules as string[]).map((x) => `<li>${r(x)}</li>`).join('')}</ul></div><div><p class="eyebrow">${r(L.faqH)}</p>${(L.faq as string[][]).map(([q, a2]) => `<details><summary>${r(q)}</summary><p>${r(a2)}</p></details>`).join('')}</div></div></section>
<section id="join" style="padding-top:0"><div class="w"><div class="join"><div><h2>${r(L.joinH)}</h2><p>${r(L.joinP)}</p></div><form method="post"><input type="text" name="name" required maxlength="60" placeholder="${esc(t.name)}" autocomplete="name"><input type="text" name="contact" required maxlength="120" placeholder="${esc(t.contact)}"><label><input type="checkbox" name="adult" required> ${esc(t.adult)}</label><button>${esc(t.go)} →</button></form></div></div></section>
<footer><div class="w"><a href="${origin}/s/${esc(slug)}">← ${esc(b.name)}</a></div></footer>
<div class="bar"><a class="cta" href="#join">${r(L.cta)} →</a></div>
<script>(function(){var n=document.getElementById('n'),c=document.getElementById('ck'),nv=document.getElementById('nv'),o=document.getElementById('res'),y=document.getElementById('yr');function f(){nv.textContent=n.value;var v=Math.round((+n.value)*(+c.value||0)*${rate}/100);o.textContent=v.toLocaleString()+' / ${esc(L.month)}';y.textContent=(v*12).toLocaleString()+' ${esc(L.year)}'}n.oninput=f;c.oninput=f;f()})();</script>
</body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Frame-Options': 'DENY' } });
}
