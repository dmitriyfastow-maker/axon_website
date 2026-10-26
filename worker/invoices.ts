// Invoices for bank transfer to the FOP (Decision 16, before card acquiring): the owner or Claude creates one in the
// HQ, the client gets a link in the project chat (/invoice/?t=<token>) with the exact requisites for its currency and a
// ready payment purpose. "Paid" records the payment in Finance (taxes, cashback, Vax thanks the client).
import type { DB } from './partner.js';
import { addMessage } from './rooms.js';
import { settings } from './autopilot.js';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const CUR = ['USD', 'EUR', 'UAH'];
const PARTS = ['prepay', 'stage', 'final', 'full', 'support', 'micro', 'strategy', 'product', 'other'];
const hex = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, '0')).join('');

const LINK_MSG: Record<string, string> = {
  en: '🧾 Your invoice {n} for {sum}: {url}\nIt has the bank details and a ready payment purpose. Card payment on the site is coming soon. As soon as the money arrives, work starts and I confirm it here.',
  ru: '🧾 Ваш счёт {n} на {sum}: {url}\nВ нём реквизиты и готовое назначение платежа. Оплата картой на сайте скоро появится. Как только деньги придут, начинаем работу — я подтвержу здесь.',
  ua: '🧾 Ваш рахунок {n} на {sum}: {url}\nУ ньому реквізити й готове призначення платежу. Оплата карткою на сайті скоро зʼявиться. Щойно гроші надійдуть, починаємо роботу — я підтверджу тут.',
};

/** HQ: GET /api/admin/invoice → list; POST {lead_id, amount, currency, description, part} → create + send to the chat. */
const CARD_MSG: Record<string, string> = {
  en: '🧾 Your invoice {n} for {sum}: {url}\nPay by card, Apple Pay or Google Pay right there, or by bank transfer (the details and payment purpose are in the invoice). As soon as the payment arrives, work starts and I confirm it here.',
  ru: '🧾 Ваш счёт {n} на {sum}: {url}\nОплатить можно там же картой, Apple Pay или Google Pay — или переводом по реквизитам из счёта. Как только оплата придёт, начинаем работу — я подтвержу здесь.',
  ua: '🧾 Ваш рахунок {n} на {sum}: {url}\nСплатити можна там же карткою, Apple Pay чи Google Pay — або переказом за реквізитами з рахунку. Щойно оплата надійде, починаємо роботу — я підтверджу тут.',
};

export async function handleInvoiceAdmin(db: DB, request: Request, path: string, origin: string, card = false): Promise<Response> {
  if (path === '' && request.method === 'GET') {
    const { results } = await db.prepare(`SELECT i.*, d.name AS client FROM invoices i LEFT JOIN leads d ON d.id = i.lead_id ORDER BY i.id DESC LIMIT 200`).all();
    return json(200, { ok: true, invoices: results });
  }
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (path === '' && request.method === 'POST') {
    const amount = Math.round(Number(b.amount) * 100) / 100, currency = CUR.includes(String(b.currency)) ? String(b.currency) : 'USD';
    const description = typeof b.description === 'string' ? b.description.trim().slice(0, 300) : '';
    if (!(amount > 0) || !description) return json(400, { ok: false });
    const leadId = Number(b.lead_id) || null;
    const lead = leadId ? await db.prepare('SELECT name, lang FROM leads WHERE id = ?').bind(leadId).first<{ name: string; lang: string | null }>() : null;
    const lang = ['en', 'ru', 'ua'].includes(String(b.lang)) ? String(b.lang) : lead?.lang || (currency === 'UAH' ? 'ua' : 'en');
    const year = new Date().getUTCFullYear();
    const n = ((await db.prepare(`SELECT COUNT(*) AS n FROM invoices WHERE number LIKE ?`).bind(`VX-${year}-%`).first<{ n: number }>())?.n ?? 0) + 1;
    const number = `VX-${year}-${String(n).padStart(4, '0')}`, token = hex(16);
    const buyer = typeof b.buyer === 'string' && b.buyer.trim() ? b.buyer.trim().slice(0, 200) : lead?.name || null;
    await db.prepare(`INSERT INTO invoices (number, token, lead_id, buyer, currency, amount, description, part, lang, due) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, date('now', '+7 days'))`)
      .bind(number, token, leadId, buyer, currency, amount, description, PARTS.includes(String(b.part)) ? String(b.part) : 'full', lang).run();
    const url = `${origin}/invoice/?t=${token}`;
    if (leadId && b.send !== false) {
      const sum = `${amount.toLocaleString('en-US')} ${currency}`;
      await addMessage(db, leadId, 'owner', 'text', ((card ? CARD_MSG : LINK_MSG)[lang] || LINK_MSG.en).replace('{n}', number).replace('{sum}', sum).replace('{url}', url));
    }
    return json(200, { ok: true, number, url });
  }
  const m = path.match(/^(\d+)\/(cancel)$/);
  if (m && request.method === 'POST') {
    await db.prepare(`UPDATE invoices SET status = 'cancelled' WHERE id = ? AND status = 'open'`).bind(Number(m[1])).run();
    return json(200, { ok: true });
  }
  return json(404, { ok: false });
}

/** Mark paid: returns the data for the Finance "payment" record (the caller records it so taxes/cashback/thanks run). */
export async function invoiceForPayment(db: DB, id: number) {
  const inv = await db.prepare(`SELECT id, number, lead_id, currency, amount, part, status FROM invoices WHERE id = ?`).bind(id).first<{ id: number; number: string; lead_id: number | null; currency: string; amount: number; part: string; status: string }>();
  if (!inv || inv.status !== 'open') return null;
  // Atomic: the mono webhook and the client's return page may both confirm the same card payment.
  const r = (await db.prepare(`UPDATE invoices SET status = 'paid' WHERE id = ? AND status = 'open'`).bind(id).run()) as { meta?: { changes?: number } };
  return r.meta?.changes ? inv : null;
}

/** Public: GET /api/invoice/<token> — the invoice and only the requisites for its currency. */
export async function handleInvoicePublic(db: DB, token: string, card = false): Promise<Response> {
  if (!/^[a-f0-9]{32}$/.test(token)) return json(404, { ok: false });
  const inv = await db.prepare(`SELECT number, at, buyer, currency, amount, description, lang, due, status FROM invoices WHERE token = ?`).bind(token).first<Record<string, any>>();
  if (!inv) return json(404, { ok: false });
  const st = await settings(db);
  let req: Record<string, any> = {};
  try { req = JSON.parse(st.fop_requisites || '{}'); } catch {}
  const seller = { name_ua: req.name_ua, name_en: req.name_en, address_en: req.address_en, tax_id: inv.currency === 'UAH' ? req.tax_id : undefined };
  return json(200, { ok: true, invoice: inv, seller, bank: req[inv.currency] || null, card: card && inv.status === 'open' });
}
