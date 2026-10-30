// Card payments for invoices through plata by mono (internet acquiring of the FOP's monobank account; Apple Pay /
// Google Pay on the mono payment page, the fiscal receipt by check by mono from basketOrder). Off until the
// MONO_ACQ_TOKEN secret exists. mono charges in UAH, so USD/EUR invoices are converted at the NBU rate of the day.
// The webhook body is never trusted: we re-read the status from mono with our own token before marking anything paid.
import type { DB } from './partner.js';
import type { Notify } from './deals.js';
import type { AiBinding } from './chat.js';
import { nbuRate } from './finance.js';
import { settleInvoice } from './admin.js';
import { labOnPaid } from './lab.js';
import { shopOnPaid } from './shop.js';

const API = 'https://api.monobank.ua/api/merchant';
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

type Inv = { id: number; number: string; token: string; currency: string; amount: number; description: string; status: string; mono_id: string | null; lead_id: number | null; lang: string | null; receipt_url: string | null };
const COLS = 'id, number, token, currency, amount, description, status, mono_id, lead_id, lang, receipt_url';

export async function mono(token: string, path: string, body?: unknown) {
  const r = await fetch(`${API}/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'X-Token': token, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const d = (await r.json().catch(() => ({}))) as Record<string, any>;
  if (!r.ok) console.error('[mono]', path, r.status, JSON.stringify(d).slice(0, 300));
  return r.ok ? d : null;
}

/** POST /api/invoice/<token>/pay → { url } of the mono payment page for this invoice (a new one each time). */
export async function monoPay(db: DB, token: string | undefined, invToken: string, origin: string, extra: Record<string, unknown> = {}): Promise<Response> {
  if (!token) return json(503, { ok: false, error: 'card_off' });
  const inv = await db.prepare(`SELECT ${COLS} FROM invoices WHERE token = ?`).bind(invToken).first<Inv>();
  if (!inv || inv.status !== 'open') return json(400, { ok: false });
  const rate = inv.currency === 'UAH' ? 1 : await nbuRate(db, inv.currency, new Date().toISOString().slice(0, 10));
  if (!rate) return json(502, { ok: false, error: 'rate' });
  const kop = Math.round(inv.amount * rate * 100);
  const name = `${inv.description} (рахунок ${inv.number})`.slice(0, 250);
  // The receipt (mono -> Checkbox) is built from basketOrder: one service line, unit price = total, no VAT (FOP group 3).
  // With the client's email mono also sends them the receipt.
  const email = inv.lead_id ? (await db.prepare('SELECT email_addr FROM leads WHERE id = ?').bind(inv.lead_id).first<{ email_addr: string | null }>())?.email_addr : null;
  const d = await mono(token, 'invoice/create', {
    amount: kop, ccy: 980,
    merchantPaymInfo: {
      reference: inv.number, destination: `Оплата за ${inv.description}, рахунок ${inv.number}`.slice(0, 280),
      ...(email ? { customerEmails: [email] } : {}),
      basketOrder: [{ name, qty: 1, sum: kop, total: kop, code: inv.number, unit: 'посл.' }],
    },
    redirectUrl: `${origin}/invoice/?t=${inv.token}&paid=1`,
    webHookUrl: `${origin}/api/mono/webhook`,
    validity: 24 * 3600,
    ...extra,
  });
  if (!d?.invoiceId || !d.pageUrl) return json(502, { ok: false, error: 'mono' });
  await db.prepare('UPDATE invoices SET mono_id = ? WHERE id = ?').bind(d.invoiceId, inv.id).run();
  return json(200, { ok: true, url: d.pageUrl, uah: kop / 100 });
}

/** Re-read the mono status of the invoice's last card payment; on "success" mark it paid (taxes, cashback, thanks). */
async function check(db: DB, token: string, ai: AiBinding | undefined, notify: Notify, inv: Inv, base: string): Promise<string> {
  if (!inv.mono_id) return 'none';
  const d = await mono(token, `invoice/status?invoiceId=${encodeURIComponent(inv.mono_id)}`);
  const st = String(d?.status || 'unknown');
  await db.prepare('UPDATE invoices SET mono_status = ? WHERE id = ?').bind(st, inv.id).run();
  if (st === 'success' && inv.status === 'open') {
    await settleInvoice(db, ai, notify, inv.id, 'card', base);
    await labOnPaid(db, inv.id, d, notify).catch((e) => console.error('[lab paid]', e));
    await shopOnPaid(db, inv.id, notify).catch((e) => console.error('[shop paid]', e));
    await notify(`💳 Оплата картой: рахунок ${inv.number}, ${inv.amount} ${inv.currency} (mono)`);
    await monoReceipt(db, token, notify, { ...inv, status: 'paid' }).catch((e) => console.error('[mono receipt]', e));
  }
  return st;
}

const RECEIPT_MSG: Record<string, string> = {
  en: '🧾 Your fiscal receipt for invoice {n}: {url}',
  ru: '🧾 Фискальный чек по счёту {n}: {url}',
  ua: '🧾 Фіскальний чек за рахунком {n}: {url}',
};

/** The fiscal receipt of a paid card invoice (made by mono -> Checkbox from basketOrder): save the tax-site link and
 * send it to the client's chat once. A failed receipt is reported to the owner; "new"/"process" is retried hourly. */
export async function monoReceipt(db: DB, token: string, notify: Notify, inv: Inv): Promise<string> {
  if (!inv.mono_id || inv.receipt_url) return inv.receipt_url ? 'done' : 'none';
  const d = await mono(token, `invoice/fiscal-checks?invoiceId=${encodeURIComponent(inv.mono_id)}`);
  const sale = ((d?.checks as Record<string, any>[] | undefined) || []).find((c) => c.type === 'sale');
  if (!sale) return 'none';
  if (sale.status === 'done' && sale.taxUrl) {
    const r = (await db.prepare('UPDATE invoices SET receipt_url = ? WHERE id = ? AND receipt_url IS NULL').bind(String(sale.taxUrl).slice(0, 500), inv.id).run()) as { meta?: { changes?: number } };
    if (r.meta?.changes && inv.lead_id) {
      const { addMessage } = await import('./rooms.js');
      await addMessage(db, inv.lead_id, 'owner', 'text', (RECEIPT_MSG[inv.lang || 'en'] || RECEIPT_MSG.en).replace('{n}', inv.number).replace('{url}', sale.taxUrl));
    }
    return 'done';
  }
  if (sale.status === 'failed') {
    const r = (await db.prepare(`UPDATE invoices SET receipt_url = 'failed' WHERE id = ? AND receipt_url IS NULL`).bind(inv.id).run()) as { meta?: { changes?: number } };
    if (r.meta?.changes) await notify(`⚠️ Чек не створено (рахунок ${inv.number}): ${String(sale.statusDescription || 'без пояснення').slice(0, 200)}. Перевірте зміну в Checkbox.`);
  }
  return String(sale.status);
}

/** Hourly: receipts still being made for card payments of the last 3 days. */
export async function monoReceiptSweep(db: DB, token: string | undefined, notify: Notify) {
  if (!token) return;
  const { results } = await db.prepare(`SELECT ${COLS} FROM invoices WHERE status = 'paid' AND mono_id IS NOT NULL AND receipt_url IS NULL AND at > datetime('now', '-30 days') LIMIT 20`).all<Inv>();
  for (const inv of results ?? []) await monoReceipt(db, token, notify, inv).catch((e) => console.error('[mono receipt]', e));
}

/** POST /api/mono/webhook — mono calls it on every status change; we only take the invoiceId from it. */
export async function monoWebhook(db: DB, token: string | undefined, ai: AiBinding | undefined, notify: Notify, request: Request): Promise<Response> {
  if (!token || request.method !== 'POST') return json(404, { ok: false });
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const inv = typeof b.invoiceId === 'string' ? await db.prepare(`SELECT ${COLS} FROM invoices WHERE mono_id = ?`).bind(b.invoiceId).first<Inv>() : null;
  if (inv) await check(db, token, ai, notify, inv, request.url);
  return json(200, { ok: true });
}

/** GET /api/invoice/<token>/check — the client came back from the mono page: confirm without waiting for the webhook. */
export async function monoCheck(db: DB, token: string | undefined, ai: AiBinding | undefined, notify: Notify, invToken: string, base: string): Promise<Response> {
  if (!token) return json(503, { ok: false });
  const inv = await db.prepare(`SELECT ${COLS} FROM invoices WHERE token = ?`).bind(invToken).first<Inv>();
  if (!inv) return json(404, { ok: false });
  const status = inv.status === 'paid' ? 'success' : await check(db, token, ai, notify, inv, base);
  if (status === 'success' && !inv.receipt_url) await monoReceipt(db, token, notify, { ...inv, status: 'paid' }).catch(() => 'none');
  return json(200, { ok: true, status });
}
