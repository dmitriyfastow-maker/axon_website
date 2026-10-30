// Vaxo Lab — the paid tier of the INSIDERS Discord (Decision 24). A member fills the /lab/ form (18+ only), we create a
// lead and a card invoice and send them straight to the mono payment page. The paid invoice lands in Finance like any
// other; the Discord role is given by hand (Claude/Dmitry) from the Telegram notice.
import type { DB } from './partner.js';
import type { Notify } from './deals.js';
import { monoPay } from './mono.js';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const hex = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, '0')).join('');
const s = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

/** Founding price for the first 50 paid members, locked while they stay; then the regular price. */
export const LAB = { founding: 5, regular: 9, foundingSeats: 50 };

async function paidMembers(db: DB) {
  return (await db.prepare(`SELECT COUNT(DISTINCT lead_id) AS n FROM invoices WHERE description LIKE 'Vaxo Lab%' AND status = 'paid'`).first<{ n: number }>())?.n ?? 0;
}

/** GET /api/lab → current price and seats left; POST {name, discord, email, adult} → { url } of the mono payment page. */
export async function handleLab(db: DB, request: Request, monoToken: string | undefined, notify: Notify, origin: string): Promise<Response> {
  const paid = await paidMembers(db);
  const founding = paid < LAB.foundingSeats;
  const price = founding ? LAB.founding : LAB.regular;
  if (request.method === 'GET') return json(200, { ok: true, price, founding, seatsLeft: Math.max(0, LAB.foundingSeats - paid), regular: LAB.regular });
  if (request.method !== 'POST') return json(405, { ok: false });
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const name = s(b.name, 80), discord = s(b.discord, 40), email = s(b.email, 120);
  if (!name || !discord || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(400, { ok: false, error: 'fields' });
  if (b.adult !== true) return json(400, { ok: false, error: 'adult' });
  if (!monoToken) return json(503, { ok: false, error: 'card_off' });
  const src = s(b.src, 80) || 'discord';
  const lead = await db
    .prepare(`INSERT INTO leads (mode, name, contact, interest, message, lang, page, room, status, email_addr, source) VALUES ('request', ?, ?, 'lab', ?, 'en', '/lab/', ?, 'new', ?, ?)`)
    .bind(name, email, `Vaxo Lab — Discord: ${discord}`, hex(12), email, src)
    .run();
  const leadId = Number((lead as { meta?: { last_row_id?: number } }).meta?.last_row_id) || null;
  const year = new Date().getUTCFullYear();
  const n = ((await db.prepare(`SELECT COUNT(*) AS n FROM invoices WHERE number LIKE ?`).bind(`VX-${year}-%`).first<{ n: number }>())?.n ?? 0) + 1;
  const number = `VX-${year}-${String(n).padStart(4, '0')}`, token = hex(16);
  await db
    .prepare(`INSERT INTO invoices (number, token, lead_id, buyer, currency, amount, description, part, lang, due) VALUES (?, ?, ?, ?, 'USD', ?, ?, 'product', 'en', date('now', '+2 days'))`)
    .bind(number, token, leadId, name, price, `Vaxo Lab — 1 month membership${founding ? ' (founding price)' : ''}`)
    .run();
  await notify(`🧪 Vaxo Lab: ${name} (Discord ${discord}, ${email}) открыл оплату $${price}, счёт ${number}. После оплаты — выдать роль Lab в Discord.`).catch(() => {});
  return monoPay(db, monoToken, token, origin);
}
