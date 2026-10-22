// Client cabinets (Decision 16): vaxogroup.com/me/. Sign-in without passwords — a one-time code by email (Resend) or
// Google. All the client's projects in one place: progress %, revision counter, confirmed brief, payments, the
// strategy document, bonuses (5% cashback, tasks), level and the next step. Without signing in, the personal project
// link (/me/?t=<room>) shows that one project, like the project chat does.
import type { DB } from './partner.js';
import type { Notify } from './deals.js';
import { mailReady, sendMail } from './mail.js';

export interface CabinetEnv { GOOGLE_CLIENT_ID?: string; GOOGLE_CLIENT_SECRET?: string }

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });
const hex = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, '0')).join('');
async function sha(s: string) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(h), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function pbkdf2(password: string, saltHex: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const salt = new Uint8Array(saltHex.match(/../g)!.map((h) => parseInt(h, 16)));
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256);
  return Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, '0')).join('');
}
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i;
const ROOM_RE = /^[a-f0-9]{24}$/;
const COOKIE = 'vaxo_me';
const cookie = (req: Request, name: string) => (req.headers.get('Cookie') || '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`))?.[1] || '';
const setCookie = (name: string, value: string, maxAge: number) => `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;

export const LEVELS = [{ id: 'start', from: 0 }, { id: 'pro', from: 1000 }, { id: 'vip', from: 5000 }];
export const BONUS = { cashback: 0.05, profile: 5, review: 10, maxShare: 0.2, months: 12 };

async function sessionClient(db: DB, req: Request): Promise<{ id: number; email: string | null; name: string | null; profile: string | null; marketing: number; email_verified_at: string | null } | null> {
  const t = cookie(req, COOKIE);
  if (!/^[a-f0-9]{64}$/.test(t)) return null;
  return db.prepare('SELECT c.id, c.email, c.name, c.profile, c.marketing, c.email_verified_at FROM client_sessions s JOIN clients c ON c.id = s.client_id WHERE s.token = ?').bind(t).first();
}

/** Bonus balance in USD: everything earned in the last 12 months minus everything spent. */
export async function bonusBalance(db: DB, clientId: number | null, leadIds: number[]): Promise<number> {
  const ids = leadIds.length ? leadIds : [0];
  const r = await db
    .prepare(`SELECT COALESCE(SUM(amount_usd), 0) AS n FROM bonuses WHERE (client_id = ? OR lead_id IN (${ids.map(() => '?').join(',')}))
              AND (amount_usd < 0 OR at > datetime('now', '-${BONUS.months} months'))`)
    .bind(clientId ?? -1, ...ids)
    .first<{ n: number }>();
  return Math.max(0, Math.round((r?.n ?? 0) * 100) / 100);
}

/** 5% of a payment back as bonuses (called when the owner records a payment). */
export async function cashback(db: DB, leadId: number, usd: number, paymentId: number | null) {
  const amt = Math.round(usd * BONUS.cashback * 100) / 100;
  if (!(amt > 0)) return;
  const l = await db.prepare('SELECT client_id FROM leads WHERE id = ?').bind(leadId).first<{ client_id: number | null }>();
  await db.prepare(`INSERT INTO bonuses (client_id, lead_id, kind, amount_usd, note) VALUES (?, ?, 'cashback', ?, ?)`).bind(l?.client_id ?? null, leadId, amt, paymentId ? `payment:${paymentId}` : null).run();
}

async function projects(db: DB, where: string, ...args: unknown[]) {
  const leads = (await db
    .prepare(`SELECT id, created_at, name, COALESCE(service, interest, '') AS what, status, stage, progress, stage_due, room, promo, lang,
                     revisions_used, revisions_total, brief_confirmed_at, strategy_url, value_usd
              FROM leads WHERE ${where} AND status != 'archived' ORDER BY id DESC LIMIT 50`)
    .bind(...args)
    .all<Record<string, any>>()).results;
  for (const l of leads) {
    l.revisions_total = l.revisions_total ?? (l.promo ? 5 : 2);
    l.payments = (await db.prepare(`SELECT at, amount, currency, part FROM payments WHERE lead_id = ? AND status = 'ok' ORDER BY at`).bind(l.id).all()).results;
    l.reviewed = !!(await db.prepare('SELECT 1 FROM reviews WHERE lead_id = ?').bind(l.id).first());
    delete l.promo;
  }
  return leads;
}

async function paidUsd(db: DB, leadIds: number[]): Promise<number> {
  if (!leadIds.length) return 0;
  const rows = (await db.prepare(`SELECT amount, currency, rate, amount_uah FROM payments WHERE status = 'ok' AND lead_id IN (${leadIds.map(() => '?').join(',')})`).bind(...leadIds).all<{ amount: number; currency: string; rate: number; amount_uah: number }>()).results;
  const usdRate = (await db.prepare(`SELECT rate FROM payments WHERE currency = 'USD' ORDER BY id DESC LIMIT 1`).first<{ rate: number }>())?.rate || 41.5;
  return Math.round(rows.reduce((s, p) => s + (p.currency === 'USD' ? p.amount : p.amount_uah / usdRate), 0));
}

async function linkLeads(db: DB, clientId: number, email: string | null, room: string | null) {
  if (email) await db.prepare(`UPDATE leads SET client_id = ? WHERE client_id IS NULL AND (lower(email_addr) = ? OR lower(trim(contact)) = ?)`).bind(clientId, email, email).run();
  if (room && ROOM_RE.test(room)) await db.prepare('UPDATE leads SET client_id = ? WHERE room = ? AND client_id IS NULL').bind(clientId, room).run();
  await db.prepare(`UPDATE bonuses SET client_id = ? WHERE client_id IS NULL AND lead_id IN (SELECT id FROM leads WHERE client_id = ?)`).bind(clientId, clientId).run();
}

async function startSession(db: DB, clientId: number) {
  const token = hex(32);
  await db.prepare('INSERT INTO client_sessions (token, client_id) VALUES (?, ?)').bind(token, clientId).run();
  return setCookie(COOKIE, token, 60 * 60 * 24 * 365);
}

const CODE_MAIL: Record<string, [string, string]> = {
  en: ['Your Vaxo sign-in code', 'Your code: {code}\n\nIt works for 15 minutes. If you did not ask for it, just ignore this letter.\n\n— Vax, Vaxo'],
  ru: ['Код входа в кабинет Vaxo', 'Ваш код: {code}\n\nОн действует 15 минут. Если вы не запрашивали код — просто проигнорируйте письмо.\n\n— Vax, Vaxo'],
  ua: ['Код входу в кабінет Vaxo', 'Ваш код: {code}\n\nВін діє 15 хвилин. Якщо ви не запитували код — просто проігноруйте лист.\n\n— Vax, Vaxo'],
};

/** /api/me and /api/me/<action>. */
export async function handleCabinet(db: DB, env: CabinetEnv, request: Request, path: string, notify: Notify): Promise<Response> {
  const url = new URL(request.url);
  const b = request.method === 'POST' ? ((await request.json().catch(() => ({}))) as Record<string, unknown>) : {};
  const str = (k: string, max: number) => (typeof b[k] === 'string' ? (b[k] as string).trim().slice(0, max) : '');

  if (path === '' && request.method === 'GET') {
    const me = await sessionClient(db, request);
    const room = url.searchParams.get('t') || '';
    const ways = { email: mailReady(), google: !!env.GOOGLE_CLIENT_ID };
    if (me) {
      if (ROOM_RE.test(room)) await linkLeads(db, me.id, null, room);
      const list = await projects(db, 'client_id = ?', me.id);
      const ids = list.map((l) => l.id);
      const paid = await paidUsd(db, ids);
      const history = (await db.prepare(`SELECT at, kind, amount_usd FROM bonuses WHERE client_id = ? OR lead_id IN (${(ids.length ? ids : [0]).join(',')}) ORDER BY id DESC LIMIT 30`).bind(me.id).all()).results;
      return json(200, { ok: true, signedIn: true, ways, me: { email: me.email, name: me.name, profile: me.profile ? JSON.parse(me.profile) : null, marketing: !!me.marketing, verified: !!me.email_verified_at }, projects: list, paidUsd: paid, level: [...LEVELS].reverse().find((x) => paid >= x.from)!.id, bonus: await bonusBalance(db, me.id, ids), bonusHistory: history, rules: BONUS });
    }
    if (ROOM_RE.test(room)) {
      const list = await projects(db, 'room = ?', room);
      if (!list.length) return json(404, { ok: false });
      return json(200, { ok: true, signedIn: false, ways, projects: list, bonus: await bonusBalance(db, null, list.map((l) => l.id)), rules: BONUS });
    }
    return json(200, { ok: true, signedIn: false, ways, projects: [] });
  }

  if (path === 'code' && request.method === 'POST') {
    const email = str('email', 254).toLowerCase();
    if (!EMAIL.test(email)) return json(400, { ok: false, error: 'email' });
    if (!mailReady()) return json(503, { ok: false, error: 'mail_off' });
    const last = await db.prepare(`SELECT sent_at > datetime('now', '-1 minute') AS recent FROM client_codes WHERE email = ?`).bind(email).first<{ recent: number }>();
    if (last?.recent) return json(429, { ok: false, error: 'wait' });
    const code = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
    await db.prepare(`INSERT INTO client_codes (email, code_hash, expires_at, tries, sent_at) VALUES (?, ?, datetime('now', '+15 minutes'), 0, datetime('now'))
                      ON CONFLICT (email) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, tries = 0, sent_at = excluded.sent_at`)
      .bind(email, await sha(`vaxo-me:${email}:${code}`)).run();
    const [subj, body] = CODE_MAIL[str('lang', 2)] || CODE_MAIL.en;
    return (await sendMail(email, subj, body.replace('{code}', code))) ? json(200, { ok: true }) : json(502, { ok: false, error: 'send' });
  }

  if (path === 'verify' && request.method === 'POST') {
    const email = str('email', 254).toLowerCase(), code = str('code', 10).replace(/\D/g, '');
    const row = await db.prepare(`SELECT code_hash, tries, expires_at > datetime('now') AS fresh FROM client_codes WHERE email = ?`).bind(email).first<{ code_hash: string; tries: number; fresh: number }>();
    if (!row || !row.fresh || row.tries >= 5) return json(400, { ok: false, error: 'expired' });
    if ((await sha(`vaxo-me:${email}:${code}`)) !== row.code_hash) {
      await db.prepare('UPDATE client_codes SET tries = tries + 1 WHERE email = ?').bind(email).run();
      return json(400, { ok: false, error: 'code' });
    }
    await db.prepare('DELETE FROM client_codes WHERE email = ?').bind(email).run();
    await db.prepare(`INSERT INTO clients (email, lang, email_verified_at) VALUES (?, ?, datetime('now')) ON CONFLICT (email) DO UPDATE SET email_verified_at = COALESCE(clients.email_verified_at, datetime('now'))`).bind(email, str('lang', 2) || null).run();
    const c = await db.prepare('SELECT id FROM clients WHERE email = ?').bind(email).first<{ id: number }>();
    await linkLeads(db, c!.id, email, str('room', 24) || null);
    return json(200, { ok: true }, { 'Set-Cookie': await startSession(db, c!.id) });
  }


  // Sign-up by hand: name, email, password (+ phone). Consent to the terms and the privacy policy is required; news only
  // with a separate tick. Until the email is confirmed (code or Google), only the project from the link is attached.
  if (path === 'register' && request.method === 'POST') {
    const email = str('email', 254).toLowerCase(), pass = typeof b.password === 'string' ? b.password : '', name = str('name', 80);
    if (!EMAIL.test(email)) return json(400, { ok: false, error: 'email' });
    if (pass.length < 8 || pass.length > 200) return json(400, { ok: false, error: 'password' });
    if (!b.consent) return json(400, { ok: false, error: 'consent' });
    if (await db.prepare('SELECT 1 FROM clients WHERE email = ?').bind(email).first()) return json(409, { ok: false, error: 'exists' });
    const salt = hex(16);
    await db.prepare(`INSERT INTO clients (email, name, phone, lang, pass_hash, pass_salt, consent_at, marketing) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)`)
      .bind(email, name || null, str('phone', 40) || null, str('lang', 2) || null, await pbkdf2(pass, salt), salt, b.marketing ? 1 : 0).run();
    const c = await db.prepare('SELECT id FROM clients WHERE email = ?').bind(email).first<{ id: number }>();
    await linkLeads(db, c!.id, null, str('room', 24) || null);
    await notify(`👤 Новый кабинет клиента: ${name || '—'} ${email}`);
    return json(200, { ok: true }, { 'Set-Cookie': await startSession(db, c!.id) });
  }

  if (path === 'login' && request.method === 'POST') {
    const email = str('email', 254).toLowerCase(), pass = typeof b.password === 'string' ? b.password : '';
    const fails = await db.prepare(`SELECT COUNT(*) AS n FROM login_fails WHERE email = ? AND at > datetime('now', '-15 minutes')`).bind(email).first<{ n: number }>();
    if ((fails?.n ?? 0) >= 8) return json(429, { ok: false, error: 'wait' });
    const c = await db.prepare('SELECT id, pass_hash, pass_salt, email_verified_at FROM clients WHERE email = ?').bind(email).first<{ id: number; pass_hash: string | null; pass_salt: string | null; email_verified_at: string | null }>();
    if (!c?.pass_hash || !c.pass_salt || (await pbkdf2(pass, c.pass_salt)) !== c.pass_hash) {
      await db.prepare('INSERT INTO login_fails (email) VALUES (?)').bind(email).run();
      return json(400, { ok: false, error: c && !c.pass_hash ? 'no_password' : 'wrong' });
    }
    await db.prepare('DELETE FROM login_fails WHERE email = ?').bind(email).run();
    await linkLeads(db, c.id, c.email_verified_at ? email : null, str('room', 24) || null);
    return json(200, { ok: true }, { 'Set-Cookie': await startSession(db, c.id) });
  }

  // Google: /api/me/google?back=<room> → Google → /api/me/google/callback → /me/
  if (path === 'google' && request.method === 'GET') {
    if (!env.GOOGLE_CLIENT_ID) return Response.redirect(new URL('/me/?err=google_off', url).toString(), 302);
    const state = hex(16) + '.' + (ROOM_RE.test(url.searchParams.get('back') || '') ? url.searchParams.get('back') : '');
    const go = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    go.search = new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, redirect_uri: `${url.origin}/api/me/google/callback`, response_type: 'code', scope: 'openid email profile', state, prompt: 'select_account' }).toString();
    return new Response(null, { status: 302, headers: { Location: go.toString(), 'Set-Cookie': setCookie('vaxo_gst', state, 600) } });
  }
  if (path === 'google/callback' && request.method === 'GET') {
    const state = url.searchParams.get('state') || '';
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !state || state !== cookie(request, 'vaxo_gst')) return Response.redirect(new URL('/me/?err=google', url).toString(), 302);
    const tok = (await (await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code: url.searchParams.get('code') || '', client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: `${url.origin}/api/me/google/callback`, grant_type: 'authorization_code' }),
    }).catch(() => null))?.json().catch(() => null)) as { id_token?: string } | null;
    // The id_token comes straight from Google over TLS, so its payload can be read without a signature check.
    const p = tok?.id_token ? JSON.parse(atob(tok.id_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))) : null;
    if (!p?.sub || p.aud !== env.GOOGLE_CLIENT_ID || !/accounts\.google\.com$/.test(p.iss || '') || !p.email_verified) return Response.redirect(new URL('/me/?err=google', url).toString(), 302);
    const email = String(p.email).toLowerCase();
    let c = await db.prepare('SELECT id FROM clients WHERE google_sub = ? OR email = ?').bind(p.sub, email).first<{ id: number }>();
    if (!c) {
      await db.prepare(`INSERT INTO clients (email, google_sub, name, email_verified_at) VALUES (?, ?, ?, datetime('now'))`).bind(email, p.sub, p.name || null).run();
      c = await db.prepare('SELECT id FROM clients WHERE google_sub = ?').bind(p.sub).first<{ id: number }>();
    } else await db.prepare(`UPDATE clients SET google_sub = ?, name = COALESCE(name, ?), email_verified_at = COALESCE(email_verified_at, datetime('now')) WHERE id = ?`).bind(p.sub, p.name || null, c.id).run();
    await linkLeads(db, c!.id, email, state.split('.')[1] || null);
    const h = new Headers({ Location: new URL('/me/', url).toString() });
    h.append('Set-Cookie', await startSession(db, c!.id));
    h.append('Set-Cookie', setCookie('vaxo_gst', '', 0));
    return new Response(null, { status: 302, headers: h });
  }

  const me = await sessionClient(db, request);
  if (!me) return json(401, { ok: false });

  if (path === 'logout' && request.method === 'POST') {
    await db.prepare('DELETE FROM client_sessions WHERE token = ?').bind(cookie(request, COOKIE)).run();
    return json(200, { ok: true }, { 'Set-Cookie': setCookie(COOKIE, '', 0) });
  }


  // The client's rights: all their data as a file, and deleting the account (payment records stay for tax law).
  if (path === 'export' && request.method === 'GET') {
    const client = await db.prepare('SELECT id, created_at, email, name, phone, lang, profile, google_sub IS NOT NULL AS google, email_verified_at, consent_at, marketing FROM clients WHERE id = ?').bind(me.id).first();
    const leads = (await db.prepare(`SELECT id, created_at, name, contact, service, interest, status, stage, progress, brief_confirmed_at, brief_confirmed FROM leads WHERE client_id = ?`).bind(me.id).all<Record<string, any>>()).results;
    for (const l of leads) {
      l.messages = (await db.prepare(`SELECT at, sender, text FROM messages WHERE lead_id = ? AND kind != 'note' ORDER BY id`).bind(l.id).all()).results;
      l.payments = (await db.prepare(`SELECT at, amount, currency, part, status FROM payments WHERE lead_id = ?`).bind(l.id).all()).results;
    }
    const bonuses = (await db.prepare('SELECT at, kind, amount_usd FROM bonuses WHERE client_id = ?').bind(me.id).all()).results;
    const reviews = (await db.prepare('SELECT at, lead_id, stars, text, public FROM reviews WHERE client_id = ?').bind(me.id).all()).results;
    return new Response(JSON.stringify({ exported_at: new Date().toISOString(), client, projects: leads, bonuses, reviews }, null, 2), {
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': 'attachment; filename="vaxo-my-data.json"', 'Cache-Control': 'no-store' },
    });
  }
  if (path === 'marketing' && request.method === 'POST') {
    await db.prepare('UPDATE clients SET marketing = ? WHERE id = ?').bind(b.on ? 1 : 0, me.id).run();
    return json(200, { ok: true });
  }
  if (path === 'delete' && request.method === 'POST') {
    await db.prepare('UPDATE leads SET client_id = NULL WHERE client_id = ?').bind(me.id).run();
    await db.prepare('UPDATE bonuses SET client_id = NULL WHERE client_id = ?').bind(me.id).run();
    await db.prepare('UPDATE reviews SET client_id = NULL WHERE client_id = ?').bind(me.id).run();
    await db.prepare('DELETE FROM client_sessions WHERE client_id = ?').bind(me.id).run();
    await db.prepare('DELETE FROM clients WHERE id = ?').bind(me.id).run();
    await notify(`🗑 Клиент удалил кабинет: ${me.email || '#' + me.id}`);
    return json(200, { ok: true }, { 'Set-Cookie': setCookie(COOKIE, '', 0) });
  }

  // Task: fill in the business profile (+$5 once).
  if (path === 'profile' && request.method === 'POST') {
    const profile = { business: str('business', 120), site: str('site', 200), niche: str('niche', 120), city: str('city', 120), goal: str('goal', 600) };
    const name = str('name', 80);
    const first = !(await db.prepare('SELECT profile_at FROM clients WHERE id = ?').bind(me.id).first<{ profile_at: string | null }>())?.profile_at;
    const full = profile.business && profile.niche && profile.goal.length >= 10;
    await db.prepare(`UPDATE clients SET profile = ?, name = COALESCE(NULLIF(?, ''), name)${full ? `, profile_at = COALESCE(profile_at, datetime('now'))` : ''} WHERE id = ?`).bind(JSON.stringify(profile), name, me.id).run();
    if (first && full) await db.prepare(`INSERT INTO bonuses (client_id, kind, amount_usd, note) VALUES (?, 'profile', ?, 'Business profile')`).bind(me.id, BONUS.profile).run();
    return json(200, { ok: true, bonus: first && full ? BONUS.profile : 0 });
  }

  // Task: an honest review after delivery (+$10 once per project).
  if (path === 'review' && request.method === 'POST') {
    const leadId = Number(b.lead_id), stars = Math.min(5, Math.max(1, Math.round(Number(b.stars)) || 5)), text = str('text', 2000);
    const l = await db.prepare(`SELECT id, name FROM leads WHERE id = ? AND client_id = ? AND stage = 'delivered'`).bind(leadId, me.id).first<{ id: number; name: string }>();
    if (!l || text.length < 20) return json(400, { ok: false });
    const res = await db.prepare('INSERT INTO reviews (lead_id, client_id, stars, text, public) VALUES (?, ?, ?, ?, ?) ON CONFLICT (lead_id) DO NOTHING').bind(leadId, me.id, stars, text, b.public ? 1 : 0).run() as { meta?: { changes?: number } };
    if (!res?.meta?.changes) return json(409, { ok: false, error: 'done' });
    await db.prepare(`INSERT INTO bonuses (client_id, lead_id, kind, amount_usd, note) VALUES (?, ?, 'review', ?, 'Review')`).bind(me.id, leadId, BONUS.review).run();
    await notify(`⭐ Отзыв ${'★'.repeat(stars)} от #${leadId} ${l.name}${b.public ? ' (можно показать на сайте)' : ''}: ${text.slice(0, 300)}`);
    return json(200, { ok: true, bonus: BONUS.review });
  }

  return json(404, { ok: false });
}
