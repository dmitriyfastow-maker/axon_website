// Owner-only API: leads (with the lead exchange), partners and closers. Protected by the ADMIN_TOKEN secret.
import type { DB } from './partner.js';
import { ownerLead, ownerOverview, ownerUpdateLead, ownerUpdatePartner, type Notify } from './deals.js';
import { staffMessage } from './rooms.js';
import { aiReply, decideOffer, setAiState } from './aimanager.js';
import { handleFinanceAdmin } from './finance.js';
import { handleOwnerChat } from './ownerchat.js';
import { newRoom } from './rooms.js';
import { addRenewal, allPayouts, setPayout } from './payouts.js';
import HQ from './hq.json';
import { analytics, makeDigest } from './autopilot.js';
import type { AiBinding } from './chat.js';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

function authorized(request: Request, token: string | undefined): boolean {
  const got = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token || token.length < 32 || got.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ got.charCodeAt(i);
  return diff === 0;
}

/** /api/admin, /api/admin/lead/<id>, /api/admin/partner/<id> */
export async function handleAdminApi(db: DB, request: Request, token: string | undefined, path: string, notify: Notify, ai?: AiBinding): Promise<Response> {
  if (!authorized(request, token)) return json(401, { ok: false });
  if (path === '' && request.method === 'GET') return json(200, { ok: true, ...(await ownerOverview(db, notify)), payouts: await allPayouts(db), hq: HQ });
  if (path === 'analytics' && request.method === 'GET') return json(200, { ok: true, ...(await analytics(db)) });
  if (path === 'autopilot' && request.method === 'GET') {
    const st = (await db.prepare('SELECT key, value FROM settings').all()).results;
    const digests = (await db.prepare('SELECT at, text FROM digests ORDER BY id DESC LIMIT 7').all()).results;
    return json(200, { ok: true, settings: st, digests });
  }
  if (path === 'autopilot' && request.method === 'POST') {
    const bc = (await request.clone().json().catch(() => ({}))) as Record<string, unknown>;
    if (typeof bc.vax_lessons === 'string') await db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value').bind('vax_lessons', bc.vax_lessons.slice(0, 3000)).run();
    if (typeof bc.friend_codes === 'string') await db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value').bind('friend_codes', bc.friend_codes.toUpperCase().replace(/[^A-Z0-9_,-]/g, '').slice(0, 200)).run();
    const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    for (const k of ['auto_publish', 'auto_approve', 'auto_qc', 'digest', 'ai_manager', 'email_replies', 'price_owner', 'vax_learn']) {
      if (b[k] !== undefined) await db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value').bind(k, b[k] ? '1' : '0').run();
    }
    return json(200, { ok: true });
  }
  // Tester mode: a fake client to walk the whole client path. Marked ТЕСТ, kept away from managers.
  if (path === 'test-lead' && request.method === 'POST') {
    const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const st = Object.fromEntries(((await db.prepare('SELECT key, value FROM settings').all()).results as { key: string; value: string }[]).map((x) => [x.key, x.value]));
    const code = (st.friend_codes || 'DIMA').split(',')[0].trim().toUpperCase();
    const room = newRoom();
    const res = (await db
      .prepare(`INSERT INTO leads (mode, name, contact, interest, message, lang, page, room, promo, status) VALUES ('request', ?, 'test@vaxo.test', 'single', ?, 'ru', 'test', ?, ?, 'test')`)
      .bind(b.friend ? 'ТЕСТ Друг' : 'ТЕСТ Клиент', 'Тестовая заявка владельца: пройти путь клиента', room, b.friend ? code : null)
      .run()) as { meta?: { last_row_id?: number } };
    const id = res?.meta?.last_row_id;
    if (id) await aiReply(db, ai, id, notify, { greet: true });
    return json(200, { ok: true, room, id });
  }
  if (path === 'test-lead/clear' && request.method === 'POST') {
    await db.prepare(`UPDATE leads SET status = 'archived' WHERE page = 'test'`).run();
    return json(200, { ok: true });
  }
  if (path === 'claude' || path.startsWith('claude/')) return handleOwnerChat(db, ai, request, path.slice('claude'.length).replace(/^\//, ''), notify);
  if (path === 'finance' || path.startsWith('finance/')) {
    const got = { id: 0 };
    const res = await handleFinanceAdmin(db, request, path.slice('finance'.length).replace(/^\//, ''), notify, (id) => { got.id = id; });
    if (got.id) await aiReply(db, ai, got.id, notify, { nudge: 'The team has just RECEIVED the client\'s payment. Thank them warmly in one or two sentences, say the payment arrived and what happens next (work starts / continues, next preview or step). No amounts unless they ask.' }).catch(() => false);
    return res;
  }
  if (path === 'digest' && request.method === 'POST') return json(200, { ok: true, text: await makeDigest(db, ai) });
  const pay = path.match(/^payout\/(\d+)$/);
  if (pay && request.method === 'POST') {
    const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return json((await setPayout(db, Number(pay[1]), String(b.status))) ? 200 : 400, { ok: true });
  }
  const rp = path.match(/^lead\/(\d+)\/payment$/);
  if (rp && request.method === 'POST') {
    const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return json((await addRenewal(db, Number(rp[1]), Math.round(Number(b.amount)))) ? 200 : 400, { ok: true });
  }
  const of = path.match(/^lead\/(\d+)\/offer$/);
  if (of && request.method === 'POST') {
    const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const counter = typeof b.counter === 'string' && b.counter.trim() ? b.counter.trim().slice(0, 60) : null;
    const choice = typeof b.choice === 'string' ? b.choice : b.accept === true ? 'a' : counter ? 'own' : 'n';
    const ok = await decideOffer(db, ai, Number(of[1]), choice, notify, counter);
    return json(200, { ok });
  }
  const ac = path.match(/^lead\/(\d+)\/ai$/);
  if (ac && request.method === 'POST') {
    await setAiState(db, Number(ac[1]), 'owner', (await request.json().catch(() => ({}))) as Record<string, unknown>);
    return json(200, { ok: true });
  }
  const mm = path.match(/^lead\/(\d+)\/msg$/);
  if (mm && request.method === 'POST') {
    const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const ok = await staffMessage(db, Number(mm[1]), 'owner', b);
    return json(ok ? 200 : 400, { ok });
  }
  const m = path.match(/^(lead|partner)\/(\d+)$/);
  if (!m) return json(404, { ok: false });
  const id = Number(m[2]);
  if (request.method === 'GET' && m[1] === 'lead') return json(200, { ok: true, ...(await ownerLead(db, id)) });
  if (request.method !== 'POST') return json(405, { ok: false });
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const ok = m[1] === 'lead' ? await ownerUpdateLead(db, id, b, notify) : await ownerUpdatePartner(db, id, b);
  return json(ok ? 200 : 400, { ok });
}
