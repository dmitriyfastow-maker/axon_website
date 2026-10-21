// Owner-only API: leads (with the lead exchange), partners and closers. Protected by the ADMIN_TOKEN secret.
import type { DB } from './partner.js';
import { ownerLead, ownerOverview, ownerUpdateLead, ownerUpdatePartner, type Notify } from './deals.js';
import { staffMessage } from './rooms.js';
import { answerOffer, setAiState } from './aimanager.js';
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
    const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    for (const k of ['auto_publish', 'auto_approve', 'auto_qc', 'digest', 'ai_manager', 'email_replies', 'price_owner']) {
      if (b[k] !== undefined) await db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value').bind(k, b[k] ? '1' : '0').run();
    }
    return json(200, { ok: true });
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
    const ok = await answerOffer(db, ai, Number(of[1]), b.accept === true, counter, notify);
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
