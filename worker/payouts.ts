// Commission ledger. A won lead with a value creates payouts automatically:
// the manager who closed it (warm-lead rate) and the partner whose link brought the client (own-client rate).
// The same person who brought AND closed the client gets the full-cycle rate (the most work, the most money).
// Every partner gets the same rates (31.10.2026): the old content plans are no longer applied.
// The referrer's direct sponsor (partners.parent_id) gets the team bonus on every sale and renewal.
import type { DB } from './partner.js';
import { RATES } from '../src/data/partners.js';
import { firstReferral } from './referrals.js';

/** Commissions are counted from the net payment: minus the 5% single tax and the card fee (industry standard, Decision 52). */
export const NET = 0.935;

export async function createPayouts(db: DB, leadId: number) {
  const l = await db
    .prepare(
      `SELECT d.value_usd, d.closer_id, r.partner_id AS referrer_id, rp.plan AS referrer_plan,
              (lower(trim(d.contact)) = lower(trim(rp.email))
               OR EXISTS (SELECT 1 FROM clients c WHERE c.id = d.client_id AND lower(trim(c.email)) = lower(trim(rp.email)))) AS self_ref,
              (SELECT value FROM settings WHERE key = 'period_' || d.id) AS period
       FROM leads d LEFT JOIN links r ON r.slug = d.ref LEFT JOIN partners rp ON rp.id = r.partner_id
       WHERE d.id = ? AND d.status = 'won' AND d.value_usd > 0`,
    )
    .bind(leadId)
    .first<{ value_usd: number; closer_id: number | null; referrer_id: number | null; referrer_plan: string | null; self_ref: number | null; period: string | null }>();
  if (!l) return;
  // Lifetime attribution by e-mail (migration 0035): a buyer who already paid before is a renewal (30%), not a new sale.
  try {
    const br = await db.prepare(`SELECT b.first_lead FROM buyer_ref b JOIN leads d ON lower(trim(d.contact)) = b.email WHERE d.id = ?`).bind(leadId).first<{ first_lead: number | null }>();
    if (br?.first_lead && br.first_lead !== leadId) { await addRenewal(db, br.first_lead, l.value_usd); return; }
    if (br && !br.first_lead && l.referrer_id) await db.prepare(`UPDATE buyer_ref SET first_lead = ? WHERE email = (SELECT lower(trim(contact)) FROM leads WHERE id = ?) AND first_lead IS NULL`).bind(leadId, leadId).run();
  } catch { /* migration not applied yet */ }
  // Buying through your own link earns nothing (partner terms).
  if (l.self_ref) { if (l.closer_id === l.referrer_id) l.closer_id = null; l.referrer_id = null; }
  // First link wins: if this person first came by a client's invite link, no partner commission (the client gets a free month instead).
  let viral: number | null = null;
  if (l.referrer_id) { const f = await firstReferral(db, leadId); if (f && f.kind === 'client') l.referrer_id = null; }
  if (!l.referrer_id) viral = await viralPartner(db, leadId);
  const rows: [number, string, number][] = [];
  if (viral) rows.push([viral, 'viral', RATES.viral]);
  if (l.referrer_id && l.referrer_id === l.closer_id) rows.push([l.referrer_id, 'referral', RATES.fullCycle]);
  else if (l.referrer_id) rows.push([l.referrer_id, 'referral', RATES.agencyOwn]);
  if (l.closer_id && l.closer_id !== l.referrer_id) rows.push([l.closer_id, 'manager', RATES.agencyGiven]);
  // Team bonus: the referrer's direct sponsor gets 10% of this sale, on top (one level only — no pyramid).
  if (l.referrer_id) {
    const up = await db.prepare('SELECT parent_id FROM partners WHERE id = ?').bind(l.referrer_id).first<{ parent_id: number | null }>();
    if (up?.parent_id && up.parent_id !== l.referrer_id) rows.push([up.parent_id, 'team', RATES.team]);
  }
  // Decision 59 (17.11): a prepaid period (3, 6, 12 months) pays the partner as if the client paid monthly: the first
  // month at the first-payment rate, the other months at the renewal rate. Same money as monthly, and it funds the
  // client's bonus for the whole period, so nobody loses.
  const period = Math.max(1, Math.min(12, Number((await db.prepare('SELECT value FROM settings WHERE key = ?').bind('period_' + leadId).first<{ value: string }>().catch(() => null))?.value) || 1));
  const blend = (r: number) => (period > 1 ? Math.round(((r + RATES.agencyRenewal * (period - 1)) / period) * 100) / 100 : r);
  for (const row of rows) if (row[1] === 'referral') row[2] = blend(row[2]);
  const months = 1; // 15.11 (Dmitry): the whole commission becomes payable after the 14-day refund window, even for a year
  const net = Math.round(l.value_usd * NET * 100) / 100;
  for (const [pid, kind, rate] of rows) {
    const total = Math.round(net * rate) / 100;
    for (let k = 0; k < months; k++) {
      const part = k === months - 1 ? Math.round((total - Math.round((total / months) * 100) / 100 * (months - 1)) * 100) / 100 : Math.round((total / months) * 100) / 100;
      // One row per lead and kind (and month part); a corrected deal value updates an unpaid row.
      await db
        .prepare(
          `INSERT INTO payouts (partner_id, lead_id, kind, rate, base_usd, amount_usd, created_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now', ?))
           ON CONFLICT (lead_id, kind) DO UPDATE SET partner_id = excluded.partner_id, base_usd = excluded.base_usd, amount_usd = excluded.amount_usd
           WHERE payouts.status = 'due'`,
        )
        .bind(pid, leadId, months > 1 ? `${kind}:${k + 1}/${months}` : kind, rate, net, part, `+${k} months`)
        .run();
    }
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
  const q = (cols: string) => db
    .prepare(`SELECT p.*, d.name AS client, pr.name AS partner, pr.email AS partner_email${cols}
              FROM payouts p JOIN leads d ON d.id = p.lead_id JOIN partners pr ON pr.id = p.partner_id ORDER BY p.status = 'paid', p.id DESC LIMIT 1000`)
    .all();
  // Before migration 0032 reaches the live DB the payout-profile columns do not exist yet.
  const { results } = await q(', pr.payout_profile, pr.payout_filled_at').catch(() => q(''));
  return results;
}

export async function setPayout(db: DB, id: number, status: string) {
  if (!['due', 'paid', 'cancelled'].includes(status)) return false;
  // No payout is sent before the partner fills in the payout details (country, status, residency, 18+, terms).
  if (status === 'paid') {
    const ok = await db.prepare('SELECT pr.payout_filled_at AS f FROM payouts p JOIN partners pr ON pr.id = p.partner_id WHERE p.id = ?').bind(id).first<{ f: string | null }>().catch(() => ({ f: 'no-column-yet' }));
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
  if (l.referrer_id) { const f = await firstReferral(db, leadId); if (f && f.kind === 'client') l.referrer_id = null; }
  const tag = Date.now().toString(36);
  if (!l.referrer_id) {
    const vp = await viralPartner(db, leadId);
    if (vp) await db.prepare('INSERT INTO payouts (partner_id, lead_id, kind, rate, base_usd, amount_usd) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(vp, leadId, `renewal-viral:${tag}`, RATES.viral, Math.round(amountUsd * NET * 100) / 100, Math.round(amountUsd * NET * RATES.viral) / 100).run();
  }
  const rows: [number, string][] = [];
  if (l.referrer_id) rows.push([l.referrer_id, `renewal-referral:${tag}`]);
  // Only an active manager keeps the lifetime share; a paused one loses it (the project moves to another manager).
  if (l.closer_id && l.closer_id !== l.referrer_id && l.closer_status === 'approved') rows.push([l.closer_id, `renewal-manager:${tag}`]);
  for (const [pid, kind] of rows) {
    await db
      .prepare('INSERT INTO payouts (partner_id, lead_id, kind, rate, base_usd, amount_usd) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(pid, leadId, kind, RATES.agencyRenewal, Math.round(amountUsd * NET * 100) / 100, Math.round(amountUsd * NET * RATES.agencyRenewal) / 100)
      .run();
  }
  // Team bonus on renewals too: 10% to the referrer's direct sponsor.
  if (l.referrer_id) {
    const up = await db.prepare('SELECT parent_id FROM partners WHERE id = ?').bind(l.referrer_id).first<{ parent_id: number | null }>();
    if (up?.parent_id && up.parent_id !== l.referrer_id) {
      await db.prepare('INSERT INTO payouts (partner_id, lead_id, kind, rate, base_usd, amount_usd) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(up.parent_id, leadId, `renewal-team:${tag}`, RATES.team, Math.round(amountUsd * NET * 100) / 100, Math.round(amountUsd * NET * RATES.team) / 100).run();
    }
  }
  return true;
}

/** The partner behind a friend's invite: the friend came by a client's link, and that client was brought by a partner. */
export async function viralPartner(db: DB, leadId: number): Promise<number | null> {
  try {
    const f = await firstReferral(db, leadId);
    if (!f || f.kind !== 'client') return null;
    const r = await db.prepare('SELECT referrer_client_id AS c FROM referrals WHERE id = ?').bind(f.id).first<{ c: number | null }>();
    if (!r?.c) return null;
    const p = await db.prepare(`SELECT COALESCE(
        (SELECT r2.referrer_partner_id FROM referrals r2 JOIN leads d2 ON d2.id = r2.lead_id WHERE d2.client_id = ?1 AND r2.kind = 'partner' ORDER BY r2.id LIMIT 1),
        (SELECT k.partner_id FROM leads d3 JOIN links k ON k.slug = d3.ref WHERE d3.client_id = ?1 AND d3.ref IS NOT NULL ORDER BY d3.id LIMIT 1)) AS pid`).bind(r.c).first<{ pid: number | null }>();
    return p?.pid ?? null;
  } catch { return null; }
}
