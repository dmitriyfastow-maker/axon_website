// Commission ledger. A won lead with a value creates payouts automatically:
// the manager who closed it (warm-lead rate) and the partner whose link brought the client (own-client rate).
// The same person who brought AND closed the client gets the full-cycle rate (the most work, the most money).
// Content partners on the 'first30' / 'life10' plan get that plan instead of the classic referral rate.
// The referrer's direct sponsor (partners.parent_id) gets the team bonus on every sale and renewal.
import type { DB } from './partner.js';
import { RATES } from '../src/data/partners.js';

export async function createPayouts(db: DB, leadId: number) {
  const l = await db
    .prepare(
      `SELECT d.value_usd, d.closer_id, r.partner_id AS referrer_id, rp.plan AS referrer_plan,
              (lower(trim(d.contact)) = lower(trim(rp.email))) AS self_ref
       FROM leads d LEFT JOIN links r ON r.slug = d.ref LEFT JOIN partners rp ON rp.id = r.partner_id
       WHERE d.id = ? AND d.status = 'won' AND d.value_usd > 0`,
    )
    .bind(leadId)
    .first<{ value_usd: number; closer_id: number | null; referrer_id: number | null; referrer_plan: string | null; self_ref: number | null }>();
  if (!l) return;
  // Buying through your own link earns nothing (partner terms).
  if (l.self_ref) { if (l.closer_id === l.referrer_id) l.closer_id = null; l.referrer_id = null; }
  const rows: [number, string, number][] = [];
  if (l.referrer_id && l.referrer_id === l.closer_id) rows.push([l.referrer_id, 'referral', RATES.fullCycle]);
  else if (l.referrer_id) rows.push([l.referrer_id, 'referral', l.referrer_plan === 'life10' ? RATES.clipLife : l.referrer_plan === 'first30' ? RATES.clipFirst : RATES.agencyOwn]);
  if (l.closer_id && l.closer_id !== l.referrer_id) rows.push([l.closer_id, 'manager', RATES.agencyGiven]);
  // Team bonus: the referrer's direct sponsor gets 10% of this sale, on top (one level only — no pyramid).
  if (l.referrer_id) {
    const up = await db.prepare('SELECT parent_id FROM partners WHERE id = ?').bind(l.referrer_id).first<{ parent_id: number | null }>();
    if (up?.parent_id && up.parent_id !== l.referrer_id) rows.push([up.parent_id, 'team', RATES.team]);
  }
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
    .prepare(`SELECT p.*, d.name AS client, pr.name AS partner, pr.email AS partner_email, pr.payout_profile, pr.payout_filled_at
              FROM payouts p JOIN leads d ON d.id = p.lead_id JOIN partners pr ON pr.id = p.partner_id ORDER BY p.status = 'paid', p.id DESC LIMIT 1000`)
    .all();
  return results;
}

export async function setPayout(db: DB, id: number, status: string) {
  if (!['due', 'paid', 'cancelled'].includes(status)) return false;
  // No payout is sent before the partner fills in the payout details (country, status, residency, 18+, terms).
  if (status === 'paid') {
    const ok = await db.prepare('SELECT pr.payout_filled_at AS f FROM payouts p JOIN partners pr ON pr.id = p.partner_id WHERE p.id = ?').bind(id).first<{ f: string | null }>();
    if (!ok?.f) return false;
  }
  await db.prepare(`UPDATE payouts SET status = ?, paid_at = CASE WHEN ? = 'paid' THEN datetime('now') ELSE NULL END WHERE id = ?`).bind(status, status, id).run();
  return true;
}

/** A repeat payment from an existing client (renewal, monthly fee, new order): the closing manager and the referrer
 *  each get the lifetime renewal rate, for as long as the client pays. */
export async function addRenewal(db: DB, leadId: number, amountUsd: number) {
  if (!(amountUsd > 0)) return false;
  const l = await db
    .prepare(
      `SELECT d.closer_id, c.closer AS closer_status, r.partner_id AS referrer_id, rp.plan AS referrer_plan
       FROM leads d LEFT JOIN partners c ON c.id = d.closer_id LEFT JOIN links r ON r.slug = d.ref LEFT JOIN partners rp ON rp.id = r.partner_id
       WHERE d.id = ? AND d.status = 'won'`,
    )
    .bind(leadId)
    .first<{ closer_id: number | null; closer_status: string | null; referrer_id: number | null; referrer_plan: string | null }>();
  if (!l) return false;
  const tag = Date.now().toString(36);
  const rows: [number, string][] = [];
  // 'first30' content partners chose a bigger first payment instead of the lifetime share.
  if (l.referrer_id && l.referrer_plan !== 'first30') rows.push([l.referrer_id, `renewal-referral:${tag}`]);
  // Only an active manager keeps the lifetime share; a paused one loses it (the project moves to another manager).
  if (l.closer_id && l.closer_id !== l.referrer_id && l.closer_status === 'approved') rows.push([l.closer_id, `renewal-manager:${tag}`]);
  for (const [pid, kind] of rows) {
    await db
      .prepare('INSERT INTO payouts (partner_id, lead_id, kind, rate, base_usd, amount_usd) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(pid, leadId, kind, RATES.agencyRenewal, amountUsd, Math.round((amountUsd * RATES.agencyRenewal) / 100))
      .run();
  }
  // Team bonus on renewals too: 10% to the referrer's direct sponsor.
  if (l.referrer_id) {
    const up = await db.prepare('SELECT parent_id FROM partners WHERE id = ?').bind(l.referrer_id).first<{ parent_id: number | null }>();
    if (up?.parent_id && up.parent_id !== l.referrer_id) {
      await db.prepare('INSERT INTO payouts (partner_id, lead_id, kind, rate, base_usd, amount_usd) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(up.parent_id, leadId, `renewal-team:${tag}`, RATES.team, amountUsd, Math.round((amountUsd * RATES.team) / 100)).run();
    }
  }
  return true;
}
