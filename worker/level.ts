// INSIDERS Level backend: a person signs in with a one-time code sent to the email (no passwords), and the progress
// (done tasks, days, start time) is kept on the server so it follows them between devices. Without sign-in the page
// keeps working from the browser's own storage.
import type { DB } from './partner.js';
import { mailReady, sendMail } from './mail.js';
import { askAi, json as parse } from './autopilot.js';
import type { AiBinding } from './chat.js';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const hex = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, '0')).join('');
async function sha(v: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(v))), (b) => b.toString(16).padStart(2, '0')).join('');
}
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type State = { done: Record<string, string>; days: string[]; start: number };
function clean(v: unknown): State | null {
  const o = v as Partial<State> | null;
  if (!o || typeof o !== 'object' || !o.done || typeof o.done !== 'object' || !Array.isArray(o.days)) return null;
  const done: Record<string, string> = {};
  for (const [k, d] of Object.entries(o.done).slice(0, 100)) if (/^[\w-]{1,40}$/.test(k) && /^\d{4}-\d\d-\d\d$/.test(String(d))) done[k] = String(d);
  const days = o.days.filter((d) => /^\d{4}-\d\d-\d\d$/.test(String(d))).slice(-400) as string[];
  return { done, days, start: Number(o.start) > 0 ? Number(o.start) : Date.now() };
}
/** Merge two states: a task done anywhere stays done; the earlier start wins. */
function merge(a: State, b: State): State {
  return { done: { ...b.done, ...a.done }, days: [...new Set([...a.days, ...b.days])].sort(), start: Math.min(a.start, b.start) };
}

/** POST {action:'code', email} | {action:'verify', email, code, state?} | {action:'save', session, state} | GET ?session= */
export async function handleLevel(db: DB, request: Request, ai?: AiBinding): Promise<Response> {
  if (request.method === 'GET') {
    const sess = new URL(request.url).searchParams.get('session') || '';
    if (sess.length < 20) return json(401, { ok: false });
    const u = await db.prepare(`SELECT email, state FROM level_users WHERE session = ?`).bind(sess).first<{ email: string; state: string }>();
    if (!u) return json(401, { ok: false });
    return json(200, { ok: true, email: u.email, state: JSON.parse(u.state || '{}') });
  }
  if (request.method !== 'POST') return json(405, { ok: false });
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const email = String(b.email || '').trim().toLowerCase().slice(0, 120);

  // AI checks a quest: the person says what they did, the AI accepts it or says what is missing. No account needed.
  if (b.action === 'check') {
    const quest = String(b.quest || '').slice(0, 200), proof = String(b.proof || '').trim().slice(0, 800);
    const lang = ({ ru: 'Russian', ua: 'Ukrainian' } as Record<string, string>)[String(b.lang)] || 'English';
    if (!quest || proof.length < 8) return json(400, { ok: false, error: 'short' });
    const t = await askAi(ai, `You are a friendly but honest coach in INSIDERS Level, a daily-quest game for young builders (18+).
Quest: "${quest}"
What the player says they did: "${proof}"
Accept if the answer shows they really did the quest (concrete details, even small). Reject if it is empty, off-topic, a joke or only a promise to do it later.
Reply ONLY with JSON in ${lang}: {"pass": true|false, "text": "1-2 short sentences: if pass, praise one concrete detail and suggest a next micro-step; if not, say exactly what is missing"}`, 200);
    const j = parse<{ pass?: boolean; text?: string }>(t);
    if (!j?.text) return json(502, { ok: false });
    return json(200, { ok: true, pass: !!j.pass, text: String(j.text).slice(0, 400) });
  }

  if (b.action === 'code') {
    if (!EMAIL.test(email)) return json(400, { ok: false, error: 'email' });
    if (!mailReady()) return json(503, { ok: false, error: 'mail_off' });
    await db.prepare(`INSERT OR IGNORE INTO level_users (email) VALUES (?)`).bind(email).run();
    const u = await db.prepare(`SELECT code_at FROM level_users WHERE email = ?`).bind(email).first<{ code_at: string | null }>();
    if (u?.code_at && Date.now() - Date.parse(u.code_at.replace(' ', 'T') + 'Z') < 55_000) return json(429, { ok: false, error: 'wait' });
    const code = String(100000 + (crypto.getRandomValues(new Uint32Array(1))[0] % 900000));
    await db.prepare(`UPDATE level_users SET code_hash = ?, code_at = datetime('now'), tries = 0 WHERE email = ?`).bind(await sha(email + code), email).run();
    const ok = await sendMail(email, 'INSIDERS Level — your code', `Your code: ${code}\n\nIt works for 15 minutes. If you did not ask for it, just ignore this email.\n\n— Vaxo`);
    return ok ? json(200, { ok: true }) : json(502, { ok: false, error: 'mail' });
  }

  if (b.action === 'verify') {
    const code = String(b.code || '').replace(/\D/g, '');
    const u = await db.prepare(`SELECT code_hash, code_at, tries, state FROM level_users WHERE email = ?`).bind(email).first<{ code_hash: string | null; code_at: string | null; tries: number; state: string }>();
    if (!u?.code_hash || !u.code_at || u.tries >= 5 || Date.now() - Date.parse(u.code_at.replace(' ', 'T') + 'Z') > 15 * 60_000) return json(401, { ok: false, error: 'expired' });
    if ((await sha(email + code)) !== u.code_hash) {
      await db.prepare(`UPDATE level_users SET tries = tries + 1 WHERE email = ?`).bind(email).run();
      return json(401, { ok: false, error: 'code' });
    }
    const local = clean(b.state);
    let server: State | null = null;
    try { server = clean(JSON.parse(u.state || '{}')); } catch {}
    const state = local && server ? merge(local, server) : local || server || { done: {}, days: [], start: Date.now() };
    const session = hex(24);
    await db.prepare(`UPDATE level_users SET code_hash = NULL, session = ?, state = ?, updated = datetime('now') WHERE email = ?`).bind(session, JSON.stringify(state), email).run();
    return json(200, { ok: true, session, state });
  }

  if (b.action === 'save') {
    const sess = String(b.session || '');
    const state = clean(b.state);
    if (sess.length < 20 || !state) return json(400, { ok: false });
    const r = await db.prepare(`UPDATE level_users SET state = ?, updated = datetime('now') WHERE session = ?`).bind(JSON.stringify(state), sess).run();
    return (r as { meta?: { changes?: number } }).meta?.changes ? json(200, { ok: true }) : json(401, { ok: false });
  }
  return json(400, { ok: false });
}
