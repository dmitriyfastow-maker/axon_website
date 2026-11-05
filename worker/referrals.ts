// Client referrals (04.11.2026). Every client has a personal invite link vaxogroup.com/r/c_<code>. The invited friend
// (by a client OR a partner link) gets the usual free first month + 1 gift month after their first paid payment (kept 14 days) — no cost before money comes in. The inviting client gets +1 free month of their own
// plan — a service credit, never cash — per friend whose first PAID payment stays 14 days (the refund window).
// Credit value = the cheaper of the two plans; at most 12 free months a year. Partners keep cash commissions.
// Anti-abuse: one attribution per new client (first link wins), no self-referral (same email, same company email
// domain, same phone, same business site), no rewards for test accounts or free plans, rewards cancelled on refund,
// bursts from one IP go to manual review in the HQ.
// Every function survives a database without migration 0034 (try/catch → empty results).
import type { DB } from './partner.js';
import type { Notify } from './deals.js';

export const CLIENT_REF = { friendMonths: 2, holdDays: 14, maxMonthsYear: 12, windowDays: 60, burstPerDay: 3 };
export const PLAN_PRICES: Record<string, number> = { start: 0, personal: 19, care: 39, growth: 129, pro: 299 };
export const SLUG_C = /^c_[a-z0-9]{6,10}$/;

const PUBLIC_MAIL = new Set(['gmail.com', 'googlemail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'live.com', 'icloud.com', 'me.com', 'mail.ru', 'yandex.ru', 'yandex.ua', 'ukr.net', 'i.ua', 'meta.ua', 'proton.me', 'protonmail.com', 'gmx.com', 'gmx.de', 'aol.com', 'bigmir.net', 'rambler.ru', 'bk.ru', 'inbox.ru', 'list.ru', 'zoho.com', 'yahoo.co.uk', 'msn.com']);

function randomCode(len: number) {
  const abc = 'abcdefghijkmnpqrstuvwxyz23456789';
  return Array.from(crypto.getRandomValues(new Uint8Array(len)), (b) => abc[b % abc.length]).join('');
}
async function sha(s: string) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(h), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Test accounts never earn or give rewards. */
export function isTestContact(s: string | null | undefined) {
  const v = (s || '').trim().toLowerCase();
  if (!v) return false;
  return /@vaxogroup\.com$|@vaxo\.test$|\.test$|@example\.(com|org|net)$/.test(v) || /^test[^@]*@/.test(v) || v.includes('+test');
}

/** Plan of a lead: the explicit column (migration 0034), then words in service/interest, then the deal value. */
export function planOf(l: { plan?: string | null; service?: string | null; interest?: string | null; value_usd?: number | null }): string | null {
  if (l.plan && l.plan in PLAN_PRICES) return l.plan;
  const t = `${l.service || ''} ${l.interest || ''}`.toLowerCase();
  for (const p of ['personal', 'growth', 'care', 'pro', 'start']) if (new RegExp(`\\b${p}\\b`).test(t)) return p;
  if (/персонал|особист/.test(t)) return 'personal';
  const v = Number(l.value_usd) || 0;
  for (const [p, price] of Object.entries(PLAN_PRICES)) if (price > 0 && (v === price || v === price * 10)) return p;
  return null;
}

type Who = { emails: string[]; phones: string[]; sites: string[] };
const digits = (s: string) => s.replace(/\D/g, '').slice(-9);
const host = (s: string) => { try { return new URL(/^https?:/i.test(s) ? s : `https://${s}`).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };
function addContact(w: Who, raw: string | null | undefined) {
  const v = (raw || '').trim().toLowerCase();
  if (!v) return;
  if (v.includes('@')) w.emails.push(v);
  else if (digits(v).length >= 9) w.phones.push(digits(v));
}
function addProfile(w: Who, profile: string | null | undefined) {
  try { const p = JSON.parse(profile || '{}'); if (p.site) { const h = host(String(p.site)); if (h) w.sites.push(h); } } catch {}
}
async function clientWho(db: DB, clientId: number): Promise<Who> {
  const w: Who = { emails: [], phones: [], sites: [] };
  const c = await db.prepare('SELECT email, phone, profile FROM clients WHERE id = ?').bind(clientId).first<{ email: string | null; phone: string | null; profile: string | null }>().catch(() => null);
  if (c) { addContact(w, c.email); addContact(w, c.phone); addProfile(w, c.profile); }
  const biz = (await db.prepare('SELECT domain FROM biz WHERE owner_id = ?').bind(clientId).all<{ domain: string | null }>().catch(() => ({ results: [] }))).results;
  for (const b of biz) if (b.domain) w.sites.push(host(b.domain));
  const leads = (await db.prepare('SELECT contact, email_addr FROM leads WHERE client_id = ?').bind(clientId).all<{ contact: string; email_addr: string | null }>().catch(() => ({ results: [] }))).results;
  for (const l of leads) { addContact(w, l.contact); addContact(w, l.email_addr); }
  return w;
}
async function leadWho(db: DB, leadId: number): Promise<Who & { clientId: number | null }> {
  const l = await db.prepare('SELECT contact, email_addr, client_id FROM leads WHERE id = ?').bind(leadId).first<{ contact: string; email_addr: string | null; client_id: number | null }>();
  const w = l?.client_id ? await clientWho(db, l.client_id) : { emails: [], phones: [], sites: [] };
  addContact(w, l?.contact); addContact(w, l?.email_addr);
  return { ...w, clientId: l?.client_id ?? null };
}
/** Same person or same company: same email, same company email domain (not gmail etc.), same phone, same site. */
export function sameOwner(a: Who, b: Who): string | null {
  if (a.emails.some((e) => b.emails.includes(e))) return 'same email';
  const dom = (e: string) => e.split('@')[1] || '';
  const ad = a.emails.map(dom).filter((d) => d && !PUBLIC_MAIL.has(d));
  if (b.emails.map(dom).some((d) => ad.includes(d))) return 'same company email domain';
  if (a.phones.some((p) => b.phones.includes(p))) return 'same phone';
  const as = a.sites.filter(Boolean);
  if (b.sites.some((s) => s && as.includes(s))) return 'same business site';
  return null;
}

/** The client's invite code; created on first ask. null when the table does not exist yet. */
export async function clientRefSlug(db: DB, clientId: number): Promise<string | null> {
  try {
    const got = await db.prepare('SELECT slug FROM client_refs WHERE client_id = ?').bind(clientId).first<{ slug: string }>();
    if (got) return got.slug;
    for (let i = 0; i < 4; i++) {
      const slug = `c_${randomCode(7)}`;
      try {
        await db.prepare('INSERT INTO client_refs (client_id, slug) VALUES (?, ?)').bind(clientId, slug).run();
        return slug;
      } catch { /* collision or race: read again */ }
      const again = await db.prepare('SELECT slug FROM client_refs WHERE client_id = ?').bind(clientId).first<{ slug: string }>();
      if (again) return again.slug;
    }
  } catch { /* migration 0034 not applied */ }
  return null;
}

/** /r/c_<code>: count the click and land on the start page with the code (Base.astro keeps it 60 days). */
export async function clientRedirect(db: DB, request: Request, slug: string): Promise<Response> {
  const url = new URL(request.url);
  const to = new URL('/start/', url);
  try {
    const r = await db.prepare('SELECT client_id FROM client_refs WHERE slug = ?').bind(slug).first<{ client_id: number }>();
    if (r) {
      await db.prepare('UPDATE client_refs SET clicks = clicks + 1 WHERE slug = ?').bind(slug).run();
      to.searchParams.set('ref', slug);
    }
  } catch {}
  return Response.redirect(to.toString(), 302);
}

/** A new lead arrived with ?ref=: record who invited them (first link wins: one row per lead, the earliest row per
 *  person counts at payment time). Bursts from one IP in a day are sent to manual review. */
export async function attributeLead(db: DB, leadId: number, ref: string | null | undefined, ip: string | null, notify?: Notify) {
  if (!ref) return;
  try {
    let kind = '', cid: number | null = null, pid: number | null = null;
    if (SLUG_C.test(ref)) {
      const r = await db.prepare('SELECT client_id FROM client_refs WHERE slug = ?').bind(ref).first<{ client_id: number }>();
      if (!r) return;
      kind = 'client'; cid = r.client_id;
    } else {
      const r = await db.prepare('SELECT partner_id FROM links WHERE slug = ? AND active = 1').bind(ref).first<{ partner_id: number }>();
      if (!r) return;
      kind = 'partner'; pid = r.partner_id;
    }
    const ipHash = ip ? (await sha(`vaxo-ref:${ip}`)).slice(0, 32) : null;
    let status = 'attributed', reason: string | null = null;
    if (ipHash && kind === 'client') {
      const n = (await db.prepare(`SELECT COUNT(*) AS n FROM referrals WHERE ip_hash = ? AND referrer_client_id = ? AND at > datetime('now', '-1 day')`).bind(ipHash, cid).first<{ n: number }>())?.n ?? 0;
      if (n + 1 >= CLIENT_REF.burstPerDay) { status = 'review'; reason = `burst: ${n + 1} invites from one IP in a day`; }
    }
    await db.prepare('INSERT OR IGNORE INTO referrals (lead_id, slug, kind, referrer_client_id, referrer_partner_id, ip_hash, friend_months, status, reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(leadId, ref, kind, cid, pid, ipHash, CLIENT_REF.friendMonths, status, reason).run();
    await db.prepare(`INSERT INTO lead_events (lead_id, actor, kind, text) VALUES (?, 'system', 'note', ?)`)
      .bind(leadId, `Came by an invite link (${kind}): the friend gets +1 gift month after the first paid payment`).run().catch(() => {});
    if (status === 'review') await notify?.(`⚠️ Реферал на проверку: заявка #${leadId}, клиент #${cid} — много приглашений с одного IP за день. Штаб → 📊 Экономика.`);
  } catch (e) { console.error('[referral attribute]', e); }
}

/** The earliest attribution for the person behind this lead (first link wins across all their leads). */
export async function firstReferral(db: DB, leadId: number): Promise<{ id: number; lead_id: number; kind: string } | null> {
  try {
    const l = await db.prepare('SELECT client_id, lower(trim(contact)) AS c FROM leads WHERE id = ?').bind(leadId).first<{ client_id: number | null; c: string }>();
    if (!l) return null;
    return await db.prepare(`SELECT r.id, r.lead_id, r.kind FROM referrals r JOIN leads d ON d.id = r.lead_id
      WHERE r.lead_id = ? OR (? IS NOT NULL AND d.client_id = ?) OR (? != '' AND lower(trim(d.contact)) = ?) ORDER BY r.at, r.id LIMIT 1`)
      .bind(leadId, l.client_id, l.client_id, l.c || '', l.c || '').first();
  } catch { return null; }
}

/** A payment was recorded. If it is the invited friend's first paid payment, the inviting client's free month goes on
 *  a 14-day hold (or is cancelled / sent to review with the reason). */
export async function referralOnPaid(db: DB, leadId: number, usd: number, paymentId: number | null, notify?: Notify) {
  try {
    const first = await firstReferral(db, leadId);
    if (!first) return;
    const ref = await db.prepare(`SELECT * FROM referrals WHERE id = ?`).bind(first.id).first<Record<string, any>>();
    if (!ref || ref.kind !== 'client' || !['attributed', 'review'].includes(ref.status) || ref.payment_id) return;
    const lead = await db.prepare('SELECT id, plan, service, interest, value_usd, contact, email_addr, client_id, page FROM leads WHERE id = ?').bind(leadId).first<Record<string, any>>();
    if (!lead) return;
    const set = (status: string, reason: string | null, extra: Record<string, unknown> = {}) => {
      const cols = Object.keys(extra);
      return db.prepare(`UPDATE referrals SET status = ?, reason = ?${cols.map((c) => `, ${c} = ?`).join('')} WHERE id = ?`).bind(status, reason, ...Object.values(extra), ref.id).run();
    };
    const plan = planOf(lead);
    const friend = await leadWho(db, leadId);
    const inviter = await clientWho(db, ref.referrer_client_id);
    if (!(usd > 0)) return;
    if (lead.page === 'test' || [...friend.emails, ...inviter.emails].some(isTestContact)) return set('cancelled', 'test account', { payment_id: paymentId });
    if (friend.clientId && friend.clientId === ref.referrer_client_id) return set('cancelled', 'self-referral: same client', { payment_id: paymentId });
    const same = sameOwner(inviter, friend);
    if (same) return set('cancelled', `self-referral: ${same}`, { payment_id: paymentId });
    if (plan === 'start') return set('cancelled', 'free plan', { payment_id: paymentId });
    // Not a new client: the person had paid us before this lead.
    const before = await db.prepare(`SELECT COUNT(*) AS n FROM payments p JOIN leads d ON d.id = p.lead_id WHERE p.status = 'ok' AND p.id != ? AND d.id != ?
      AND ((? IS NOT NULL AND d.client_id = ?) OR lower(trim(d.contact)) = lower(trim(?))) AND p.created_at < ?`)
      .bind(paymentId ?? 0, leadId, friend.clientId, friend.clientId, lead.contact || '#', ref.at).first<{ n: number }>();
    if ((before?.n ?? 0) > 0) return set('cancelled', 'not a new client', { payment_id: paymentId });
    // Yearly cap: 12 free months.
    const year = (await db.prepare(`SELECT COUNT(*) AS n FROM referrals WHERE referrer_client_id = ? AND status IN ('pending', 'credited') AND COALESCE(credited_at, at) > datetime('now', '-365 days')`).bind(ref.referrer_client_id).first<{ n: number }>())?.n ?? 0;
    if (year >= CLIENT_REF.maxMonthsYear) return set('cancelled', 'yearly limit of 12 free months reached', { payment_id: paymentId });
    // Credit value: the cheaper of the two plans (the inviter's own plan, if known).
    const mine = (await db.prepare(`SELECT plan, service, interest, value_usd FROM leads WHERE client_id = ? AND status = 'won' ORDER BY id DESC LIMIT 5`).bind(ref.referrer_client_id).all<Record<string, any>>()).results
      .map(planOf).find((p) => p && PLAN_PRICES[p] > 0) || null;
    const friendPrice = plan ? PLAN_PRICES[plan] : 0;
    const minePrice = mine ? PLAN_PRICES[mine] : 0;
    const credit = friendPrice && minePrice ? Math.min(friendPrice, minePrice) : friendPrice || minePrice || 0;
    const extra = { payment_id: paymentId, plan, credit_usd: credit || null, hold_until: new Date(Date.now() + CLIENT_REF.holdDays * 864e5).toISOString().slice(0, 19).replace('T', ' ') };
    // Unknown plan (a one-off project) or a flagged burst: the owner decides by hand.
    if (ref.status === 'review') return set('review', ref.reason, extra);
    if (!plan) return set('review', 'plan unknown: set the plan on the lead or decide by hand', extra);
    return set('pending', null, extra);
  } catch (e) { console.error('[referral paid]', e); }
  void notify;
}

/** A payment was cancelled or refunded: the reward it earned is cancelled too. */
export async function referralOnRefund(db: DB, paymentId: number) {
  try { await db.prepare(`UPDATE referrals SET status = 'cancelled', reason = 'payment refunded or cancelled' WHERE payment_id = ? AND status IN ('pending', 'review', 'credited')`).bind(paymentId).run(); } catch {}
}

/** Hourly: rewards whose 14-day hold has passed become free months. */
export async function matureReferrals(db: DB, notify?: Notify) {
  try {
    const due = (await db.prepare(`SELECT id, referrer_client_id, credit_usd FROM referrals WHERE status = 'pending' AND hold_until <= datetime('now')`).all<{ id: number; referrer_client_id: number; credit_usd: number }>()).results;
    for (const r of due) {
      await db.prepare(`UPDATE referrals SET status = 'credited', credited_at = datetime('now') WHERE id = ? AND status = 'pending'`).bind(r.id).run();
    }
    if (due.length) await notify?.(`🎁 Клиентам начислено бесплатных месяцев за друзей: ${due.length}. Учтите их в следующем счёте (Штаб → 📊 Экономика).`);
  } catch {}
}

/** The cabinet card: the link and the progress. Zeros when the tables are not there yet. */
export async function clientInvite(db: DB, clientId: number) {
  const out = { slug: null as string | null, clicks: 0, invited: 0, pending: 0, credited: 0, creditUsd: 0, yearMonths: 0, rules: CLIENT_REF, friendBonus: null as null | { months: number } };
  try {
    out.slug = await clientRefSlug(db, clientId);
    const r = await db.prepare(`SELECT COUNT(*) AS invited, SUM(status IN ('pending', 'review')) AS pending, SUM(status = 'credited') AS credited,
      COALESCE(SUM(CASE WHEN status = 'credited' THEN credit_usd END), 0) AS usd,
      SUM(status IN ('pending', 'credited') AND COALESCE(credited_at, at) > datetime('now', '-365 days')) AS year
      FROM referrals WHERE referrer_client_id = ?`).bind(clientId).first<Record<string, number>>();
    out.invited = r?.invited ?? 0; out.pending = r?.pending ?? 0; out.credited = r?.credited ?? 0; out.creditUsd = r?.usd ?? 0; out.yearMonths = r?.year ?? 0;
    out.clicks = (await db.prepare('SELECT clicks FROM client_refs WHERE client_id = ?').bind(clientId).first<{ clicks: number }>())?.clicks ?? 0;
    // This client came by an invite: show their gift month (after the first payment).
    const mine = await db.prepare(`SELECT r.friend_months FROM referrals r JOIN leads d ON d.id = r.lead_id WHERE d.client_id = ? AND r.status NOT IN ('rejected') ORDER BY r.at LIMIT 1`).bind(clientId).first<{ friend_months: number }>();
    if (mine) out.friendBonus = { months: mine.friend_months };
  } catch {}
  return out;
}

/** HQ: referrals for the economics panel, and the owner's decision on one under review. */
export async function referralAdmin(db: DB) {
  try {
    const sum = await db.prepare(`SELECT SUM(kind = 'client') AS client, SUM(kind = 'partner') AS partner, SUM(kind = 'client' AND status = 'pending') AS pending,
      SUM(kind = 'client' AND status = 'credited') AS credited, COALESCE(SUM(CASE WHEN status = 'credited' THEN credit_usd END), 0) AS credited_usd,
      COALESCE(SUM(CASE WHEN status = 'pending' THEN credit_usd END), 0) AS pending_usd, SUM(status = 'review') AS review FROM referrals`).first<Record<string, number>>();
    const review = (await db.prepare(`SELECT r.id, r.at, r.lead_id, r.referrer_client_id, r.reason, r.plan, r.credit_usd, d.name AS friend, c.email AS inviter
      FROM referrals r LEFT JOIN leads d ON d.id = r.lead_id LEFT JOIN clients c ON c.id = r.referrer_client_id WHERE r.status = 'review' ORDER BY r.id DESC LIMIT 50`).all()).results;
    const recent = (await db.prepare(`SELECT r.id, r.at, r.kind, r.status, r.reason, r.plan, r.credit_usd, r.lead_id, d.name AS friend
      FROM referrals r LEFT JOIN leads d ON d.id = r.lead_id ORDER BY r.id DESC LIMIT 30`).all()).results;
    return { ready: true, sum: sum ?? {}, review, recent };
  } catch { return { ready: false, sum: {}, review: [], recent: [] }; }
}
export async function decideReferral(db: DB, id: number, approve: boolean) {
  try {
    const r = await db.prepare(`SELECT payment_id FROM referrals WHERE id = ? AND status = 'review'`).bind(id).first<{ payment_id: number | null }>();
    if (!r) return false;
    if (!approve) await db.prepare(`UPDATE referrals SET status = 'rejected', reason = COALESCE(reason, '') || ' · rejected by the owner' WHERE id = ?`).bind(id).run();
    // Approved: paid friends go to the normal 14-day hold; not paid yet — back to waiting for the first payment.
    else await db.prepare(`UPDATE referrals SET status = CASE WHEN payment_id IS NULL THEN 'attributed' ELSE 'pending' END, reason = 'approved by the owner',
      hold_until = COALESCE(hold_until, datetime('now', '+${CLIENT_REF.holdDays} days')) WHERE id = ?`).bind(id).run();
    return true;
  } catch { return false; }
}
