// Partner program API: accounts, tracking links (/r/<slug>), stats and team.
// Passwords are hashed with PBKDF2 (WebCrypto); sessions live in D1 and an HttpOnly cookie.

export interface Stmt {
  bind(...values: unknown[]): Stmt;
  run(): Promise<unknown>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
}
export interface DB {
  prepare(sql: string): Stmt;
}

import { handleDealsApi, type Notify } from './deals.js';
import { handleCoach } from './coach.js';
import type { AiBinding } from './chat.js';

const SESSION_DAYS = 30;
// Free Workers plan allows ~10 ms CPU per request; 25k PBKDF2 rounds stays inside it.
const PBKDF2_ITERATIONS = 25_000;
const SLUG_RE = /^[a-z0-9]{6,12}$/;
const enc = new TextEncoder();

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });

export function randomId(len: number): string {
  const abc = 'abcdefghijkmnpqrstuvwxyz23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => abc[b % abc.length]).join('');
}

const hex = (buf: ArrayBuffer | Uint8Array) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');

export async function hashPassword(password: string, saltHex: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const salt = new Uint8Array(saltHex.match(/../g)!.map((h) => parseInt(h, 16)));
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS }, key, 256);
  return hex(bits);
}

function sameString(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function cookie(request: Request, name: string): string | null {
  const m = (request.headers.get('Cookie') ?? '').match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  return m ? m[1] : null;
}

const sessionCookie = (token: string, maxAge: number) =>
  `vaxo_session=${token}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`;

async function startSession(db: DB, partnerId: number): Promise<Response> {
  const token = randomId(32);
  await db
    .prepare(`INSERT INTO sessions (token, partner_id, expires_at) VALUES (?, ?, datetime('now', '+${SESSION_DAYS} days'))`)
    .bind(token, partnerId)
    .run();
  return json(200, { ok: true }, { 'Set-Cookie': sessionCookie(token, SESSION_DAYS * 86400) });
}

async function currentPartner(db: DB, request: Request): Promise<{ id: number; name: string; email: string; code: string } | null> {
  const token = cookie(request, 'vaxo_session');
  if (!token) return null;
  return db
    .prepare(
      `SELECT p.id, p.name, p.email, p.code FROM sessions s JOIN partners p ON p.id = s.partner_id
       WHERE s.token = ? AND s.expires_at > datetime('now')`,
    )
    .bind(token)
    .first();
}

async function readBody(request: Request): Promise<Record<string, unknown>> {
  try {
    const b = await request.json();
    return b && typeof b === 'object' ? (b as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

const s = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** Only our own pages can be link targets, so links can't be used as open redirects. */
function safeTarget(v: unknown): string {
  const t = s(v, 200);
  return /^\/[A-Za-z0-9/_\-.#?=&]*$/.test(t) && !t.startsWith('//') ? t : '/start/';
}

export async function createLink(db: DB, partnerId: number, name: string, target: string, friend = 0) {
  for (let i = 0; i < 5; i++) {
    const slug = randomId(7);
    try {
      await db.prepare('INSERT INTO links (partner_id, slug, name, target, friend) VALUES (?, ?, ?, ?, ?)').bind(partnerId, slug, name, target, friend).run();
      return slug;
    } catch {
      // slug collision: try another
    }
  }
  throw new Error('could not create link');
}

/** GET /r/<slug>: count the click, remember the partner for life, go to the target page. */
export async function handleRedirect(db: DB, request: Request, slug: string): Promise<Response> {
  const home = new URL('/', request.url);
  if (!SLUG_RE.test(slug)) return Response.redirect(home.toString(), 302);
  const link = await db.prepare('SELECT id, target, active FROM links WHERE slug = ?').bind(slug).first<{ id: number; target: string; active: number }>();
  if (!link) return Response.redirect(home.toString(), 302);
  const country = (request as { cf?: { country?: string } }).cf?.country ?? null;
  await db.prepare('INSERT INTO clicks (link_id, country) VALUES (?, ?)').bind(link.id, country).run();
  const to = new URL(link.active ? link.target : '/start/', request.url);
  // First touch wins: the page script keeps an existing ref, so a later link never overwrites it.
  if (link.active) to.searchParams.set('ref', slug);
  return Response.redirect(to.toString(), 302);
}

/** /api/partner/* */
export async function handlePartnerApi(db: DB, request: Request, path: string, notify: Notify = async () => {}, ai?: AiBinding): Promise<Response> {
  const method = request.method;

  if (path === 'register' && method === 'POST') {
    const b = await readBody(request);
    const email = s(b.email, 120).toLowerCase();
    const name = s(b.name, 80);
    const password = typeof b.password === 'string' ? b.password : '';
    const errors: Record<string, true> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = true;
    if (!name) errors.name = true;
    if (password.length < 8 || password.length > 200) errors.password = true;
    if (b.adult !== true) errors.adult = true;
    if (b.rules !== true) errors.rules = true;
    if (Object.keys(errors).length) return json(400, { ok: false, errors });
    const exists = await db.prepare('SELECT id FROM partners WHERE email = ?').bind(email).first();
    if (exists) return json(409, { ok: false, errors: { email: true }, reason: 'exists' });
    const parent = s(b.invite, 20)
      ? await db.prepare('SELECT id, friend FROM partners WHERE code = ?').bind(s(b.invite, 20)).first<{ id: number; friend: number }>()
      : null;
    // Friends chain: joined with the owner's friend code, or invited by a friend partner.
    const codesRow = await db.prepare(`SELECT value FROM settings WHERE key = 'friend_codes'`).first<{ value: string }>();
    const codes = (codesRow?.value || 'DIMA').split(',').map((c) => c.trim().toUpperCase()).filter(Boolean);
    const friend = codes.includes(s(b.code, 20).toUpperCase()) || parent?.friend === 1 ? 1 : 0;
    const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
    const hash = await hashPassword(password, salt);
    const code = randomId(8);
    await db
      .prepare('INSERT INTO partners (email, name, pass_hash, salt, code, parent_id, friend) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(email, name, hash, salt, code, parent?.id ?? null, friend)
      .run();
    const p = await db.prepare('SELECT id FROM partners WHERE email = ?').bind(email).first<{ id: number }>();
    await createLink(db, p!.id, 'Main link', '/start/');
    if (friend) await createLink(db, p!.id, 'For friends (they name the price)', '/', 1);
    return startSession(db, p!.id);
  }

  if (path === 'login' && method === 'POST') {
    const b = await readBody(request);
    const email = s(b.email, 120).toLowerCase();
    const password = typeof b.password === 'string' ? b.password : '';
    const p = await db
      .prepare('SELECT id, pass_hash, salt FROM partners WHERE email = ?')
      .bind(email)
      .first<{ id: number; pass_hash: string; salt: string }>();
    if (!p || !sameString(await hashPassword(password, p.salt), p.pass_hash)) return json(401, { ok: false });
    return startSession(db, p.id);
  }

  if (path === 'logout' && method === 'POST') {
    const token = cookie(request, 'vaxo_session');
    if (token) await db.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
    return json(200, { ok: true }, { 'Set-Cookie': sessionCookie('', 0) });
  }

  const me = await currentPartner(db, request);
  if (!me) return json(401, { ok: false });

  if (path === 'coach') return handleCoach(db, ai, request, me.id);

  if (path === 'deals' || path.startsWith('deals/')) return handleDealsApi(db, request, me, path, notify);

  if (path === 'me' && method === 'GET') {
    const { results: links } = await db
      .prepare(
        `SELECT l.id, l.slug, l.name, l.target, l.active, l.created_at, l.friend,
           (SELECT COUNT(*) FROM clicks c WHERE c.link_id = l.id) AS clicks,
           (SELECT COUNT(*) FROM leads d WHERE d.ref = l.slug) AS leads
         FROM links l WHERE l.partner_id = ? ORDER BY l.id DESC`,
      )
      .bind(me.id)
      .all();
    const team = await db.prepare('SELECT COUNT(*) AS n FROM partners WHERE parent_id = ?').bind(me.id).first<{ n: number }>();
    const plan = await db.prepare('SELECT plan, friend FROM partners WHERE id = ?').bind(me.id).first<{ plan: string; friend: number }>();
    const earned = await db.prepare(`SELECT COALESCE(SUM(CASE WHEN status = 'due' THEN amount_usd END), 0) AS due,
        COALESCE(SUM(CASE WHEN status = 'due' AND created_at <= datetime('now', '-14 days') THEN amount_usd END), 0) AS free,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount_usd END), 0) AS paid FROM payouts WHERE partner_id = ?`).bind(me.id).first<{ due: number; free: number; paid: number }>().catch(() => null);
    const kinds = await db.prepare(`SELECT COALESCE(SUM(CASE WHEN kind LIKE '%team%' THEN amount_usd END), 0) AS team, COALESCE(SUM(CASE WHEN kind NOT LIKE '%team%' THEN amount_usd END), 0) AS own FROM payouts WHERE partner_id = ? AND status != 'cancelled'`).bind(me.id).first<{ team: number; own: number }>().catch(() => null);
    const vx = await vxBalance(db, me.id);
    // Dmitry 17.11: every client the partner brought, with a clear state — waiting for the 14-day refund window (until
    // when), credited, paid out, or refunded (declined). A client who refunded and later paid again shows the new payment.
    const clientRows = ((await db.prepare(`SELECT p.id, p.kind, p.amount_usd AS amount, p.base_usd AS base, p.status, p.created_at AS at, p.paid_at, d.name
        FROM payouts p JOIN leads d ON d.id = p.lead_id WHERE p.partner_id = ? ORDER BY p.id DESC LIMIT 100`).bind(me.id).all<Record<string, any>>().catch(() => ({ results: [] }))).results || [])
      .map((x) => {
        const at = Date.parse(String(x.at).replace(' ', 'T') + 'Z'), until = at + 14 * 864e5;
        const state = x.status === 'cancelled' ? 'refund' : x.status === 'paid' ? 'paid' : Date.now() >= until ? 'ready' : 'hold';
        const nm = String(x.name || '').trim().split(/\s+/), who = nm[0] ? nm[0] + (nm[1] ? ' ' + nm[1][0] + '.' : '') : '—';
        return { id: x.id, who, kind: String(x.kind).replace(/:.*$/, ''), amount: x.amount, base: x.base, state, at: x.at, until: new Date(until).toISOString(), paidAt: x.paid_at };
      });
    return json(200, { ok: true, clients: clientRows, partner: me, links, team: team?.n ?? 0, earnedOwn: kinds?.own ?? 0, earnedTeam: kinds?.team ?? 0, vx, balance: earned?.due ?? 0, available: earned?.free ?? 0, pending: Math.round(((earned?.due ?? 0) - (earned?.free ?? 0)) * 100) / 100, paidOut: earned?.paid ?? 0, plan: plan?.plan ?? 'classic', friend: plan?.friend === 1 });
  }

  // Bonus store (Decision 52 v2): Vax bonuses come only from clients' renewals (5% of the net), so every prize is paid
  // for in advance by money already received. An order goes to the HQ; Dmitry or Claude sends the prize.
  if (path === 'store' && method === 'GET') {
    return json(200, { ok: true, vx: await vxBalance(db, me.id), items: STORE, orders: (await db.prepare('SELECT id, item, vx, status, created_at FROM vx_orders WHERE partner_id = ? ORDER BY id DESC LIMIT 20').bind(me.id).all().catch(() => ({ results: [] }))).results });
  }
  if (path === 'store' && method === 'POST') {
    const b = await readBody(request);
    const it = STORE.find((x) => x.id === String(b.item));
    if (!it) return json(400, { ok: false, error: 'item' });
    const bal = await vxBalance(db, me.id);
    if (bal < it.vx) return json(400, { ok: false, error: 'balance' });
    const address = s(b.address, 300);
    if (it.ship && !address) return json(400, { ok: false, error: 'address' });
    await vxTable(db);
    await db.prepare('INSERT INTO vx_orders (partner_id, item, vx, address) VALUES (?, ?, ?, ?)').bind(me.id, it.id, it.vx, address || null).run();
    await notify?.(`🎁 Заказ из бонусного магазина: ${it.name.ru} за ${it.vx} бонусов — партнёр #${me.id} ${me.email}${address ? `\nАдрес: ${address}` : ''}`).catch(() => {});
    return json(200, { ok: true, vx: bal - it.vx });
  }

  if (path === 'plan' && method === 'POST') {
    const b = await readBody(request);
    if (!['classic', 'first30', 'life10'].includes(String(b.plan))) return json(400, { ok: false });
    await db.prepare('UPDATE partners SET plan = ? WHERE id = ?').bind(String(b.plan), me.id).run();
    return json(200, { ok: true });
  }

  if (path === 'links' && method === 'POST') {
    const b = await readBody(request);
    const name = s(b.name, 60) || 'New link';
    const fr = b.friend === true || b.friend === 'on' ? ((await db.prepare('SELECT friend FROM partners WHERE id = ?').bind(me.id).first<{ friend: number }>())?.friend ?? 0) : 0;
    const slug = await createLink(db, me.id, name, safeTarget(b.target), fr);
    return json(200, { ok: true, slug });
  }

  // Payout profile (Decision 29): without it no payout is sent. Ukrainians are paid only as FOP;
  // crypto is not offered (single-tax FOP may not pay in crypto).
  if (path === 'payout' && method === 'GET') {
    // Until migration 0032 is on the live DB the columns are missing: answer "not yet" instead of crashing.
    const r = await db.prepare('SELECT payout_profile, payout_filled_at FROM partners WHERE id = ?').bind(me.id).first<{ payout_profile: string | null; payout_filled_at: string | null }>().catch(() => undefined);
    if (r === undefined) return json(503, { ok: false, error: 'soon' });
    return json(200, { ok: true, v2: await payoutV2(db), profile: r?.payout_profile ? JSON.parse(r.payout_profile) : null, at: r?.payout_filled_at ?? null });
  }
  if (path === 'payout' && method === 'POST') {
    const b = await readBody(request);
    const status = String(b.status);
    if (!['fop', 'person', 'company'].includes(status)) return json(400, { ok: false, error: 'status' });
    const country = s(b.country, 60), residency = s(b.residency, 60), method_ = s(b.method, 30), account = s(b.account, 200), legal = s(b.legal_name, 120);
    // Decision 68: more ways to be paid once the owner switches them on (settings payout_v2 = 1).
    const v2 = await payoutV2(db);
    const methods = ['payoneer', 'wise', 'bank', ...(v2 ? ['fop_ua', 'card_ua', 'usdt'] : [])];
    if (!country || !residency || !legal || !account || !methods.includes(method_)) return json(400, { ok: false, error: 'fields' });
    if (method_ === 'usdt' && !/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(account)) return json(400, { ok: false, error: 'wallet' });
    if (b.adult !== true || b.offer !== true) return json(400, { ok: false, error: 'consent' });
    const ua = /ukrain|україн|украин|^ua$/i.test(country) || /ukrain|україн|украин|^ua$/i.test(residency);
    if (ua && status !== 'fop' && !(v2 && ['card_ua', 'usdt'].includes(method_))) return json(400, { ok: false, error: 'ua_fop' });
    const profile = { status, country, residency, legal_name: legal, tax_id: s(b.tax_id, 40), method: method_, account, adult: true, offer: true };
    const saved = await db.prepare("UPDATE partners SET payout_profile = ?, payout_filled_at = datetime('now') WHERE id = ?").bind(JSON.stringify(profile), me.id).run().then(() => true, () => false);
    return saved ? json(200, { ok: true }) : json(503, { ok: false, error: 'soon' });
  }

  const toggle = path.match(/^links\/(\d+)\/toggle$/);
  if (toggle && method === 'POST') {
    await db.prepare('UPDATE links SET active = 1 - active WHERE id = ? AND partner_id = ?').bind(Number(toggle[1]), me.id).run();
    return json(200, { ok: true });
  }

  return json(404, { ok: false });
}

/** Decision 68 switch: the extra payout ways (FOP, card under a civil contract, USDT). */
async function payoutV2(db: DB): Promise<boolean> {
  return (await db.prepare("SELECT value FROM settings WHERE key = 'payout_v2'").first<{ value: string }>().catch(() => null))?.value === '1';
}

/** 100 bonuses = $1 of our cost. A partner gets 5 bonuses for every $1 of net renewals of their own clients. */
export const VX_PER_USD = 5;
type Item = { id: string; vx: number; ship: boolean; name: { en: string; ru: string; ua: string } };
export const STORE: Item[] = [
  { id: 'month-pro', vx: 2000, ship: false, name: { en: 'A month of Pro for you or a friend', ru: 'Месяц тарифа Про — себе или другу', ua: 'Місяць тарифу Про — собі або другу' } },
  { id: 'cap', vx: 2500, ship: true, name: { en: 'Vaxo cap', ru: 'Кепка Vaxo', ua: 'Кепка Vaxo' } },
  { id: 'tee', vx: 3000, ship: true, name: { en: 'Vaxo T-shirt', ru: 'Футболка Vaxo', ua: 'Футболка Vaxo' } },
  { id: 'hoodie', vx: 6000, ship: true, name: { en: 'Vaxo hoodie', ru: 'Худи Vaxo', ua: 'Худі Vaxo' } },
  { id: 'box', vx: 10000, ship: true, name: { en: 'Vaxo box: hoodie, cap, T-shirt, bottle', ru: 'Набор Vaxo: худи, кепка, футболка, бутылка', ua: 'Набір Vaxo: худі, кепка, футболка, пляшка' } },
  { id: 'airpods', vx: 25000, ship: true, name: { en: 'AirPods Pro', ru: 'AirPods Pro', ua: 'AirPods Pro' } },
  { id: 'iphone', vx: 120000, ship: true, name: { en: 'iPhone (latest Pro)', ru: 'iPhone (последний Pro)', ua: 'iPhone (останній Pro)' } },
  { id: 'macbook', vx: 200000, ship: true, name: { en: 'MacBook Pro', ru: 'MacBook Pro', ua: 'MacBook Pro' } },
  { id: 'car', vx: 3500000, ship: false, name: { en: 'A car (agreed with you personally)', ru: 'Автомобиль (подбираем с вами лично)', ua: 'Автомобіль (підбираємо з вами особисто)' } },
];
let vxReady = false;
async function vxTable(db: DB) {
  if (vxReady) return;
  await db.prepare("CREATE TABLE IF NOT EXISTS vx_orders (id INTEGER PRIMARY KEY AUTOINCREMENT, partner_id INTEGER NOT NULL, item TEXT NOT NULL, vx INTEGER NOT NULL, address TEXT, status TEXT NOT NULL DEFAULT 'new', created_at TEXT NOT NULL DEFAULT (datetime('now')))").run();
  vxReady = true;
}
export async function vxBalance(db: DB, partnerId: number): Promise<number> {
  await vxTable(db).catch(() => {});
  const got = (await db.prepare(`SELECT COALESCE(SUM(base_usd), 0) AS n FROM payouts WHERE partner_id = ? AND status != 'cancelled' AND kind LIKE 'renewal-referral%' AND created_at <= datetime('now', '-14 days')`).bind(partnerId).first<{ n: number }>().catch(() => null))?.n ?? 0;
  const spent = (await db.prepare(`SELECT COALESCE(SUM(vx), 0) AS n FROM vx_orders WHERE partner_id = ? AND status != 'cancelled'`).bind(partnerId).first<{ n: number }>().catch(() => null))?.n ?? 0;
  return Math.max(0, Math.floor(got * VX_PER_USD) - spent);
}
