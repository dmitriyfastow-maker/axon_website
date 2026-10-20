// Commission ledger. A won lead with a value creates payouts automatically:
// the manager who closed it (warm-lead rate) and the partner whose link brought the client (own-client rate).
// If both are the same person, only the higher own-client rate applies.
import type { DB } from './partner.js';
import { RATES } from '../src/data/partners.js';

export async function createPayouts(db: DB, leadId: number) {
  const l = await db
    .prepare(
      `SELECT d.value_usd, d.closer_id, (SELECT l.partner_id FROM links l WHERE l.slug = d.ref) AS referrer_id
       FROM leads d WHERE d.id = ? AND d.status = 'won' AND d.value_usd > 0`,
    )
    .bind(leadId)
    .first<{ value_usd: number; closer_id: number | null; referrer_id: number | null }>();
  if (!l) return;
  const rows: [number, string, number][] = [];
  if (l.referrer_id) rows.push([l.referrer_id, 'referral', RATES.agencyOwn]);
  if (l.closer_id && l.closer_id !== l.referrer_id) rows.push([l.closer_id, 'manager', RATES.agencyGiven]);
  for (const [pid, kind, rate] of rows) {
    // One row per lead and kind; a corrected deal value updates an unpaid row.
    await db
      .prepare(
        `INSERT INTO payouts (partner_id, lead_id, kind, rate, base_usd, amount_usd) VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (lead_id, kind) DO UPDATE SET partner_id = excluded.partner_id, base_usd = excluded.base_usd, amount_usd = excluded.amount_usd
         WHERE payouts.status = 'due'`,
      )
      .bind(pid, leadId, kind, rate, l.value_usd, Math.round((l.value_usd * rate) / 100))
      .run();
  }
}

export async function partnerPayouts(db: DB, partnerId: number) {
  const { results } = await db
    .prepare(`SELECT p.id, p.lead_id, p.kind, p.rate, p.base_usd, p.amount_usd, p.status, p.created_at, p.paid_at, d.name AS client
              FROM payouts p JOIN leads d ON d.id = p.lead_id WHERE p.partner_id = ? AND p.status != 'cancelled' ORDER BY p.id DESC`)
    .bind(partnerId)
    .all();
  return results;
}

export async function allPayouts(db: DB) {
  const { results } = await db
    .prepare(`SELECT p.*, d.name AS client, pr.name AS partner, pr.email AS partner_email
              FROM payouts p JOIN leads d ON d.id = p.lead_id JOIN partners pr ON pr.id = p.partner_id ORDER BY p.status = 'paid', p.id DESC LIMIT 1000`)
    .all();
  return results;
}

export async function setPayout(db: DB, id: number, status: string) {
  if (!['due', 'paid', 'cancelled'].includes(status)) return false;
  await db.prepare(`UPDATE payouts SET status = ?, paid_at = CASE WHEN ? = 'paid' THEN datetime('now') ELSE NULL END WHERE id = ?`).bind(status, status, id).run();
  return true;
}

/** A repeat payment from an existing client (renewal, monthly fee, new order): the closing manager and the referrer
 *  each get the lifetime renewal rate, for as long as the client pays. */
export async function addRenewal(db: DB, leadId: number, amountUsd: number) {
  if (!(amountUsd > 0)) return false;
  const l = await db
    .prepare(`SELECT d.closer_id, (SELECT l.partner_id FROM links l WHERE l.slug = d.ref) AS referrer_id FROM leads d WHERE d.id = ? AND d.status = 'won'`)
    .bind(leadId)
    .first<{ closer_id: number | null; referrer_id: number | null }>();
  if (!l) return false;
  const tag = Date.now().toString(36);
  const rows: [number, string][] = [];
  if (l.referrer_id) rows.push([l.referrer_id, `renewal-referral:${tag}`]);
  if (l.closer_id && l.closer_id !== l.referrer_id) rows.push([l.closer_id, `renewal-manager:${tag}`]);
  for (const [pid, kind] of rows) {
    await db
      .prepare('INSERT INTO payouts (partner_id, lead_id, kind, rate, base_usd, amount_usd) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(pid, leadId, kind, RATES.agencyRenewal, amountUsd, Math.round((amountUsd * RATES.agencyRenewal) / 100))
      .run();
  }
  return true;
}
