// Owner-only API: leads, partners and link stats. Protected by the ADMIN_TOKEN secret.
import type { DB } from './partner.js';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

function authorized(request: Request, token: string | undefined): boolean {
  const got = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token || token.length < 32 || got.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ got.charCodeAt(i);
  return diff === 0;
}

export async function handleAdminApi(db: DB, request: Request, token: string | undefined): Promise<Response> {
  if (!authorized(request, token)) return json(401, { ok: false });
  const [leads, partners] = await Promise.all([
    db
      .prepare(
        `SELECT d.id, d.created_at, d.mode, d.name, d.contact, d.interest, d.message, d.lang, d.country, d.ref,
           p.name AS partner_name, p.email AS partner_email
         FROM leads d LEFT JOIN links l ON l.slug = d.ref LEFT JOIN partners p ON p.id = l.partner_id
         ORDER BY d.id DESC LIMIT 500`,
      )
      .all(),
    db
      .prepare(
        `SELECT p.id, p.name, p.email, p.created_at, par.name AS invited_by,
           (SELECT COUNT(*) FROM links l WHERE l.partner_id = p.id) AS links,
           (SELECT COUNT(*) FROM clicks c JOIN links l ON l.id = c.link_id WHERE l.partner_id = p.id) AS clicks,
           (SELECT COUNT(*) FROM leads d JOIN links l ON l.slug = d.ref WHERE l.partner_id = p.id) AS leads,
           (SELECT COUNT(*) FROM partners t WHERE t.parent_id = p.id) AS team
         FROM partners p LEFT JOIN partners par ON par.id = p.parent_id
         ORDER BY p.id DESC LIMIT 500`,
      )
      .all(),
  ]);
  return json(200, { ok: true, leads: leads.results, partners: partners.results });
}
