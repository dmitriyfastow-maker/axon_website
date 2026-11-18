// Undo (18.11, Dmitry: «easier to go back than to explain again»): before a site or a document changes, its previous
// version is kept. The person sees the list with times and brings any of them back; bringing back is itself undoable.
import type { DB } from './partner.js';

const KEEP = 20;
export type VerKind = 'site' | 'doc';

let ready = false;
async function ensure(db: DB) {
  if (ready) return;
  await db.prepare(`CREATE TABLE IF NOT EXISTS ws_versions (id INTEGER PRIMARY KEY AUTOINCREMENT, client_id INTEGER NOT NULL, kind TEXT NOT NULL, ref TEXT NOT NULL, data TEXT NOT NULL, at TEXT NOT NULL DEFAULT (datetime('now')))`).run();
  await db.prepare('CREATE INDEX IF NOT EXISTS ws_versions_ref ON ws_versions (client_id, kind, ref, id)').run();
  ready = true;
}

/** Keeps `data` as the version before a change. Same data as the newest kept one is skipped. */
export async function keepVersion(db: DB, clientId: number, kind: VerKind, ref: string, data: string | null | undefined) {
  if (!data) return;
  await ensure(db);
  const last = await db.prepare('SELECT data FROM ws_versions WHERE client_id = ? AND kind = ? AND ref = ? ORDER BY id DESC LIMIT 1').bind(clientId, kind, ref).first<{ data: string }>();
  if (last?.data === data) return;
  await db.prepare('INSERT INTO ws_versions (client_id, kind, ref, data) VALUES (?, ?, ?, ?)').bind(clientId, kind, ref, data.slice(0, 200_000)).run();
  await db.prepare('DELETE FROM ws_versions WHERE client_id = ? AND kind = ? AND ref = ? AND id NOT IN (SELECT id FROM ws_versions WHERE client_id = ? AND kind = ? AND ref = ? ORDER BY id DESC LIMIT ?)')
    .bind(clientId, kind, ref, clientId, kind, ref, KEEP).run();
}

/** Newest first: id, time and a short label (the title it had). */
export async function listVersions(db: DB, clientId: number, kind: VerKind, ref: string) {
  await ensure(db);
  const r = await db.prepare('SELECT id, at, data FROM ws_versions WHERE client_id = ? AND kind = ? AND ref = ? ORDER BY id DESC LIMIT ?').bind(clientId, kind, ref, KEEP).all<{ id: number; at: string; data: string }>();
  return (r.results || []).map((v) => {
    let label = '';
    try { const x = JSON.parse(v.data); label = String(x.title || '').slice(0, 80); } catch { /* plain text */ }
    return { id: v.id, at: v.at, label };
  });
}

export async function getVersion(db: DB, clientId: number, id: number) {
  await ensure(db);
  return db.prepare('SELECT id, kind, ref, data FROM ws_versions WHERE id = ? AND client_id = ?').bind(id, clientId).first<{ id: number; kind: VerKind; ref: string; data: string }>();
}
