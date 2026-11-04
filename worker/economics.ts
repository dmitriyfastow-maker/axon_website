// HQ → 💰 Деньги и партнёры → 📊 Экономика. Live unit economics from the real ledger: paying clients by plan, MRR,
// ARPU, new / churned, partner payouts owed, client referral credits, cost and margin per plan, LTV and plain alerts.
// Cost per client and the payment fee are editable (settings key 'econ'). Works on an empty database.
import type { DB } from './partner.js';
import { RATES } from '../src/data/partners.js';
import { PLAN_PRICES, planOf, referralAdmin, CLIENT_REF } from './referrals.js';

export const PAID_PLANS = ['personal', 'care', 'growth', 'pro'] as const;
export const ECON_DEFAULT = { cost: { personal: 4, care: 6, growth: 15, pro: 35 } as Record<string, number>, fee: 4, churn: 5 };
const ACTIVE_DAYS = 35; // a monthly subscription counts as active this long after its last payment

export async function econSettings(db: DB) {
  try {
    const v = (await db.prepare(`SELECT value FROM settings WHERE key = 'econ'`).first<{ value: string }>())?.value;
    const s = v ? JSON.parse(v) : {};
    return { cost: { ...ECON_DEFAULT.cost, ...(s.cost || {}) }, fee: Number.isFinite(s.fee) ? s.fee : ECON_DEFAULT.fee, churn: Number.isFinite(s.churn) ? s.churn : ECON_DEFAULT.churn };
  } catch { return ECON_DEFAULT; }
}

export async function saveEconSettings(db: DB, b: Record<string, unknown>) {
  const cur = await econSettings(db);
  const num = (x: unknown, lo: number, hi: number, d: number) => { const n = Number(x); return Number.isFinite(n) && n >= lo && n <= hi ? Math.round(n * 100) / 100 : d; };
  const cost: Record<string, number> = {};
  const bc = (b.cost || {}) as Record<string, unknown>;
  for (const p of PAID_PLANS) cost[p] = num(bc[p], 0, 1000, cur.cost[p]);
  const v = { cost, fee: num(b.fee, 0, 30, cur.fee), churn: num(b.churn, 0, 100, cur.churn) };
  await db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value').bind('econ', JSON.stringify(v)).run();
  return v;
}

const monthStart = (offset: number) => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + offset, 1)); };
const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Unit table per plan, worst case (every client via a partner with a team sponsor; or via a client invite). */
export function unitTable(st: { cost: Record<string, number>; fee: number }) {
  return PAID_PLANS.map((p) => {
    const price = PLAN_PRICES[p], cost = st.cost[p] ?? 0, fee = (price * st.fee) / 100;
    const first = (price * RATES.agencyOwn) / 100, later = (price * RATES.agencyRenewal) / 100, team = (price * RATES.team) / 100;
    const credit = price; // worst case: the inviter's free month is worth this plan
    const freeCost = CLIENT_REF.friendMonths * cost; // an invited friend's 2 free months still cost us
    const r = (n: number) => Math.round(n * 100) / 100;
    return {
      plan: p, price, cost, fee: r(fee), partnerFirst: r(first), partnerLater: r(later), team: r(team), credit, freeCost: r(freeCost),
      m1Partner: r(price - cost - fee - first - team), m2Partner: r(price - cost - fee - later - team),
      m1Client: r(price - cost - fee - credit), m2Direct: r(price - cost - fee),
      margin: r(price - cost - fee), marginPct: price ? Math.round(((price - cost - fee) / price) * 100) : 0,
    };
  });
}

type Sub = { lead: number; plan: string; first: string; last: string; lastUsd: number; yearly: boolean };

/** Every won lead with a paid plan and its payments (USD). */
async function subscriptions(db: DB): Promise<Sub[]> {
  try {
    const usdRate = (await db.prepare(`SELECT rate FROM payments WHERE currency = 'USD' ORDER BY id DESC LIMIT 1`).first<{ rate: number }>())?.rate || 41.5;
    const leads = (await db.prepare(`SELECT d.id, d.service, d.interest, d.value_usd, d.contact, d.page${await hasPlan(db) ? ', d.plan' : ''}
      FROM leads d WHERE d.status = 'won' AND COALESCE(d.page, '') != 'test' AND COALESCE(d.contact, '') NOT LIKE 'test%' AND COALESCE(d.contact, '') NOT LIKE '%@vaxogroup.com'`).all<Record<string, any>>()).results;
    const out: Sub[] = [];
    for (const l of leads) {
      const plan = planOf(l);
      if (!plan || !(PLAN_PRICES[plan] > 0)) continue;
      const pays = (await db.prepare(`SELECT at, amount, currency, amount_uah FROM payments WHERE lead_id = ? AND status = 'ok' ORDER BY at`).bind(l.id).all<{ at: string; amount: number; currency: string; amount_uah: number }>()).results;
      if (!pays.length) continue;
      const lastP = pays[pays.length - 1];
      const lastUsd = lastP.currency === 'USD' ? lastP.amount : lastP.amount_uah / usdRate;
      out.push({ lead: l.id, plan, first: pays[0].at, last: lastP.at, lastUsd, yearly: lastUsd >= PLAN_PRICES[plan] * 9 });
    }
    return out;
  } catch { return []; }
}
async function hasPlan(db: DB) {
  try { await db.prepare('SELECT plan FROM leads LIMIT 1').first(); return true; } catch { return false; }
}

export async function economics(db: DB) {
  const st = await econSettings(db);
  const subs = await subscriptions(db);
  const now = Date.now();
  const days = (s: string) => (now - Date.parse(`${s.slice(0, 10)}T00:00:00Z`)) / 864e5;
  const active = subs.filter((s) => days(s.last) <= (s.yearly ? 366 : ACTIVE_DAYS));
  const byPlan: Record<string, { n: number; mrr: number }> = Object.fromEntries(PAID_PLANS.map((p) => [p, { n: 0, mrr: 0 }]));
  for (const s of active) {
    const m = s.yearly ? (PLAN_PRICES[s.plan] * 10) / 12 : PLAN_PRICES[s.plan];
    byPlan[s.plan].n += 1; byPlan[s.plan].mrr += m;
  }
  const paying = active.length;
  const mrr = Math.round(Object.values(byPlan).reduce((a, b) => a + b.mrr, 0) * 100) / 100;
  const thisM = iso(monthStart(0)), lastM = iso(monthStart(-1)), nextM = iso(monthStart(1));
  const inMonth = (d: string, a: string, b: string) => d >= a && d < b;
  const churnDate = (s: Sub) => { const t = new Date(`${s.last.slice(0, 10)}T00:00:00Z`); t.setUTCDate(t.getUTCDate() + (s.yearly ? 366 : ACTIVE_DAYS)); return t.getTime() < now ? iso(t) : null; };
  const flow = {
    newThis: subs.filter((s) => inMonth(s.first.slice(0, 10), thisM, nextM)).length,
    newLast: subs.filter((s) => inMonth(s.first.slice(0, 10), lastM, thisM)).length,
    churnThis: subs.filter((s) => { const c = churnDate(s); return c && inMonth(c, thisM, nextM); }).length,
    churnLast: subs.filter((s) => { const c = churnDate(s); return c && inMonth(c, lastM, thisM); }).length,
  };
  // Real monthly churn when there is history; otherwise the setting.
  const base = paying + flow.churnThis - flow.newThis;
  const realChurn = base > 0 && subs.length >= 5 ? Math.round((flow.churnLast / Math.max(1, base)) * 1000) / 10 : null;
  const churn = realChurn ?? st.churn;

  // Partner payouts owed, by type.
  const owed = { first: 0, later: 0, team: 0, manager: 0, total: 0, count: 0 };
  try {
    const rows = (await db.prepare(`SELECT kind, SUM(amount_usd) AS usd, COUNT(*) AS n FROM payouts WHERE status = 'due' GROUP BY kind`).all<{ kind: string; usd: number; n: number }>()).results;
    for (const r of rows) {
      const k: 'first' | 'later' | 'team' | 'manager' = r.kind.startsWith('renewal-team') || r.kind === 'team' ? 'team' : r.kind.startsWith('renewal') ? 'later' : r.kind === 'manager' ? 'manager' : 'first';
      owed[k] += r.usd || 0; owed.total += r.usd || 0; owed.count += r.n || 0;
    }
  } catch {}
  const refs = await referralAdmin(db);
  const units = unitTable(st);
  const plans = PAID_PLANS.map((p) => {
    const u = units.find((x) => x.plan === p)!;
    const ltv = churn > 0 ? Math.round((u.margin / (churn / 100)) * 100) / 100 : null;
    return { plan: p, price: PLAN_PRICES[p], clients: byPlan[p].n, mrr: Math.round(byPlan[p].mrr * 100) / 100, cost: u.cost, fee: u.fee, margin: u.margin, marginPct: u.marginPct, ltv, ltvPartner: churn > 0 ? Math.round(((u.m2Partner / (churn / 100)) - (u.m2Partner - u.m1Partner)) * 100) / 100 : null };
  });
  const NAMES: Record<string, string> = { personal: 'Personal', care: 'Care', growth: 'Growth', pro: 'Pro' };
  const alerts: { level: 'r' | 'y' | 'g'; text: string }[] = [];
  for (const p of plans) if (p.marginPct < 40) alerts.push({ level: 'r', text: `Маржа ${NAMES[p.plan]} ниже 40% (${p.marginPct}%): поднимите цену или снизьте себестоимость.` });
  for (const u of units) if (u.m1Partner < 0) alerts.push({ level: 'y', text: `${NAMES[u.plan]} через партнёра: первый платный месяц в минусе (${u.m1Partner} $) — окупается со второго месяца.` });
  if (flow.churnThis > flow.churnLast && flow.churnThis > 0) alerts.push({ level: 'r', text: `Отток вырос: в этом месяце ушло ${flow.churnThis}, в прошлом ${flow.churnLast}.` });
  if (flow.newThis < flow.newLast) alerts.push({ level: 'y', text: `Новых клиентов меньше, чем в прошлом месяце (${flow.newThis} против ${flow.newLast}).` });
  if (mrr > 0 && owed.total > mrr * 0.5) alerts.push({ level: 'y', text: `Долг партнёрам (${Math.round(owed.total)} $) больше половины MRR — проверьте вкладку «💸 Выплаты».` });
  const review = Number((refs.sum as Record<string, number>).review || 0);
  if (review) alerts.push({ level: 'y', text: `${review} приглашений клиентов ждут ручной проверки (ниже).` });
  if (!paying) alerts.push({ level: 'g', text: 'Платящих клиентов пока нет — живые цифры появятся после первой оплаты. Таблица и прогноз ниже уже работают.' });
  if (!refs.ready) alerts.push({ level: 'y', text: 'Миграция 0034 (приглашения клиентов) ещё не применена к базе — бонусы клиентов пока не считаются.' });
  return {
    settings: st, defaults: ECON_DEFAULT, prices: PLAN_PRICES, rates: RATES, friendMonths: CLIENT_REF.friendMonths,
    paying, mrr, arpu: paying ? Math.round((mrr / paying) * 100) / 100 : 0, flow, churn, realChurn, plans, units, owed, referrals: refs, alerts,
  };
}
