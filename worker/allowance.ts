// Allowance (Decision 34): every plan has a daily and a weekly allowance of Vax replies in the client's private chat.
// Trial month (no paid invoice yet) = one third. Counted from the messages table (sender 'ai'), so no new table is needed.
// Caps are fair-use numbers, far below real cost; the client only ever sees bars and percentages, never units.
import type { DB } from './partner.js';

export const CAPS: Record<string, [number, number]> = { start: [50, 200], personal: [80, 320], care: [150, 700], growth: [400, 2000], pro: [1000, 5000] };
const ORDER = ['start', 'personal', 'care', 'growth', 'pro'];

export interface Allowance { plan: string; trial: boolean; day: { used: number; cap: number }; week: { used: number; cap: number }; blocked: 'day' | 'week' | null }

export async function allowance(db: DB, leadIds: number[]): Promise<Allowance> {
  const ids = leadIds.length ? leadIds : [0];
  const q = ids.map(() => '?').join(',');
  let plan = 'start', trial = false;
  try {
    const rows = (await db.prepare(`SELECT plan FROM leads WHERE id IN (${q}) AND plan IS NOT NULL`).bind(...ids).all<{ plan: string }>()).results;
    plan = rows.map((r) => r.plan).filter((p) => ORDER.includes(p)).sort((a, b) => ORDER.indexOf(b) - ORDER.indexOf(a))[0] || 'start';
    if (plan !== 'start') trial = !(await db.prepare(`SELECT 1 FROM invoices WHERE lead_id IN (${q}) AND status = 'paid' LIMIT 1`).bind(...ids).first());
  } catch { /* before migration 0034 */ }
  const [cd, cw] = CAPS[plan];
  const k = trial ? 3 : 1;
  const count = async (mod: string) => (await db.prepare(`SELECT COUNT(*) AS n FROM messages WHERE lead_id IN (${q}) AND sender = 'ai' AND at > datetime('now', ?)`).bind(...ids, mod).first<{ n: number }>())?.n ?? 0;
  const day = { used: await count('-1 day'), cap: Math.max(5, Math.round(cd / k)) };
  const week = { used: await count('-7 days'), cap: Math.max(15, Math.round(cw / k)) };
  return { plan, trial, day, week, blocked: day.used >= day.cap ? 'day' : week.used >= week.cap ? 'week' : null };
}

export function limitText(lang: string | null, a: Allowance): string {
  const w = a.blocked === 'week';
  if (lang === 'ru') return `${w ? 'Недельный' : 'Дневной'} запас закончился — он ${w ? 'обновится в течение недели' : 'обновится завтра'}. Всё, что мы обсудили, сохранено. Если нужно продолжить сейчас: можно перейти на тариф выше в кабинете или написать «докупить» — команда пришлёт счёт на дополнительный запас, тариф менять не нужно.`;
  if (lang === 'ua') return `${w ? 'Тижневий' : 'Денний'} запас закінчився — він ${w ? 'оновиться протягом тижня' : 'оновиться завтра'}. Усе, що ми обговорили, збережено. Якщо потрібно продовжити зараз: можна перейти на вищий тариф у кабінеті або написати «докупити» — команда надішле рахунок на додатковий запас, тариф міняти не треба.`;
  return `Your ${w ? 'weekly' : 'daily'} allowance is used up — it ${w ? 'renews within the week' : 'renews tomorrow'}. Everything we discussed is saved. To continue right now you can move up a plan in your cabinet, or write “top up” — the team will send an invoice for extra allowance, no plan change needed.`;
}

/* Workspace limits (Decision 43b): like Claude, a share of a daily and a weekly budget of WORK, not a count of messages.
   A short answer costs 1, a deep one 2, a tool +1, a site draft or a picture 3, a Claude answer what it really cost
   (1 unit per cent). Kept in its own ledger, so deleting a chat does not give the work back. Calendar windows: the day
   renews at 00:00 UTC, the week on Monday 00:00 UTC. The person sees percentages and the time it renews, never units. */
export type Work = { short?: boolean; deep?: boolean; tool?: boolean; site?: boolean; image?: boolean; usd?: number };
export function workOf(w: Work): number {
  let n = w.site || w.image ? 3 : w.deep ? 2 : 1;
  if (w.usd) n = Math.max(n, w.usd * 100);
  if (w.tool) n += 1;
  return Math.round(n * 10) / 10;
}

export function windows(now = new Date()) {
  const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const week = new Date(day); week.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  const nextDay = new Date(day); nextDay.setUTCDate(day.getUTCDate() + 1);
  const nextWeek = new Date(week); nextWeek.setUTCDate(week.getUTCDate() + 7);
  const sql = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' ');
  return { day: sql(day), week: sql(week), dayReset: nextDay.toISOString(), weekReset: nextWeek.toISOString() };
}

/** Decision 50: a monthly budget of work you may use at any pace (all of it in one day if you need to). It renews on the
 *  1st of each month, also on 3/6/12-month plans, so prepaid months never run ahead of the money. Units are cents of AI
 *  spend for Claude answers (a free-model answer costs 1–3), so the budget is about 40% of the plan price: never a loss. */
// 15.11 (Decision 52 v2): bigger plans give more work per dollar (Plus ×1, Pro ×2.5, Max ×8.5, Ultra ×20), and no plan
// spends more than ~38% of its price on AI. Worst case of a FIRST payment via a partner (50% + team 10% of the net, tax,
// card fee, the whole volume used) ends at about zero; renewals stay positive even with the loyalty or level bonus.
export const MONTH_CAPS: Record<string, number> = { start: 300, personal: 570, care: 1425, growth: 4845, pro: 11400 };
/** Extra allowance (top-up): a one-off pack on top of this month's budget, at the same rate as the plans (40% of the
 *  price goes to AI, so a pack is never a loss). Bought as an invoice whose description names the month, so it counts
 *  only for that month even when it is paid a few days later. EMPTY = switched off until Dmitry's "yes" on the price
 *  (hq ask 12.11, proposal [5, 10, 25]). The description must NOT start with "Vaxo ": monthly billing treats those as
 *  subscription invoices. */
export const TOPUP_PACKS: number[] = [];
export const TOPUP_RATE = 40; // allowance units (AI cents) per $1
export const TOPUP_DESC = 'Extra allowance for Vaxo Workspace';
export const topupDesc = (usd: number, month: string) => `${TOPUP_DESC}, +$${usd} for ${month}`;
/** Level rewards (Decision 51): extra work volume. Not added to the loyalty bonus — the larger of the two counts — so the
 *  worst case stays near zero even on Ultra. The level is saved by the workspace when it counts the progress. */
export const GAME_BONUS = [0, 0, 0, 10, 10, 15, 15, 20, 20, 25, 30];
export const WELCOME = { pct: 50, paid: 20 };
export type Limits = { day: { pct: number; reset: string }; week: { pct: number; reset: string }; month: { pct: number; reset: string }; blocked: 'month' | null; packs: number[]; gift?: { pct: number; until: string }; invited?: boolean; friends?: number };
export async function wsLimits(db: DB, clientId: number, plan: string): Promise<Limits> {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)), next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  // Loyalty bonus (Decision 50): from the 4th paid month the monthly budget is 20% larger. Renewals earn Vaxo more (a
  // partner gets 30% instead of 50%), and part of that goes back to the people who stay.
  const paidMonths = plan === 'start' ? 0 : (await db.prepare(`SELECT COUNT(*) AS n FROM invoices i JOIN leads l ON l.id = i.lead_id WHERE l.client_id = ? AND i.status = 'paid' AND i.description LIKE 'Vaxo %subscription%'`).bind(clientId).first<{ n: number }>().catch(() => null))?.n ?? 0;
  const extra = (await db.prepare(`SELECT COALESCE(SUM(i.amount), 0) AS n FROM invoices i JOIN leads l ON l.id = i.lead_id WHERE l.client_id = ? AND i.status = 'paid' AND i.currency = 'USD' AND i.description LIKE ?`).bind(clientId, `${TOPUP_DESC}, % for ${start.toISOString().slice(0, 7)}`).first<{ n: number }>().catch(() => null))?.n ?? 0;
  const lv = Number((await db.prepare('SELECT value FROM settings WHERE key = ?').bind('game_lv_' + clientId).first<{ value: string }>().catch(() => null))?.value) || 1;
  const mult = Math.max(paidMonths >= 3 ? 1.2 : 1, plan === 'start' || paidMonths >= 2 ? 1 + (GAME_BONUS[lv] ?? 0) / 100 : 1);
  // Cashback (Decision 52 v2): 5% of every renewal paid this month (not the first payment) back as Vax bonuses = more work.
  const renew = plan === 'start' || paidMonths < 2 ? 0 : (await db.prepare(`SELECT COALESCE(SUM(i.amount), 0) AS n FROM invoices i JOIN leads l ON l.id = i.lead_id WHERE l.client_id = ? AND i.status = 'paid' AND i.currency = 'USD' AND i.description LIKE 'Vaxo %subscription%' AND i.at >= ? AND i.id > (SELECT MIN(i2.id) FROM invoices i2 JOIN leads l2 ON l2.id = i2.lead_id WHERE l2.client_id = ? AND i2.status = 'paid' AND i2.description LIKE 'Vaxo %subscription%')`).bind(clientId, start.toISOString().slice(0, 19).replace('T', ' '), clientId).first<{ n: number }>().catch(() => null))?.n ?? 0;
  const cashback = renew * 0.935 * 0.05 * TOPUP_RATE;
  // Welcome gift (Decision 57, 17.11): whoever came by an invite link (a client's or a partner's) gets more work for their
  // first 30 days. +50%; only a PAID plan that came through a PARTNER gets +10%, so the first payment, of which the
  // partner keeps 50%, still does not go below zero.
  // Decision 59 (17.11): the bonus covers the whole first purchase, a month or a year: +25% of the volume for the entire
  // prepaid period (Free: +50% for 30 days). A monthly payment by a PARTNER's link gets +10% for that month, because
  // the partner keeps 50% of it. Prepaid periods pay the partner as if monthly (payouts.ts), which funds the +25%.
  const ref = await db.prepare(`SELECT r.kind, r.at, r.lead_id FROM referrals r JOIN leads d ON d.id = r.lead_id WHERE d.client_id = ? AND r.status NOT IN ('rejected', 'cancelled') AND r.at > datetime('now', '-400 day') ORDER BY r.at LIMIT 1`).bind(clientId).first<{ kind: string; at: string; lead_id: number }>().catch(() => null);
  const period = ref && plan !== 'start' ? Math.max(1, Math.min(12, Number((await db.prepare('SELECT value FROM settings WHERE key = ?').bind('period_' + ref.lead_id).first<{ value: string }>().catch(() => null))?.value) || 1)) : 1;
  // Decision 62 (17.11): one simple bonus for everyone who came by a link: +20% of the strong-model volume for the whole
  // first paid plan. At full use it still leaves Vaxo in the plus on every plan, even with the partner's 50% (see
  // research/decision-62.md). The Free plan needs no bonus: its base model has no limit.
  const giftPct = !ref || plan === 'start' ? 0 : WELCOME.paid;
  // The partner takes 50% of the whole first payment (a year too), so a prepaid plan by a partner's link gets the +20%
  // for its first month; by a client's link (no commission) for the whole prepaid period.
  const giftEnd = ref ? Date.parse(ref.at.replace(' ', 'T') + 'Z') + ((ref.kind === 'partner' ? 1 : period) * 31 + 7) * 864e5 : 0;
  const gift = ref && giftPct && giftEnd > Date.now() ? { pct: giftPct, until: new Date(giftEnd).toISOString() } : undefined;
  // The inviting client (Decision 57 v2): for each friend whose first payment stayed 14 days, half of the FRIEND's plan
  // volume for 30 days. It costs at most ~20% of the friend's payment, so every invite stays in the plus.
  const friends = (await db.prepare(`SELECT plan FROM referrals WHERE referrer_client_id = ? AND status IN ('credited', 'applied') AND credited_at > datetime('now', '-30 day')`).bind(clientId).all<{ plan: string | null }>().catch(() => ({ results: [] as { plan: string | null }[] }))).results || [];
  const forFriends = friends.reduce((a, f) => a + (MONTH_CAPS[f.plan || ''] ?? 0) * WELCOME.pct / 100, 0);
  const cap = Math.round((MONTH_CAPS[plan] ?? MONTH_CAPS.start) * mult * (1 + (gift ? giftPct : 0) / 100) + forFriends + extra * TOPUP_RATE + cashback);
  const used = (await db.prepare('SELECT COALESCE(SUM(work), 0) AS n FROM ws_work WHERE client_id = ? AND at >= ?').bind(clientId, start.toISOString().slice(0, 19).replace('T', ' ')).first<{ n: number }>().catch(() => null))?.n ?? 0;
  const m = { pct: Math.min(100, Math.round((used / cap) * 100)), reset: next.toISOString() };
  return { day: m, week: m, month: m, blocked: used >= cap ? 'month' : null, packs: plan === 'start' ? [] : TOPUP_PACKS, ...(gift ? { gift } : {}), ...(ref ? { invited: true } : {}), ...(forFriends ? { friends: friends.length } : {}) };
}
export async function wsLimitsOld(db: DB, clientId: number, plan: string) {
  const w = windows();
  const [cd, cw] = CAPS[plan] ?? CAPS.start;
  const sum = async (from: string) => (await db.prepare('SELECT COALESCE(SUM(work), 0) AS n FROM ws_work WHERE client_id = ? AND at >= ?').bind(clientId, from).first<{ n: number }>().catch(() => null))?.n ?? 0;
  const [d, wk] = [await sum(w.day), await sum(w.week)];
  const pct = (u: number, c: number) => Math.min(100, Math.round((u / c) * 100));
  return { day: { pct: pct(d, cd), reset: w.dayReset }, week: { pct: pct(wk, cw), reset: w.weekReset } };
}
export const spendWork = (db: DB, clientId: number, work: number) => db.prepare('INSERT INTO ws_work (client_id, work) VALUES (?, ?)').bind(clientId, work).run();
