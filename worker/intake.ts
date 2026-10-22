// Chat instead of forms (Decision 16): the first message a visitor types into the page chat starts a lead with its
// own project chat right away. No name or contact needed to begin — Vax asks for them naturally once the talk has
// substance ("to save our conversation and send you the preview") and stores them (see aimanager: "contact").
import type { DB } from './partner.js';
import { logEvent, type Notify } from './deals.js';
import { addMessage, newRoom } from './rooms.js';

const s = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const COLLAB = ['creator', 'ugc', 'agency', 'brand', 'tech', 'job', 'other'];
export const GUEST = 'Гость';

export async function handleIntake(db: DB, request: Request, notify: Notify, onNew: (id: number) => void): Promise<Response> {
  if (request.method !== 'POST') return json(405, { ok: false });
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  // Bots: honeypot or typed faster than 2 seconds after the page opened.
  if (b.website || Date.now() - Number(b.startedAt) < 2000) return json(200, { ok: true });
  const text = s(b.text, 4000);
  if (text.length < 2) return json(400, { ok: false });
  // Flood guard: at most 40 new chats an hour for the whole site.
  const n = await db.prepare(`SELECT COUNT(*) AS n FROM leads WHERE page LIKE 'chat:%' AND created_at > datetime('now', '-1 hour')`).first<{ n: number }>();
  if ((n?.n ?? 0) >= 40) return json(429, { ok: false });
  const kind = ['request', 'collab', 'gift'].includes(String(b.kind)) ? String(b.kind) : 'request';
  const lang = ['en', 'ru', 'ua'].includes(String(b.lang)) ? String(b.lang) : 'en';
  const interest = kind === 'collab' ? (COLLAB.includes(String(b.interest)) ? String(b.interest) : 'other') : kind === 'gift' ? 'gift-chat' : s(b.interest, 40) || null;
  const promo = s(b.promo, 30).toUpperCase() || null;
  const ref = s(b.ref, 60) || null;
  const country = (request as { cf?: { country?: string } }).cf?.country ?? null;
  const room = newRoom();
  const status = kind === 'collab' ? 'collab' : kind === 'gift' ? 'gift' : 'new';
  const res = (await db
    .prepare(`INSERT INTO leads (mode, name, contact, interest, message, lang, ref, country, page, room, promo, status) VALUES (?, ?, '', ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(kind === 'collab' ? 'collab' : 'request', GUEST, interest, text, lang, ref, country, `chat:${s(b.page, 80) || '/'}`, room, promo, status)
    .run()) as { meta?: { last_row_id?: number } };
  const id = res?.meta?.last_row_id;
  if (!id) return json(500, { ok: false });
  // A client from a partner's "for friends" link gets the friends mode.
  if (ref && !promo) {
    const fl = await db.prepare('SELECT friend FROM links WHERE slug = ?').bind(ref).first<{ friend: number }>();
    if (fl?.friend) await db.prepare(`UPDATE leads SET promo = 'FRIEND' WHERE id = ?`).bind(id).run();
  }
  await addMessage(db, id, 'client', 'text', text);
  await logEvent(db, id, 'system', 'note', `Chat started on the site (${kind})`);
  await notify(`🆕 #${id} новый разговор на сайте (${kind === 'collab' ? 'сотрудничество' : kind === 'gift' ? 'подарок' : 'клиент'}): ${text.slice(0, 300)}`);
  onNew(id);
  return json(200, { ok: true, room });
}
