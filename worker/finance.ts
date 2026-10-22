// Finance (Decision 16): the owner sees everything; the FOP holder (group 3) opens /fin/ with a personal code and
// sees only money — payments by order number, outgoing amounts, taxes, the income limit. Read-only for her.
import type { DB } from './partner.js';
import { logEvent, type Notify } from './deals.js';
import { settings } from './autopilot.js';
import { roomMessages } from './rooms.js';
import type { AiBinding } from './chat.js';
import { handleFopChat, handleFopChatAdmin } from './fopchat.js';

// FOP group 3, 2026 (bip.net.ua/articles/fop-3-grupa/, checked 21.10.2026). Show to the accountant before relying on it.
export const FOP = { year: 2026, singleTax: 0.05, militaryLevy: 0.01, esvMonth: 1902.34, limitUah: 10_091_049 };
const PARTS = ['prepay', 'stage', 'final', 'full', 'support', 'micro', 'strategy', 'product', 'other'];
const METHODS = ['bank', 'card', 'payoneer', 'wise', 'other'];
const CATS = ['partner', 'owner', 'tax', 'esv', 'service', 'ads', 'refund', 'bank', 'other'];
const CUR = ['UAH', 'USD', 'EUR'];

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const day = (v: unknown) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : new Date().toISOString().slice(0, 10));

/** NBU official rate (UAH per unit) for a date; falls back to the latest known rate in our ledger. */
export async function nbuRate(db: DB, currency: string, date: string): Promise<number> {
  if (currency === 'UAH') return 1;
  try {
    const r = await fetch(`https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=${currency}&date=${date.replace(/-/g, '')}&json`);
    const j = (await r.json()) as { rate?: number }[];
    if (j?.[0]?.rate) return j[0].rate;
  } catch (e) { console.error('[nbu]', e); }
  const last = await db.prepare('SELECT rate FROM payments WHERE currency = ? ORDER BY id DESC LIMIT 1').bind(currency).first<{ rate: number }>();
  return last?.rate || 0;
}

async function sha(s: string) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('vaxo-fin:' + s));
  return Array.from(new Uint8Array(h), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Quarter deadlines for FOP group 3: declaration within 40 days after the quarter, payment within 10 more days. */
function deadlines(now = new Date()) {
  const y = now.getUTCFullYear(), q = Math.floor(now.getUTCMonth() / 3); // current quarter 0..3
  const prevEnd = q === 0 ? new Date(Date.UTC(y - 1, 12, 0)) : new Date(Date.UTC(y, q * 3, 0));
  const add = (d: Date, n: number) => new Date(d.getTime() + n * 864e5).toISOString().slice(0, 10);
  return { quarter: q === 0 ? `${y - 1} Q4` : `${y} Q${q}`, declare: add(prevEnd, 40), pay: add(prevEnd, 50) };
}

/** Everything for the finance view. full = owner (names, profit); otherwise the FOP view (no names, no chats). */
export async function financeView(db: DB, year: number, full: boolean) {
  const from = `${year}-01-01`, to = `${year}-12-31`;
  const pays = (await db
    .prepare(`SELECT p.id, p.at, p.lead_id, p.amount, p.currency, p.rate, p.amount_uah, p.part, p.method, ${full ? 'p.note, ' : ''}p.source, p.status${full ? ', d.name AS client, d.service, d.interest' : ''}
              FROM payments p LEFT JOIN leads d ON d.id = p.lead_id WHERE p.at BETWEEN ? AND ? ORDER BY p.at DESC, p.id DESC`)
    .bind(from, to).all<Record<string, any>>()).results;
  const exps = (await db
    .prepare(`SELECT e.id, e.at, e.amount, e.currency, e.rate, e.amount_uah, e.category, ${full ? 'e.note, ' : ''}e.status${full ? ', pr.name AS partner' : ''}
              FROM expenses e LEFT JOIN payouts po ON po.id = e.payout_id LEFT JOIN partners pr ON pr.id = po.partner_id
              WHERE e.at BETWEEN ? AND ? ORDER BY e.at DESC, e.id DESC`)
    .bind(from, to).all<Record<string, any>>()).results;
  const ok = (r: Record<string, any>) => r.status === 'ok';
  const income = pays.filter(ok).reduce((s, r) => s + r.amount_uah, 0);
  const byQ = [0, 0, 0, 0].map((_, q) => pays.filter((r) => ok(r) && Math.floor((Number(r.at.slice(5, 7)) - 1) / 3) === q).reduce((s, r) => s + r.amount_uah, 0));
  const byMonth = Array.from({ length: 12 }, (_, m) => ({
    m: m + 1,
    in: pays.filter((r) => ok(r) && Number(r.at.slice(5, 7)) === m + 1).reduce((s, r) => s + r.amount_uah, 0),
    out: exps.filter((r) => ok(r) && Number(r.at.slice(5, 7)) === m + 1).reduce((s, r) => s + r.amount_uah, 0),
  }));
  const out = exps.filter(ok).reduce((s, r) => s + r.amount_uah, 0);
  const now = new Date();
  const months = year === now.getUTCFullYear() ? now.getUTCMonth() + 1 : 12;
  const taxes = {
    singleTax: Math.round(income * FOP.singleTax * 100) / 100,
    militaryLevy: Math.round(income * FOP.militaryLevy * 100) / 100,
    esvYearToDate: Math.round(FOP.esvMonth * months * 100) / 100,
    esvMonth: FOP.esvMonth,
    byQuarter: byQ.map((v) => Math.round(v * (FOP.singleTax + FOP.militaryLevy) * 100) / 100),
    paid: exps.filter((r) => ok(r) && (r.category === 'tax' || r.category === 'esv')).reduce((s, r) => s + r.amount_uah, 0),
  };
  const due = (await db.prepare(`SELECT COALESCE(SUM(amount_usd), 0) AS n FROM payouts WHERE status = 'due'`).first<{ n: number }>())?.n ?? 0;
  const res: Record<string, unknown> = {
    ok: true, year, fop: FOP, income: Math.round(income * 100) / 100, out: Math.round(out * 100) / 100, byQuarter: byQ, byMonth,
    limitLeft: Math.round((FOP.limitUah - income) * 100) / 100, taxes, deadlines: deadlines(now), partnersDueUsd: due,
    payments: pays.map((r) => ({ ...r, order: r.lead_id ? `#${r.lead_id}` : '—' })),
    expenses: exps,
  };
  if (full) {
    const by: Record<string, number> = {};
    for (const r of pays.filter(ok)) { const k = r.part; by[k] = (by[k] || 0) + r.amount_uah; }
    res.byPart = by;
    res.profit = Math.round((income - out - taxes.singleTax - taxes.militaryLevy - taxes.esvYearToDate + taxes.paid) * 100) / 100;
  }
  return res;
}

/** Owner: record a payment (and tell the client through Vax), an expense, cancel one, set the FOP code, export CSV. */
export async function handleFinanceAdmin(db: DB, request: Request, path: string, notify: Notify, onPaid?: (leadId: number) => void): Promise<Response> {
  const b = request.method === 'POST' ? ((await request.json().catch(() => ({}))) as Record<string, unknown>) : {};
  const url = new URL(request.url);
  if (path === '' && request.method === 'GET') return json(200, await financeView(db, Number(url.searchParams.get('year')) || new Date().getUTCFullYear(), true));
  if (path === 'payment' && request.method === 'POST') {
    const amount = Number(b.amount), currency = CUR.includes(String(b.currency)) ? String(b.currency) : 'USD', at = day(b.at);
    if (!(amount > 0)) return json(400, { ok: false, error: 'amount' });
    const rate = await nbuRate(db, currency, at);
    if (!rate) return json(502, { ok: false, error: 'rate' });
    const lead = Number(b.lead_id) || null;
    const part = PARTS.includes(String(b.part)) ? String(b.part) : 'full';
    await db.prepare('INSERT INTO payments (at, lead_id, amount, currency, rate, amount_uah, part, method, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(at, lead, amount, currency, rate, Math.round(amount * rate * 100) / 100, part, METHODS.includes(String(b.method)) ? String(b.method) : 'bank', typeof b.note === 'string' ? b.note.slice(0, 200) : null).run();
    if (lead) {
      await logEvent(db, lead, 'owner', 'note', `Payment received: ${amount} ${currency} (${part})`);
      onPaid?.(lead);
    }
    return json(200, { ok: true, rate });
  }
  if (path === 'expense' && request.method === 'POST') {
    const amount = Number(b.amount), currency = CUR.includes(String(b.currency)) ? String(b.currency) : 'UAH', at = day(b.at);
    if (!(amount > 0)) return json(400, { ok: false, error: 'amount' });
    const rate = await nbuRate(db, currency, at);
    if (!rate) return json(502, { ok: false, error: 'rate' });
    await db.prepare('INSERT INTO expenses (at, amount, currency, rate, amount_uah, category, payout_id, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(at, amount, currency, rate, Math.round(amount * rate * 100) / 100, CATS.includes(String(b.category)) ? String(b.category) : 'other', Number(b.payout_id) || null, typeof b.note === 'string' ? b.note.slice(0, 200) : null).run();
    return json(200, { ok: true, rate });
  }
  const cancel = path.match(/^(payment|expense)\/(\d+)\/cancel$/);
  if (cancel && request.method === 'POST') {
    await db.prepare(`UPDATE ${cancel[1] === 'payment' ? 'payments' : 'expenses'} SET status = ? WHERE id = ?`).bind(b.refunded ? 'refunded' : 'cancelled', Number(cancel[2])).run();
    return json(200, { ok: true });
  }
  if (path === 'code' && request.method === 'POST') {
    const code = typeof b.code === 'string' ? b.code.trim() : '';
    if (code.length < 8) return json(400, { ok: false, error: 'short' });
    await db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value').bind('fin_code', await sha(code)).run();
    await notify('🔑 Код доступа к «Финансам» для ФОП обновлён.');
    return json(200, { ok: true });
  }
  if (path === 'fopchat') return handleFopChatAdmin(db, request);
  if (path === 'csv' && request.method === 'GET') return csv(db, Number(url.searchParams.get('year')) || new Date().getUTCFullYear(), true);
  return json(404, { ok: false });
}

async function csv(db: DB, year: number, full: boolean): Promise<Response> {
  const v = (await financeView(db, year, full)) as { payments: Record<string, any>[]; expenses: Record<string, any>[] };
  const q = (x: unknown) => `"${String(x ?? '').replace(/"/g, '""')}"`;
  const rows = [['type', 'date', 'order', ...(full ? ['client'] : []), 'amount', 'currency', 'nbu_rate', 'amount_uah', 'kind', 'method', 'status', 'note'].join(',')];
  for (const p of v.payments) rows.push(['income', p.at, p.order, ...(full ? [p.client] : []), p.amount, p.currency, p.rate, p.amount_uah, p.part, p.method, p.status, p.note].map(q).join(','));
  for (const e of v.expenses) rows.push(['expense', e.at, '', ...(full ? [e.partner] : []), e.amount, e.currency, e.rate, e.amount_uah, e.category, '', e.status, e.note].map(q).join(','));
  return new Response('﻿' + rows.join('\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="vaxo-finance-${year}.csv"`, 'Cache-Control': 'no-store' } });
}

/** FOP holder: GET /api/fin?year= with header X-Fin-Code. Read-only, no client names, no chats. */
export async function handleFinancePublic(db: DB, request: Request, ai?: AiBinding, notify?: Notify): Promise<Response> {
  const st = await settings(db);
  const code = request.headers.get('X-Fin-Code') || '';
  if (!st.fin_code || !code || (await sha(code.trim())) !== st.fin_code) return json(401, { ok: false });
  const url = new URL(request.url);
  // Her assistant: GET ?chat=1 reads the chat, POST asks.
  if (request.method === 'POST' || url.searchParams.get('chat')) return handleFopChat(db, ai, request, notify || (async () => {}));
  if (request.method !== 'GET') return json(405, { ok: false });
  const year = Number(url.searchParams.get('year')) || new Date().getUTCFullYear();
  if (url.searchParams.get('csv')) return csv(db, year, true);
  // One client's conversation (read-only), as the owner sees it, without internal notes.
  const lid = Number(url.searchParams.get('lead'));
  if (lid) {
    const lead = await db.prepare(`SELECT id, created_at, name, contact, service, interest, status, stage, progress, value_usd, budget, brief, country FROM leads WHERE id = ?`).bind(lid).first();
    if (!lead) return json(404, { ok: false });
    return json(200, { ok: true, lead, messages: await roomMessages(db, lid, false) });
  }
  // Agreed with the owner: the FOP holder is a full partner — she sees all money, every client and their chats\n  // (read-only). Not shown: the owner's internal chat with Claude, internal notes and problem flags.
  const v = await financeView(db, year, true);
  const orders = (await db
    .prepare(`SELECT d.id, d.created_at, d.name AS client, d.contact, d.service, d.interest, d.status, d.stage, d.progress, d.stage_due, d.value_usd, d.budget, d.country,
                     (SELECT COALESCE(SUM(p.amount_uah), 0) FROM payments p WHERE p.lead_id = d.id AND p.status = 'ok') AS paid_uah
              FROM leads d WHERE d.status NOT IN ('archived') AND COALESCE(d.page, '') != 'test'
              ORDER BY d.updated_at DESC LIMIT 300`)
    .all<Record<string, unknown>>()).results;
  const payouts = (await db
    .prepare(`SELECT po.id, po.created_at, po.kind, po.rate, po.base_usd, po.amount_usd, po.status, po.paid_at, po.lead_id, pr.name AS partner
              FROM payouts po LEFT JOIN partners pr ON pr.id = po.partner_id ORDER BY po.id DESC LIMIT 200`)
    .all<Record<string, unknown>>()).results;
  return json(200, { ...v, orders, payouts });
}
