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

const ORIGIN = 'https://vaxogroup.com';
const LEAD_DAYS = 3;       // invoice goes out this many days before the paid month ends
const MONTH_DAYS = 30;
const MAX_PER_RUN = 20;
const PLAN_NAME: Record<string, string> = { personal: 'Personal', care: 'Care', growth: 'Growth', pro: 'Pro' };

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
    const n = (await db.prepare(`SELECT COUNT(*) AS n FROM lead_events WHERE lead_id = ? AND kind = 'gift' AND text LIKE 'free-month%' AND at > ?`).bind(leadId, since).first<{ n: number }>())?.n ?? 0;
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
      const price = PLAN_PRICES[plan];
      const usd = last.currency === 'USD' ? last.amount : (last.amount_uah || 0) / rate;
      if (usd >= price * 9) continue; // paid for a year
      const free = await freeDaysSince(db, l.id, last.at);
      const end = new Date(`${last.at.slice(0, 10)}T00:00:00Z`);
      end.setUTCDate(end.getUTCDate() + MONTH_DAYS + free);
      const dueOn = new Date(end); dueOn.setUTCDate(dueOn.getUTCDate() - LEAD_DAYS);
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
        await createInvoice(db, { leadId: l.id, amount, currency: 'USD', description: `Vaxo ${PLAN_NAME[plan]} subscription, ${month}${off ? ` (gift −$${off})` : ''}`, part: 'other', lang, origin: ORIGIN });
        if (off) {
          const { addMessage } = await import('./rooms.js');
          await addMessage(db, l.id, 'owner', 'text', (GIFT_PART[lang] || GIFT_PART.en).replace('{plan}', PLAN_NAME[plan]).replace('{off}', String(off)));
        }
        await notify?.(`🧾 Автосчёт: лид #${l.id}, ${PLAN_NAME[plan]}, $${amount}${off ? ` (подарок −$${off})` : ''}.`);
      }
      made++;
    }
  } catch (e) { console.error('[billing]', e); }
  return made;
}

async function hasPlan(db: DB) {
  try { await db.prepare('SELECT plan FROM leads LIMIT 1').first(); return true; } catch { return false; }
}
