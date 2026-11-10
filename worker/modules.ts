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
import { editLayer, renderSite, styleOf } from './sitekit.js';
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
  style?: string; kicker?: string; accent?: string; details?: string[]; steps?: string[]; faq?: { q: string; a: string }[]; imgs?: string[]; promise?: string; book?: Book };

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
    title: cut(x.title, 80), sub: cut(x.sub, 180), about: cut(x.about, 900),
    kicker: cut(x.kicker, 60) || undefined, accent: cut(x.accent, 30) || undefined, promise: cut(x.promise, 120) || undefined,
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
export async function moduleAccess(db: DB, clientId: number): Promise<boolean> {
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
{"style":"...","title":"business name or a 2-5 word headline","accent":"one word from the title to highlight","kicker":"3-6 words above the title","sub":"one line: what the visitor gets, max 18 words","about":"3 sentences about the business and its approach","services":["4-6 offers, 1-4 words each"],"details":["one sentence describing each offer, same order"],"steps":["3 steps, 3-7 words each: 1 the visitor leaves a request, 2 what THE BUSINESS does next (we prepare / we call / we agree), 3 what the visitor gets"],"faq":[{"q":"a question a visitor would ask","a":"an honest answer without invented facts; if a fact is unknown, say it is agreed in the request"}],"promise":"one strong sentence for a photo banner, max 12 words","cta":"form title, 1-4 words, fits the wish (order, booking, pre-order...)","ask":"hint in the message box, max 8 words","photos":["3 English prompts for realistic photos for this site: 1 the place or product wide shot, 2 the process or people at work from behind or the side, 3 a beautiful detail close-up. No text, no logos, no faces looking at the camera"],"booking":false}
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
export const sitePreview = (s: Site, edit?: { ai: string; photo: string; hint: string }) => {
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
      (SELECT COUNT(*) FROM biz_leads l WHERE l.biz_id = r.biz_id AND l.source = 'ref_' || r.code) AS leads
    FROM biz_refs r WHERE r.biz_id = ? ORDER BY r.id`).bind(biz.id).all<{ name: string; code: string; visits: number; leads: number }>()).results;
  const extra = (await db.prepare('SELECT slug, data FROM ws_sites WHERE client_id = ? AND biz_id = ? ORDER BY at DESC LIMIT 20').bind(clientId, biz.id).all<{ slug: string; data: string }>().catch(() => ({ results: [] }))).results;
  const pages = [...extra.map((p) => ({ ...(JSON.parse(p.data) as Site), slug: p.slug, url: `${origin}/s/${p.slug}` })), ...(biz.kind === 'site' ? [{ ...(JSON.parse(biz.data || '{}') as Site), slug: biz.slug, url, main: true }] : [])];
  return {
    biz: { id: biz.id, name: biz.name },
    bot: { on: !!(access && biz.about), about: biz.about || '' },
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
