// Client rooms: a private project chat per lead (/room/?t=<room>).
// Client ↔ their manager (partner-closer) ↔ owner. The owner sees everything; 'note' messages are internal.
import type { DB } from './partner.js';
import { logEvent, type Notify } from './deals.js';
import { guardMessage } from './autopilot.js';
import { botLink, relayToClient } from './telegram.js';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const s = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const ROOM_RE = /^[a-f0-9]{24}$/;

export function newRoom(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function addMessage(db: DB, leadId: number, sender: string, kind: string, text: string) {
  await db.prepare('INSERT INTO messages (lead_id, sender, kind, text) VALUES (?, ?, ?, ?)').bind(leadId, sender, kind, text).run();
  // Clients who joined via Telegram get every reply there too.
  if (kind === 'text') await relayToClient(db, leadId, sender, text).catch(() => {});
}

/** Messages with a display name for every sender. Clients never get internal notes. */
export async function roomMessages(db: DB, leadId: number, withNotes: boolean) {
  const { results } = await db
    .prepare(
      `SELECT m.id, m.at, m.sender, m.kind, m.text, p.name AS partner_name FROM messages m
       LEFT JOIN partners p ON m.sender = 'partner:' || p.id
       WHERE m.lead_id = ? ${withNotes ? '' : "AND m.kind != 'note'"} ORDER BY m.id LIMIT 500`,
    )
    .bind(leadId)
    .all<Record<string, unknown>>();
  return results;
}

/** /api/room/<token>: the client's side. */
export async function handleRoomApi(db: DB, request: Request, token: string, notify: Notify, onClient?: (leadId: number) => void): Promise<Response> {
  if (!ROOM_RE.test(token)) return json(404, { ok: false });
  const lead = await db
    .prepare(`SELECT d.id, d.name, d.lang, d.status, d.closer_id, d.ai, d.stage, d.stage_due, p.name AS manager FROM leads d LEFT JOIN partners p ON p.id = d.closer_id WHERE d.room = ?`)
    .bind(token)
    .first<{ id: number; name: string; lang: string; status: string; closer_id: number | null; ai: string; stage: string | null; stage_due: string | null; manager: string | null }>();
  if (!lead) return json(404, { ok: false });
  if (request.method === 'GET') {
    await db.prepare(`UPDATE leads SET client_seen_at = datetime('now') WHERE id = ?`).bind(lead.id).run();
    // Clients see only the manager's first name; owner messages are signed as the Vaxo team.
    const first = (n: unknown) => (typeof n === 'string' ? n.trim().split(/\s+/)[0] : null);
    const msgs = (await roomMessages(db, lead.id, false)).map((m) => ({ ...m, partner_name: first(m.partner_name) }));
    return json(200, { ok: true, name: lead.name, lang: lead.lang, status: lead.status, stage: lead.stage, stage_due: lead.stage_due, ai: lead.ai === 'on', manager: first(lead.manager), tg: await botLink(token).catch(() => null), messages: msgs });
  }
  if (request.method !== 'POST') return json(405, { ok: false });
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const text = s(b.text, 2000);
  if (!text) return json(400, { ok: false });
  const recent = await db
    .prepare(`SELECT COUNT(*) AS n FROM messages WHERE lead_id = ? AND sender = 'client' AND at > datetime('now', '-1 hour')`)
    .bind(lead.id)
    .first<{ n: number }>();
  if ((recent?.n ?? 0) >= 40) return json(429, { ok: false });
  await addMessage(db, lead.id, 'client', 'text', text);
  // Vax answers by itself; the owner hears about client messages only when the AI is paused for this client.
  if (lead.ai === 'on' && onClient) onClient(lead.id);
  else await notify(`💬 #${lead.id} ${lead.name}${lead.manager ? ` (manager ${lead.manager})` : ' (no manager yet)'}: ${text.slice(0, 300)}`);
  return json(200, { ok: true });
}

/** A message from the manager or the owner. The first message to the client counts as "contacted". */
export async function staffMessage(db: DB, leadId: number, sender: string, b: Record<string, unknown>): Promise<boolean | 'guard'> {
  const kind = ['text', 'note', 'call'].includes(String(b.kind)) ? String(b.kind) : 'text';
  let text = s(b.text, 3000);
  if (kind === 'call') {
    const when = s(b.when, 40);
    const link = s(b.link, 300);
    if (!when) return false;
    text = [`📅 ${when}`, link, text].filter(Boolean).join('\n');
  }
  if (!text) return false;
  // Managers may not move clients to other contacts or payments: such messages never reach the client.
  if (sender.startsWith('partner:') && kind !== 'note' && guardMessage(kind === 'call' ? s(b.text, 3000) : text)) return 'guard';
  await addMessage(db, leadId, sender, kind, text);
  if (kind !== 'note' && sender.startsWith('partner:')) {
    const l = await db.prepare('SELECT status FROM leads WHERE id = ?').bind(leadId).first<{ status: string }>();
    if (l?.status === 'claimed') {
      await db.prepare(`UPDATE leads SET status = 'contacted', due_at = datetime('now', '+72 hours'), updated_at = datetime('now') WHERE id = ?`).bind(leadId).run();
      await logEvent(db, leadId, sender, 'status', 'contacted: first message in the project chat');
    }
  }
  if (kind === 'call') await logEvent(db, leadId, sender, 'note', `Call scheduled: ${text.split('\n')[0]}`);
  return true;
}

/** Client messages waiting for a reply longer than 24 h — alert the owner once per message. */
export async function unansweredAlerts(db: DB, notify: Notify) {
  const { results } = await db
    .prepare(
      `SELECT m.id, m.lead_id, d.name, p.name AS manager FROM messages m JOIN leads d ON d.id = m.lead_id LEFT JOIN partners p ON p.id = d.closer_id
       WHERE m.sender = 'client' AND m.at < datetime('now', '-24 hours') AND m.at > datetime('now', '-7 days')
         AND m.id = (SELECT MAX(id) FROM messages x WHERE x.lead_id = m.lead_id AND x.kind != 'note')
         AND NOT EXISTS (SELECT 1 FROM lead_events e WHERE e.lead_id = m.lead_id AND e.kind = 'alert' AND e.text = 'msg:' || m.id)`,
    )
    .all<{ id: number; lead_id: number; name: string; manager: string | null }>();
  for (const r of results) {
    await logEvent(db, r.lead_id, 'system', 'alert', `msg:${r.id}`);
    await notify(`⚠️ #${r.lead_id} ${r.name}: client has been waiting for a reply over 24 h${r.manager ? ` (manager ${r.manager})` : ''}.`);
  }
}

/** Repeat client: a new request from someone a manager already closed goes straight to that manager. */
export async function bindReturningClient(db: DB, leadId: number, contact: string, notify: Notify) {
  const prev = await db
    .prepare(`SELECT d.closer_id, p.name FROM leads d JOIN partners p ON p.id = d.closer_id WHERE lower(d.contact) = lower(?) AND d.status = 'won' AND d.id != ? AND p.closer = 'approved' ORDER BY d.id DESC LIMIT 1`)
    .bind(contact, leadId)
    .first<{ closer_id: number; name: string }>();
  if (!prev) return;
  await db
    .prepare(`UPDATE leads SET status = 'claimed', closer_id = ?, claimed_at = datetime('now'), due_at = datetime('now', '+24 hours'), updated_at = datetime('now') WHERE id = ?`)
    .bind(prev.closer_id, leadId)
    .run();
  await logEvent(db, leadId, 'system', 'claim', `Returning client — assigned to their manager ${prev.name}`);
  await notify(`🔁 #${leadId}: returning client assigned to ${prev.name}.`);
}
