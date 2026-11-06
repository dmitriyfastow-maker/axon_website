// Lifetime attribution of a buyer to a partner link, by e-mail (migration 0035). First link wins, for good.
// Every function falls back quietly if the table does not exist yet.
import type { DB } from './partner.js';

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** The partner link slug that owns this buyer: the stored one, or — if the buyer is new and came by a valid partner
 *  link — the given one (which is then stored). Client invite links (c_…) never create a partner attribution. */
export async function buyerRef(db: DB, contact: string | null | undefined, ref: string | null | undefined): Promise<string | null> {
  const e = (contact || '').trim().toLowerCase();
  const given = ref && !ref.startsWith('c_') ? ref : null;
  if (!EMAIL.test(e)) return ref || null;
  try {
    const row = await db.prepare('SELECT ref FROM buyer_ref WHERE email = ?').bind(e).first<{ ref: string }>();
    if (row?.ref) return row.ref;
    if (!given) return ref || null;
    const ok = await db.prepare('SELECT slug FROM links WHERE slug = ? AND active = 1').bind(given).first<{ slug: string }>();
    if (!ok) return ref || null;
    await db.prepare('INSERT OR IGNORE INTO buyer_ref (email, ref) VALUES (?, ?)').bind(e, given).run();
    return given;
  } catch {
    return ref || null;
  }
}
