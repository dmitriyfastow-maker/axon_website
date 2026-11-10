// Monthly subscription billing on autopilot (05.11.2026). Hourly: every paying subscription client whose paid month is about
// to end gets the next invoice in the project chat — and the gift months earned through invitations are taken off by the
// system itself, nobody types anything. A gift is only a discount on OUR invoice (never cash) and never exceeds the credit
// that was fixed when real money came in (referrals.credit_usd), so a gift is always paid for by an earlier payment.
// Order: first the client's own reward for friends they invited, then the friend's own gift month (after the friend's first paid
// month passed the 14-day hold). One gift per invoice. Works before / without migration 0034 (everything is try/catch).
import type { DB } from './partner.js';
import type { Notify } from './deals.js';
import { createInvoice } from './invoices.js';
import { PLAN_PRICES, planOf } from './referrals.js';
import { planCharge } from './autopay.js';

const ORIGIN = 'https://vaxogroup.com';
const LEAD_DAYS = 3;       // invoice goes out this many days before the paid month ends
const MONTH_DAYS = 30;
const MAX_PER_RUN = 20;
/** Decision 50: pay for 1, 3, 6 or 12 months at once, the longer the cheaper. */
export const PERIODS: Record<number, number> = { 1: 0, 3: 0.1, 6: 0.15, 12: 0.2 };
export const periodPrice = (price: number, months: number) => Math.round(price * months * (1 - (PERIODS[months] ?? 0)));
export async function periodOf(db: DB, leadId: number): Promise<number> {
  const v = Number((await db.prepare('SELECT value FROM settings WHERE key = ?').bind(`period_${leadId}`).first<{ value: string }>().catch(() => null))?.value || 1);
  return v in PERIODS ? v : 1;
}
const MONTHS_W: Record<string, [string, string, string]> = { ru: ['месяц', 'месяца', 'месяцев'], ua: ['місяць', 'місяці', 'місяців'], en: ['month', 'months', 'months'] };
const periodWords = (lang: string, m: number) => { const w = MONTHS_W[lang] || MONTHS_W.en; return m === 1 ? w[0] : `${m} ${m === 3 ? w[1] : w[2]}`; };
const PLAN_NAME: Record<string, string> = { personal: 'Plus', care: 'Pro', growth: 'Max', pro: 'Ultra' };

const GIFT_FULL: Record<string, string> = {
  en: '🎁 Good news: next month of your {plan} plan is a gift for inviting a friend (or for joining by an invite). Nothing to pay — everything keeps working. Thank you!',
  ru: '🎁 Хорошая новость: следующий месяц тарифа {plan} — подарок за приглашение друга (или за то, что вы пришли по приглашению). Платить ничего не нужно, всё продолжает работать. Спасибо!',
  ua: '🎁 Гарна новина: наступний місяць тарифу {plan} — подарунок за запрошення друга (або за те, що ви прийшли за запрошенням). Платити нічого не треба, усе працює далі. Дякуємо!',
};
const GIFT_PART: Record<string, string> = {
  en: '🎁 A gift month is applied to your next {plan} invoice: −${off}.',
  ru: '🎁 К следующему счёту за тариф {plan} применён подарочный месяц: −${off}.',
  ua: '🎁 До наступного рахунку за тариф {plan} застосовано подарунковий місяць: −${off}.',
};

type Row = { id: number; client_id: number | null; lang: string | null; plan?: string | null; service: string | null; interest: string | null; value_usd: number | null };

/** Gift days that were given for free (no payment) after the last real payment. */
export async function freeDaysSince(db: DB, leadId: number, since: string): Promise<number> {
  try {
    const n = (await db.prepare(`SELECT COUNT(*) AS n FROM lead_events WHERE lead_id = ? AND kind = 'gift' AND text LIKE 'free-month%' AND at >= ?`).bind(leadId, since).first<{ n: number }>())?.n ?? 0;
    return n * MONTH_DAYS;
  } catch { return 0; }
}

/** The next unused gift for this subscription: the client's reward for an invited friend, else the friend's own gift month. */
async function nextGift(db: DB, lead: Row): Promise<{ kind: 'inviter' | 'friend'; refId: number; usd: number } | null> {
  try {
    if (lead.client_id) {
      const r = await db.prepare(`SELECT id, credit_usd FROM referrals WHERE referrer_client_id = ? AND status = 'credited' AND credit_usd > 0 ORDER BY credited_at, id LIMIT 1`).bind(lead.client_id).first<{ id: number; credit_usd: number }>();
      if (r) return { kind: 'inviter', refId: r.id, usd: r.credit_usd };
    }
    const f = await db.prepare(`SELECT id, credit_usd FROM referrals WHERE lead_id = ? AND kind = 'client' AND status IN ('credited', 'applied') AND credit_usd > 0 LIMIT 1`).bind(lead.id).first<{ id: number; credit_usd: number }>();
    if (f) {
      const used = await db.prepare(`SELECT 1 AS x FROM lead_events WHERE lead_id = ? AND kind = 'gift' AND text LIKE ?`).bind(lead.id, `%friend:${f.id}`).first();
      if (!used) return { kind: 'friend', refId: f.id, usd: f.credit_usd };
    }
  } catch {}
  return null;
}

export async function monthlyBilling(db: DB, notify?: Notify) {
  let made = 0;
  try {
    const rate = (await db.prepare(`SELECT rate FROM payments WHERE currency = 'USD' ORDER BY id DESC LIMIT 1`).first<{ rate: number }>().catch(() => null))?.rate || 41.5;
    const leads = (await db.prepare(`SELECT d.id, d.client_id, d.lang, d.service, d.interest, d.value_usd${await hasPlan(db) ? ', d.plan' : ''} FROM leads d
      WHERE d.status = 'won' AND COALESCE(d.page, '') != 'test' AND COALESCE(d.contact, '') NOT LIKE 'test%' AND COALESCE(d.contact, '') NOT LIKE '%@vaxogroup.com'`).all<Row>()).results;
    const today = new Date().toISOString().slice(0, 10);
    for (const l of leads) {
      if (made >= MAX_PER_RUN) break;
      const plan = planOf(l);
      if (!plan || !(PLAN_PRICES[plan] > 0)) continue;
      const last = await db.prepare(`SELECT at, amount, currency, amount_uah FROM payments WHERE lead_id = ? AND status = 'ok' ORDER BY at DESC LIMIT 1`).bind(l.id).first<{ at: string; amount: number; currency: string; amount_uah: number }>();
      if (!last) continue; // the first payment comes from the deal itself (after the free first month)
      const months = await periodOf(db, l.id);
      const usd = last.currency === 'USD' ? last.amount : (last.amount_uah || 0) / rate;
      // Old yearly deals without a stored period: 9+ months paid at once means a year.
      const paidMonths = months > 1 ? months : usd >= PLAN_PRICES[plan] * 9 ? 12 : 1;
      const price = periodPrice(PLAN_PRICES[plan], paidMonths);
      const free = await freeDaysSince(db, l.id, last.at);
      const end = new Date(`${last.at.slice(0, 10)}T00:00:00Z`);
      end.setUTCDate(end.getUTCDate() + MONTH_DAYS * paidMonths + free);
      const dueOn = new Date(end); dueOn.setUTCDate(dueOn.getUTCDate() - (paidMonths >= 12 ? 7 : LEAD_DAYS));
      if (dueOn.toISOString().slice(0, 10) > today) continue;
      // One invoice per cycle: an open one, or one from the last 20 days, means this month is already handled.
      const recent = await db.prepare(`SELECT 1 AS x FROM invoices WHERE lead_id = ? AND description LIKE 'Vaxo %' AND status != 'cancelled' AND at > datetime('now', '-20 days') LIMIT 1`).bind(l.id).first().catch(() => null);
      if (recent) continue;
      const lang = ['en', 'ru', 'ua'].includes(String(l.lang)) ? String(l.lang) : 'en';
      const gift = await nextGift(db, l);
      const off = gift ? Math.min(gift.usd, price) : 0;
      const amount = Math.round((price - off) * 100) / 100;
      if (gift) {
        // Mark the gift as used first: a failure later can never hand it out twice.
        if (gift.kind === 'inviter') await db.prepare(`UPDATE referrals SET status = 'applied', reason = ? WHERE id = ? AND status = 'credited'`).bind(`applied to lead ${l.id} on ${today}`, gift.refId).run();
        else await db.prepare(`INSERT INTO lead_events (lead_id, actor, kind, text) VALUES (?, 'system', 'gift', ?)`).bind(l.id, `gift-used friend:${gift.refId}`).run();
      }
      if (amount <= 0) {
        await db.prepare(`INSERT INTO lead_events (lead_id, actor, kind, text) VALUES (?, 'system', 'gift', ?)`).bind(l.id, `free-month ${gift!.kind === 'friend' ? 'friend' : 'inviter'} (ref ${gift!.refId}) until ${end.toISOString().slice(0, 10)}`).run();
        const { addMessage } = await import('./rooms.js');
        await addMessage(db, l.id, 'owner', 'text', (GIFT_FULL[lang] || GIFT_FULL.en).replace('{plan}', PLAN_NAME[plan]));
        await notify?.(`🎁 Лид #${l.id}: месяц тарифа ${PLAN_NAME[plan]} закрыт подарком (${gift!.kind === 'friend' ? 'подарок другу' : 'награда за приглашение'}). Счёт не выставлялся.`);
      } else {
        const month = end.toISOString().slice(0, 7);
        const made = await createInvoice(db, { leadId: l.id, amount, currency: 'USD', description: `Vaxo ${PLAN_NAME[plan]} subscription, ${paidMonths > 1 ? `${paidMonths} months from ` : ''}${month}${off ? ` (gift −$${off})` : ''}`, part: 'other', lang, origin: ORIGIN });
        const row = await db.prepare('SELECT id, number, token, amount, currency, description, status, lead_id, lang FROM invoices WHERE number = ?').bind(made.number).first<{ id: number; number: string; token: string; amount: number; currency: string; description: string; status: string; lead_id: number | null; lang: string | null }>().catch(() => null);
        if (row) await planCharge(db, row, PLAN_NAME[plan], end.toISOString().slice(0, 10), lang).catch((e) => console.error('[autopay plan]', e));
        if (off) {
          const { addMessage } = await import('./rooms.js');
          await addMessage(db, l.id, 'owner', 'text', (GIFT_PART[lang] || GIFT_PART.en).replace('{plan}', PLAN_NAME[plan]).replace('{off}', String(off)));
        }
        await notify?.(`🧾 Автосчёт: лид #${l.id}, ${PLAN_NAME[plan]}, $${amount}${off ? ` (подарок −$${off})` : ''}.`);
      }
      made++;
    }
  } catch (e) { console.error('[billing]', e); }
  try { made += await firstInvoices(db, notify); } catch (e) { console.error('[billing first]', e); }
  return made;
}

const FIRST_INVOICE: Record<string, string> = {
  ru: 'Спасибо, что выбрали тариф {plan}! Счёт на {period} (${amount}) уже здесь: оплата картой, Apple Pay или Google Pay в пару касаний. Пока счёт не оплачен, работает бесплатный уровень. Не понравится — вернём деньги в течение 14 дней.',
  ua: 'Дякуємо, що обрали тариф {plan}! Рахунок на {period} (${amount}) уже тут: оплата карткою, Apple Pay або Google Pay за пару дотиків. Поки рахунок не сплачено, працює безкоштовний рівень. Не сподобається — повернемо гроші протягом 14 днів.',
  en: 'Thank you for choosing the {plan} plan! The invoice for {period} (${amount}) is here: pay by card, Apple Pay or Google Pay in a couple of taps. Until it is paid, the free level works. Not happy? We refund within 14 days.',
};
const TRIAL_END: Record<string, string> = {
  ru: 'Ваш бесплатный месяц с тарифом {plan} подходит к концу. Если хотите продолжить — счёт уже в кабинете, оплата картой в пару касаний. Если нет — ничего делать не нужно: тариф просто закончится, а всё сделанное останется у вас.',
  ua: 'Ваш безкоштовний місяць з тарифом {plan} добігає кінця. Якщо хочете продовжити — рахунок уже в кабінеті, оплата карткою за пару дотиків. Якщо ні — нічого робити не треба: тариф просто закінчиться, а все зроблене лишиться у вас.',
  en: 'Your free month on the {plan} plan is ending. If you want to continue, the invoice is already in your cabinet — pay by card in a couple of taps. If not, do nothing: the plan simply ends and everything we made stays yours.',
};

/** The first invoice of a subscription: 3 days before the free month ends, for leads that chose a plan on the site,
 *  engaged with Vax (a signed-in client or at least two messages) and have no payment and no subscription invoice yet. */
async function firstInvoices(db: DB, notify?: Notify): Promise<number> {
  if (!(await hasPlan(db))) return 0;
  const rows = (await db.prepare(`SELECT d.id, d.client_id, d.lang, d.service, d.interest, d.plan FROM leads d
    WHERE d.plan IS NOT NULL AND d.status NOT IN ('lost', 'archived', 'test', 'collab', 'gift') AND COALESCE(d.page, '') != 'test'
      AND COALESCE(d.contact, '') NOT LIKE 'test%' AND COALESCE(d.contact, '') NOT LIKE '%@vaxogroup.com'
      AND NOT EXISTS (SELECT 1 FROM payments p WHERE p.lead_id = d.id AND p.status = 'ok')
      AND NOT EXISTS (SELECT 1 FROM invoices i WHERE i.lead_id = d.id AND i.description LIKE 'Vaxo %' AND i.status != 'cancelled')
      AND (d.client_id IS NOT NULL OR COALESCE(d.contact, '') LIKE '%@%')
      AND (d.created_at > '2026-11-10' OR d.created_at <= datetime('now', '-27 days'))
    LIMIT 10`).all<Row>()).results;
  let n = 0;
  for (const l of rows) {
    const plan = planOf(l);
    if (!plan || !(PLAN_PRICES[plan] > 0)) continue;
    const lang = ['en', 'ru', 'ua'].includes(String(l.lang)) ? String(l.lang) : 'en';
    const month = new Date().toISOString().slice(0, 7);
    const months = await periodOf(db, l.id), amount = periodPrice(PLAN_PRICES[plan], months);
    await createInvoice(db, { leadId: l.id, amount, currency: 'USD', description: `Vaxo ${PLAN_NAME[plan]} subscription, ${months > 1 ? `${months} months from ` : ''}${month}`, part: 'other', lang, origin: ORIGIN });
    const { addMessage } = await import('./rooms.js');
    await addMessage(db, l.id, 'owner', 'text', (FIRST_INVOICE[lang] || FIRST_INVOICE.en).replace('{plan}', PLAN_NAME[plan]).replace('{period}', periodWords(lang, months)).replace('{amount}', String(amount)));
    await notify?.(`🧾 Новая подписка: лид #${l.id}, ${PLAN_NAME[plan]} на ${months} мес., счёт $${amount}.`);
    n++;
  }
  return n;
}

async function hasPlan(db: DB) {
  try { await db.prepare('SELECT plan FROM leads LIMIT 1').first(); return true; } catch { return false; }
}
