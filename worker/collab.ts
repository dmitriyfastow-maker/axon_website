// /api/collab: proposals from creators, UGC, agencies, brands, tech partners and job seekers.
// Each one becomes a lead with mode 'collab' and its own private chat; Vax negotiates there, the owner sees everything.
import type { DB } from './partner.js';
import { logEvent, type Notify } from './deals.js';
import { newRoom } from './rooms.js';

const TYPES = ['creator', 'ugc', 'agency', 'brand', 'tech', 'job', 'other'];
const s = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export async function handleCollab(db: DB, request: Request, notify: Notify, onNew: (id: number) => void): Promise<Response> {
  if (request.method !== 'POST') return json(405, { ok: false });
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  // Bots: a filled honeypot or a form sent faster than 3 seconds gets a silent "ok".
  if (b.website || Date.now() - Number(b.startedAt) < 3000) return json(200, { ok: true });
  const type = TYPES.includes(String(b.type)) ? String(b.type) : 'other';
  const name = s(b.name, 80), contact = s(b.contact, 120), message = s(b.message, 2000);
  const bad = [name.length < 1 && 'name', contact.length < 3 && 'contact', message.length < 2 && 'message'].filter(Boolean);
  if (bad.length) return json(400, { ok: false, fields: bad });
  const lang = ['en', 'ru', 'ua'].includes(String(b.lang)) ? String(b.lang) : 'en';
  const link = s(b.link, 300), audience = s(b.audience, 40);
  const full = [message, link && `Link: ${link}`, audience && `Audience: ${audience}`].filter(Boolean).join('\n');
  const country = (request as { cf?: { country?: string } }).cf?.country ?? null;
  const room = newRoom();
  const res = (await db
    .prepare(`INSERT INTO leads (mode, name, contact, interest, message, lang, country, page, room, status) VALUES ('collab', ?, ?, ?, ?, ?, ?, '/collab/', ?, 'collab')`)
    .bind(name, contact, type, full, lang, country, room)
    .run()) as { meta?: { last_row_id?: number } };
  const id = res?.meta?.last_row_id;
  if (!id) return json(500, { ok: false });
  await logEvent(db, id, 'system', 'note', `Collaboration proposal: ${type}`);
  onNew(id);
  return json(200, { ok: true, room });
}
