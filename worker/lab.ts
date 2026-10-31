// INSIDERS Lab — the paid tier of the INSIDERS Discord (Decisions 24–25). A member fills the /lab/ form (18+ only), we
// create a lead, a member row and a card invoice and send them to the mono payment page. With "autopay" ticked mono
// saves the card (saveCardData) and we charge the token monthly; every charge is announced by email 3 days before,
// and the member can switch autopay off from the link in any letter (/lab/manage/?t=<token>). The Discord role is
// given by the Discord task from the Telegram notice.
import type { DB } from './partner.js';
import type { Notify } from './deals.js';
import { mono, monoPay } from './mono.js';
import { sendMail } from './mail.js';
import { nbuRate } from './finance.js';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const hex = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, '0')).join('');
const s = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const LANGS = ['en', 'ru', 'ua'];

/** Founding price for the first 100 paid members, locked while they stay; then the regular price. */
export const LAB = { founding: 5, regular: 9, foundingSeats: 100 };
const DESC = 'INSIDERS Lab (Discord) — 1 month';

type Member = { id: number; token: string; lead_id: number | null; name: string; discord: string; email: string; lang: string; price: number; autopay: number; wallet_id: string | null; card_token: string | null; paid_until: string | null; status: string; last_invoice_id: number | null; notice_for: string | null };

async function paidMembers(db: DB) {
  return (await db.prepare(`SELECT COUNT(*) AS n FROM lab_members WHERE paid_until IS NOT NULL`).first<{ n: number }>())?.n ?? 0;
}

async function newInvoice(db: DB, m: Pick<Member, 'lead_id' | 'name' | 'price' | 'lang'>) {
  const year = new Date().getUTCFullYear();
  const n = ((await db.prepare(`SELECT COUNT(*) AS n FROM invoices WHERE number LIKE ?`).bind(`VX-${year}-%`).first<{ n: number }>())?.n ?? 0) + 1;
  const number = `VX-${year}-${String(n).padStart(4, '0')}`, token = hex(16);
  const r = await db
    .prepare(`INSERT INTO invoices (number, token, lead_id, buyer, currency, amount, description, part, lang, due) VALUES (?, ?, ?, ?, 'USD', ?, ?, 'product', ?, date('now', '+2 days'))`)
    .bind(number, token, m.lead_id, m.name, m.price, DESC, m.lang)
    .run();
  return { id: Number((r as { meta?: { last_row_id?: number } }).meta?.last_row_id), number, token };
}

/** GET /api/lab → price and seats; POST {name, discord, email, adult, autopay, lang} → { url } of the mono page. */
export async function handleLab(db: DB, request: Request, monoToken: string | undefined, notify: Notify, origin: string): Promise<Response> {
  const paid = await paidMembers(db);
  const founding = paid < LAB.foundingSeats;
  const price = founding ? LAB.founding : LAB.regular;
  if (request.method === 'GET') return json(200, { ok: true, price, founding, seatsLeft: Math.max(0, LAB.foundingSeats - paid), regular: LAB.regular });
  if (request.method !== 'POST') return json(405, { ok: false });
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const name = s(b.name, 80), discord = s(b.discord, 40).replace(/^@/, ''), email = s(b.email, 120);
  const lang = LANGS.includes(String(b.lang)) ? String(b.lang) : 'en';
  if (!name || !discord || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(400, { ok: false, error: 'fields' });
  if (b.adult !== true) return json(400, { ok: false, error: 'adult' });
  if (!monoToken) return json(503, { ok: false, error: 'card_off' });
  const autopay = b.autopay === true ? 1 : 0;
  const src = s(b.src, 80) || 'discord';
  const lead = await db
    .prepare(`INSERT INTO leads (mode, name, contact, interest, message, lang, page, room, status, email_addr, source) VALUES ('request', ?, ?, 'lab', ?, ?, '/lab/', ?, 'new', ?, ?)`)
    .bind(name, email, `INSIDERS Lab — Discord: ${discord}${autopay ? ' (autopay)' : ''}`, lang, hex(12), email, src)
    .run();
  const leadId = Number((lead as { meta?: { last_row_id?: number } }).meta?.last_row_id) || null;
  const inv = await newInvoice(db, { lead_id: leadId, name, price, lang });
  const token = hex(16), walletId = autopay ? `lab-${hex(8)}` : null;
  await db
    .prepare(`INSERT INTO lab_members (token, lead_id, name, discord, email, lang, price, autopay, wallet_id, last_invoice_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(token, leadId, name, discord, email, lang, price, autopay, walletId, inv.id)
    .run();
  await notify(`🧪 INSIDERS Lab: ${name} (Discord ${discord}, ${email}) открыл оплату $${price}${autopay ? ', автоплатёж' : ''}, счёт ${inv.number}.`).catch(() => {});
  return monoPay(db, monoToken, inv.token, origin, walletId ? { saveCardData: { saveCard: true, walletId } } : {});
}

const addMonth = (from: string) => {
  const d = new Date(from + 'T00:00:00Z');
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
};

/** Called by mono.ts when a card invoice turns "success": extend the member and keep the saved card token. */
export async function labOnPaid(db: DB, invoiceId: number, status: Record<string, any> | null, notify: Notify) {
  const m = await db.prepare(`SELECT * FROM lab_members WHERE last_invoice_id = ?`).bind(invoiceId).first<Member>();
  if (!m) return;
  const today = new Date().toISOString().slice(0, 10);
  const until = addMonth(m.paid_until && m.paid_until > today ? m.paid_until : today);
  const cardToken = typeof status?.walletData?.cardToken === 'string' ? status.walletData.cardToken : m.card_token;
  await db.prepare(`UPDATE lab_members SET paid_until = ?, status = 'active', card_token = ?, notice_for = NULL WHERE id = ?`).bind(until, cardToken, m.id).run();
  const first = !m.paid_until;
  await notify(`🧪 INSIDERS Lab: оплата от ${m.name} (Discord ${m.discord}) — оплачено до ${until}.${first ? ' ВЫДАТЬ РОЛЬ Lab.' : ''}${m.autopay && !cardToken ? ' Карта для автоплатежа НЕ сохранилась — проверить токенизацию в mono.' : ''}`);
  const manage = `https://vaxogroup.com/lab/manage/?t=${m.token}`;
  await sendMail(m.email, first ? 'Welcome to INSIDERS Lab' : 'INSIDERS Lab — payment received',
    `${first ? `Welcome to INSIDERS Lab, ${m.name}! Your Lab role in the INSIDERS Discord (${m.discord}) will be added within a few hours.` : `Thanks, ${m.name}! Your INSIDERS Lab payment arrived.`}\n\nPaid until: ${until}.\nAutopay: ${m.autopay && cardToken ? 'on — we email you 3 days before every charge' : 'off — we send a payment link before the month ends'}.\nManage or cancel: ${manage}`).catch(() => false);
}

/** Hourly (cron): 3 days before the end — a notice (autopay) or a pay link (no autopay); on the day — charge the card. */
export async function labSweep(db: DB, monoToken: string | undefined, notify: Notify, origin = 'https://vaxogroup.com') {
  if (!monoToken) return;
  const { results } = await db.prepare(`SELECT * FROM lab_members WHERE status = 'active' AND paid_until <= date('now', '+3 days') LIMIT 50`).all<Member>();
  const today = new Date().toISOString().slice(0, 10);
  for (const m of results ?? []) {
    const manage = `https://vaxogroup.com/lab/manage/?t=${m.token}`;
    const auto = !!(m.autopay && m.card_token);
    if (m.notice_for !== m.paid_until) {
      // One notice per period, sent 3 days ahead.
      const text = auto
        ? `Hi ${m.name}! On ${m.paid_until} we will charge $${m.price} for the next month of INSIDERS Lab (your saved card, in UAH at the day's rate).\nDon't want to continue? Switch autopay off here: ${manage}`
        : `Hi ${m.name}! Your INSIDERS Lab month ends on ${m.paid_until}. To stay in, pay for the next month here: ${manage}`;
      await sendMail(m.email, auto ? 'INSIDERS Lab — autopay in 3 days' : 'INSIDERS Lab — your month ends soon', text).catch(() => false);
      await db.prepare(`UPDATE lab_members SET notice_for = ? WHERE id = ?`).bind(m.paid_until, m.id).run();
      continue;
    }
    if (!m.paid_until || m.paid_until > today) continue;
    if (!auto) {
      if (m.paid_until < new Date(Date.now() - 3 * 864e5).toISOString().slice(0, 10)) {
        await db.prepare(`UPDATE lab_members SET status = 'expired' WHERE id = ?`).bind(m.id).run();
        await notify(`🧪 INSIDERS Lab: у ${m.name} (Discord ${m.discord}) закончилась оплата — снять роль Lab.`);
      }
      continue;
    }
    const last = m.last_invoice_id ? await db.prepare(`SELECT status, at FROM invoices WHERE id = ?`).bind(m.last_invoice_id).first<{ status: string; at: string }>() : null;
    if (last && last.status === 'open' && last.at > new Date(Date.now() - 864e5).toISOString().replace('T', ' ')) continue; // a charge is already in flight
    const inv = await newInvoice(db, m);
    const rate = await nbuRate(db, 'USD', today);
    if (!rate) continue;
    const kop = Math.round(m.price * rate * 100);
    const d = await mono(monoToken, 'wallet/payment', {
      cardToken: m.card_token, amount: kop, ccy: 980, initiationKind: 'merchant',
      merchantPaymInfo: { reference: inv.number, destination: `Оплата за ${DESC}, рахунок ${inv.number}`, customerEmails: [m.email], basketOrder: [{ name: `${DESC} (рахунок ${inv.number})`, qty: 1, sum: kop, total: kop, code: inv.number, unit: 'посл.' }] },
      redirectUrl: `${origin}/lab/manage/?t=${m.token}`, webHookUrl: `${origin}/api/mono/webhook`,
    });
    await db.prepare(`UPDATE lab_members SET last_invoice_id = ? WHERE id = ?`).bind(inv.id, m.id).run();
    if (d?.invoiceId) await db.prepare(`UPDATE invoices SET mono_id = ? WHERE id = ?`).bind(d.invoiceId, inv.id).run();
    else {
      await notify(`🧪 INSIDERS Lab: автоплатёж ${m.name} не прошёл (mono). Отправил ссылку на ручную оплату.`);
      await sendMail(m.email, 'INSIDERS Lab — autopay did not go through', `Hi ${m.name}! We could not charge your saved card for INSIDERS Lab. You can pay for the next month here: ${manage}`).catch(() => false);
    }
  }
}

/** /api/lab/manage?t=… GET → member status; POST {action:'autopay_off'|'pay'} → off, or { url } to pay the next month. */
export async function handleLabManage(db: DB, request: Request, monoToken: string | undefined, notify: Notify, origin: string): Promise<Response> {
  const t = new URL(request.url).searchParams.get('t') || '';
  if (!/^[a-f0-9]{32}$/.test(t)) return json(404, { ok: false });
  const m = await db.prepare(`SELECT * FROM lab_members WHERE token = ?`).bind(t).first<Member>();
  if (!m) return json(404, { ok: false });
  if (request.method === 'GET') return json(200, { ok: true, name: m.name, discord: m.discord, status: m.status, paid_until: m.paid_until, autopay: !!(m.autopay && m.card_token), price: m.price, lang: m.lang });
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (b.action === 'autopay_off') {
    await db.prepare(`UPDATE lab_members SET autopay = 0 WHERE id = ?`).bind(m.id).run();
    await notify(`🧪 INSIDERS Lab: ${m.name} выключил автоплатёж (оплачено до ${m.paid_until ?? '—'}).`).catch(() => {});
    return json(200, { ok: true });
  }
  if (b.action === 'pay') {
    if (!monoToken) return json(503, { ok: false, error: 'card_off' });
    const inv = await newInvoice(db, m);
    await db.prepare(`UPDATE lab_members SET last_invoice_id = ? WHERE id = ?`).bind(inv.id, m.id).run();
    return monoPay(db, monoToken, inv.token, origin);
  }
  return json(400, { ok: false });
}
