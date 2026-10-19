// Owner-only API: leads (with the lead exchange), partners and closers. Protected by the ADMIN_TOKEN secret.
import type { DB } from './partner.js';
import { ownerLead, ownerOverview, ownerUpdateLead, ownerUpdatePartner, type Notify } from './deals.js';

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
export async function handleAdminApi(db: DB, request: Request, token: string | undefined, path: string, notify: Notify): Promise<Response> {
  if (!authorized(request, token)) return json(401, { ok: false });
  if (path === '' && request.method === 'GET') return json(200, { ok: true, ...(await ownerOverview(db, notify)) });
  const m = path.match(/^(lead|partner)\/(\d+)$/);
  if (!m) return json(404, { ok: false });
  const id = Number(m[2]);
  if (request.method === 'GET' && m[1] === 'lead') return json(200, { ok: true, events: await ownerLead(db, id) });
  if (request.method !== 'POST') return json(405, { ok: false });
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const ok = m[1] === 'lead' ? await ownerUpdateLead(db, id, b, notify) : await ownerUpdatePartner(db, id, b);
  return json(ok ? 200 : 400, { ok });
}
