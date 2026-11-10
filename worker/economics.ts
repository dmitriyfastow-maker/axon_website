// HQ → 💰 Деньги и партнёры → 📊 Экономика. Live unit economics from the real ledger: paying clients by plan, MRR,
// ARPU, new / churned, partner payouts owed, client referral credits, cost and margin per plan, LTV and plain alerts.
// Cost per client and the payment fee are editable (settings key 'econ'). Works on an empty database.
import type { DB } from './partner.js';
import { RATES } from '../src/data/partners.js';
import { PLAN_PRICES, planOf, referralAdmin, CLIENT_REF } from './referrals.js';
import { freeDaysSince } from './billing.js';
import { FREE_CAP } from './router.js';

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
    const freeCost = cost; // the referral free month costs us only the AI cost; direct clients pay from day one (Decision 50)
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
      const free = await freeDaysSince(db, l.id, lastP.at); // gift months given without a payment keep the client active
      const lastDay = free ? new Date(Date.parse(`${lastP.at.slice(0, 10)}T00:00:00Z`) + free * 864e5).toISOString().slice(0, 10) : lastP.at;
      out.push({ lead: l.id, plan, first: pays[0].at, last: lastDay, lastUsd, yearly: lastUsd >= PLAN_PRICES[plan] * 9 });
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
  const NAMES: Record<string, string> = { personal: 'Plus', care: 'Pro', growth: 'Max', pro: 'Ultra' };
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
  const advice = buildAdvice({ st, units, plans, paying, mrr, churn, flow, owed, refs: refs.sum as Record<string, number>, ready: refs.ready });
  const log = await decisionLog(db, advice);
  return {
    advice, log,
    settings: st, defaults: ECON_DEFAULT, prices: PLAN_PRICES, rates: RATES, friendMonths: CLIENT_REF.friendMonths,
    paying, mrr, arpu: paying ? Math.round((mrr / paying) * 100) / 100 : 0, flow, churn, realChurn, plans, units, owed, referrals: refs, alerts,
  };
}

export type Advice = { id: string; title: string; why: string; decision: string; next: string; auto: boolean; level: 'r' | 'y' | 'g' };

/** Plain-language decisions with reasons: what Claude decided, why, what comes next, and whether it runs by itself. Rule-based on the live ledger. */
function buildAdvice(c: { st: { cost: Record<string, number>; fee: number }; units: ReturnType<typeof unitTable>; plans: { plan: string; clients: number; marginPct: number }[]; paying: number; mrr: number; churn: number; flow: { newThis: number; churnThis: number }; owed: { total: number }; refs: Record<string, number>; ready: boolean }): Advice[] {
  const out: Advice[] = [];
  const u = (p: string) => c.units.find((x) => x.plan === p)!;
  const personal = u('personal');
  out.push({
    id: 'start-free', level: 'g', auto: true, title: 'Бесплатный тариф $0 — вход, а не убыток',
    why: `После Решения 50 пробного месяца нет. Бесплатный тариф даёт все функции, но ИИ на нём — Claude Haiku под жёсткими потолками: $${FREE_CAP.user} на аккаунт, $${FREE_CAP.ip} на сеть, $${FREE_CAP.all} на всех бесплатных в месяц. Худший случай — $${FREE_CAP.all}/мес из выручки, не больше. На сайте пометка «Сделано на Vaxo» и noindex — бесплатный тариф ещё и реклама.`,
    decision: 'Оставляем $0 со всеми функциями. Свой домен, без пометки и сильные модели — только на платном.',
    next: `Следим за долей «Бесплатный → платный». Ниже 3% за месяц или общий потолок $${FREE_CAP.all} выбран раньше 20-го — усиливаю первый результат и снижаю потолок на аккаунт.`,
  });
  out.push({
    id: 'personal-19', level: personal.marginPct >= 60 ? 'g' : 'y', auto: true, title: `Плюс $19: прибыльный при лимите задач (маржа ${personal.marginPct}%)`,
    why: `ChatGPT и Claude стоят около $20 — по цене мы не дешевле, нас покупают за то, что мы делаем за человека. Цена $19, наш расход ~$${personal.cost} + комиссия ~$${personal.fee} = остаётся $${personal.margin}. Платят с первого дня (пробного месяца нет). Через партнёра первый месяц бесплатный, 1-й платный почти в ноль ($${personal.m1Partner}), со 2-го $${personal.m2Partner}. При годовой оплате (−20%) остаётся ~$${Math.round((personal.price * 0.8 - personal.cost - personal.fee) * 100) / 100}/мес. Это расчёт, фактов пока нет.`,
    decision: 'Оставляем при лимите задач в месяц и одном возврате 14 дней на человека.',
    next: 'После первых 10 платящих сверяю реальный расход. Расход выше $8 — предлагаю поднять цену до $24 или урезать лимит (через hq.sh ask).',
  });
  out.push({
    id: 'fair-use', level: 'g', auto: true, title: 'Бесплатное с границей: халявщики не прожгут бюджет',
    why: `Каждое бесплатное имеет потолок: бесплатный тариф — ИИ до $${FREE_CAP.user} на аккаунт и $${FREE_CAP.ip} на сеть; одноразовые почты закрыты при входе; возврат 14 дней — один раз на человека; первый месяц бесплатно — только по партнёрской ссылке; подарки за приглашения — только из пришедших денег, до 12 в год.`,
    decision: 'Vax объясняет эти границы дружелюбно и без исключений. Ваши личные деньги нигде не закладываются: расходы на ИИ идут из выручки.',
    next: 'Если общий потолок бесплатных выбирается каждый месяц без оплат — ставлю подтверждение телефона и снижаю потолок на аккаунт.',
  });
  const gift = c.refs.credited_usd || 0, pend = c.refs.pending_usd || 0;
  out.push({
    id: 'gifts', level: c.mrr > 0 && gift + pend > c.mrr * 0.25 ? 'y' : 'g', auto: true, title: 'Подарочные месяцы — только из пришедших денег',
    why: `Подарок выдаётся после первой оплаты друга и 14 дней без возврата; его цена — не больше самой оплаты, поэтому он всегда оплачен заранее. Сейчас подарков ждёт/выдано на $${Math.round(pend + gift)}. Система сама вычитает подарок из следующего счёта (раз в час), вручную ничего вписывать не нужно.`,
    decision: 'Один подарок на один счёт, не больше 12 в год на клиента, возврат отменяет подарок, накрутка (один человек, один IP, свой же аккаунт) уходит на проверку.',
    next: c.mrr > 0 && gift + pend > c.mrr * 0.25 ? 'Подарки превысили 25% месячной выручки — сокращаю годовой лимит до 6.' : 'Следим: если подарки превысят 25% месячной выручки, сокращаю годовой лимит.',
  });
  const neg = c.units.filter((x) => x.m1Partner < 0);
  if (neg.length) out.push({ id: 'partner-m1', level: 'y', auto: true, title: 'Первый платный месяц через партнёра — в минусе, со второго окупается',
    why: `${neg.map((x) => `${x.plan}: ${x.m1Partner} $`).join('; ')} в первый месяц (партнёру 50% + бонус команде). Это плата за привлечение клиента без рекламы: вторую оплату клиент приносит уже с прибылью.`,
    decision: 'Оставляем: платим партнёру только после оплаты клиента, а не за показы.', next: 'Смотрю долю клиентов, дошедших до 2-го платного месяца. Если ниже 60% — снижаю первую ставку для этого тарифа.' });
  if (c.paying === 0) out.push({ id: 'traffic', level: 'y', auto: true, title: 'Платящих клиентов пока нет — главное сейчас трафик и доверие',
    why: 'Сайт работает, большая часть визитов — боты, живых людей десятки. Любые цены не проверены рынком.',
    decision: 'Усиливаю бесплатный вход (мини-результат), ролики Vaxo и холодные сообщения в безопасных лимитах.', next: 'После 5–10 платных — пересчитываю цены и себестоимость по фактам.' });
  if (c.flow.churnThis > 0 && c.flow.churnThis >= c.flow.newThis) out.push({ id: 'churn', level: 'r', auto: true, title: 'Уходят не меньше, чем приходят',
    why: `Ушло ${c.flow.churnThis}, пришло ${c.flow.newThis} в этом месяце; месячный отток ~${c.churn}%.`, decision: 'Пишу ушедшим и спрашиваю причину, ищу слабое место в первом месяце.', next: 'Результат — в «📋 Работа Claude» и здесь.' });
  if (c.mrr > 0 && c.owed.total > c.mrr * 0.5) out.push({ id: 'owed', level: 'y', auto: false, title: 'Долг партнёрам больше половины выручки', why: `К выплате $${Math.round(c.owed.total)} при MRR $${Math.round(c.mrr)}.`, decision: 'Выплаты — только после оплаты клиентов и через ФОП.', next: 'Проверьте «💸 Выплаты».' });
  if (!c.ready) out.push({ id: 'mig', level: 'y', auto: false, title: 'Не применена миграция 0034', why: 'Без неё приглашения клиентов не считаются.', decision: 'Нужно «да» на применение.', next: 'После «да» применяю сам.' });
  return out;
}

/** Keeps a dated trail of decisions so the owner (and clients, on request) can always see what was decided and why. */
async function decisionLog(db: DB, advice: Advice[]) {
  try {
    const row = (await db.prepare(`SELECT value FROM settings WHERE key = 'econ_log'`).first<{ value: string }>())?.value;
    const log: { at: string; id: string; title: string; decision: string; why: string }[] = row ? JSON.parse(row) : [];
    const today = new Date().toISOString().slice(0, 10);
    let changed = false;
    for (const a of advice) {
      const last = log.find((x) => x.id === a.id);
      if (!last || last.decision !== a.decision) {
        log.unshift({ at: today, id: a.id, title: a.title, decision: a.decision, why: a.why }); changed = true;
      }
    }
    if (changed) await db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value').bind('econ_log', JSON.stringify(log.slice(0, 60))).run();
    return log.slice(0, 30);
  } catch { return []; }
}
