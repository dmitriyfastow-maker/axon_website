// Own domains for client sites (Decision 42). The client points a CNAME at domains.vaxogroup.com; Cloudflare for SaaS
// registers the name as a custom hostname of our zone, issues the SSL certificate itself, and the request reaches this
// worker, which shows that client's /s/ page. Comes with Care and above, like the CRM. Needs the secret CF_SAAS_TOKEN
// (SSL and Certificates: Edit on the vaxogroup.com zone); without it the cabinet says the feature is coming.
import { moduleAccess, servePage } from './modules.js';
import { sendMail } from './mail.js';
import type { Notify } from './deals.js';
import type { DB } from './partner.js';

export const TARGET = 'domains.vaxogroup.com';
const ZONE = 'e451eef7e10ed566dff9ab41cfad817b'; // vaxogroup.com
// Second-level public suffixes people here actually buy under, so the DNS "name" field is shown right.
const SLD = new Set(['co.uk', 'org.uk', 'com.ua', 'org.ua', 'net.ua', 'in.ua', 'kiev.ua', 'kyiv.ua', 'od.ua', 'lviv.ua', 'com.pl', 'com.au', 'co.il', 'com.br', 'com.tr', 'co.nz', 'co.za', 'com.mx', 'co.jp']);

export type Cf = { token?: string };
export type DomainState = { host: string; status: 'pending' | 'active' | 'error'; error: string | null; record: { type: 'CNAME'; name: string; value: string }; apex: boolean };

/** A typed-in address → a bare host name, or '' when it is not a domain we can connect. */
export function cleanHost(input: unknown): string {
  let s = typeof input === 'string' ? input.trim().toLowerCase() : '';
  if (!s || s.length > 260) return '';
  s = s.replace(/^[a-z]+:\/\//, '').split(/[/?#]/)[0].replace(/:\d+$/, '').replace(/\.$/, '');
  try { s = new URL(`http://${s}`).hostname; } catch { return ''; } // IDN → punycode
  if (s.length > 253 || !s.includes('.') || /^\d+(\.\d+){3}$/.test(s)) return '';
  const labels = s.split('.');
  if (!labels.every((l) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(l))) return '';
  if (!/^(?:[a-z]{2,63}|xn--[a-z0-9-]{2,59})$/.test(labels[labels.length - 1])) return '';
  if (s === 'vaxogroup.com' || s.endsWith('.vaxogroup.com') || s.endsWith('.workers.dev')) return '';
  return s;
}

/** What to type at the registrar: "www" for www.myshop.com, "@" for myshop.com itself. */
export function recordFor(host: string): { name: string; apex: boolean } {
  const l = host.split('.');
  const base = SLD.has(l.slice(-2).join('.')) ? 3 : 2;
  const name = l.slice(0, Math.max(0, l.length - base)).join('.');
  return { name: name || '@', apex: !name };
}

async function api(cf: Cf, path: string, init: RequestInit = {}) {
  const r = await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE}${path}`, { ...init, headers: { Authorization: `Bearer ${cf.token}`, 'Content-Type': 'application/json' } });
  return (await r.json().catch(() => ({}))) as { success?: boolean; result?: any; errors?: { code: number; message: string }[] };
}

function state(row: { host: string; status: string; error: string | null }): DomainState {
  const { name, apex } = recordFor(row.host);
  return { host: row.host, status: row.status as DomainState['status'], error: row.error, record: { type: 'CNAME', name, value: TARGET }, apex };
}

/** Ask Cloudflare how the name is doing and remember it. */
async function refresh(db: DB, cf: Cf, row: { id: number; host: string; cf_id: string | null; status: string; error: string | null }) {
  if (!row.cf_id || !cf.token) return row;
  const d = await api(cf, `/custom_hostnames/${row.cf_id}`);
  if (!d.success) return row;
  const h = d.result || {};
  const on = h.status === 'active' && h.ssl?.status === 'active';
  const errs = [...(h.verification_errors || []), ...(h.ssl?.validation_errors || []).map((e: { message?: string }) => e.message)].filter(Boolean);
  const status = on ? 'active' : 'pending';
  const error = on ? null : errs.length ? String(errs[0]).slice(0, 300) : null;
  await db.prepare(`UPDATE biz_domains SET status = ?, error = ?, checked_at = datetime('now') WHERE id = ?`).bind(status, error, row.id).run();
  return { ...row, status, error };
}

async function bizOf(db: DB, clientId: number) {
  return db.prepare('SELECT b.id FROM biz b JOIN biz_pages p ON p.biz_id = b.id WHERE b.owner_id = ? ORDER BY b.id LIMIT 1').bind(clientId).first<{ id: number }>();
}

/** GET/POST /api/ws/domain[/delete] for the signed-in client. */
export async function handleDomain(db: DB, cf: Cf, clientId: number, method: string, sub: string, b: Record<string, unknown>, notify: Notify) {
  const ready = !!cf.token;
  const biz = await bizOf(db, clientId);
  const row = biz ? await db.prepare('SELECT id, host, cf_id, status, error FROM biz_domains WHERE biz_id = ?').bind(biz.id).first<{ id: number; host: string; cf_id: string | null; status: string; error: string | null }>() : null;
  if (method === 'GET') {
    const cur = row && row.status !== 'active' ? await refresh(db, cf, row) : row;
    return { status: 200, body: { ok: true, ready, site: !!biz, domain: cur ? state(cur) : null } };
  }
  if (!biz) return { status: 400, body: { ok: false, error: 'site' } };
  if (sub === 'delete') {
    if (row?.cf_id && ready) await api(cf, `/custom_hostnames/${row.cf_id}`, { method: 'DELETE' });
    if (row) await db.prepare('DELETE FROM biz_domains WHERE id = ?').bind(row.id).run();
    return { status: 200, body: { ok: true, ready, site: true, domain: null } };
  }
  if (!(await moduleAccess(db, clientId))) return { status: 402, body: { ok: false, error: 'plan' } };
  if (!ready) return { status: 503, body: { ok: false, error: 'soon' } };
  const host = cleanHost(b.host);
  if (!host) return { status: 400, body: { ok: false, error: 'bad' } };
  if (row?.host === host) return { status: 200, body: { ok: true, ready, site: true, domain: state(await refresh(db, cf, row)) } };
  if (await db.prepare('SELECT 1 FROM biz_domains WHERE host = ? AND biz_id != ?').bind(host, biz.id).first()) return { status: 409, body: { ok: false, error: 'taken' } };
  // The fallback origin is where every custom name lands; set it once.
  const fb = await api(cf, '/custom_hostnames/fallback_origin');
  if (fb.result?.origin !== TARGET) await api(cf, '/custom_hostnames/fallback_origin', { method: 'PUT', body: JSON.stringify({ origin: TARGET }) });
  const made = await api(cf, '/custom_hostnames', { method: 'POST', body: JSON.stringify({ hostname: host, ssl: { method: 'http', type: 'dv', settings: { min_tls_version: '1.2' } } }) });
  if (!made.success) {
    const dup = (made.errors || []).some((e) => /already exists|duplicate/i.test(e.message));
    return { status: dup ? 409 : 502, body: { ok: false, error: dup ? 'taken' : 'cf', detail: made.errors?.[0]?.message } };
  }
  if (row?.cf_id) await api(cf, `/custom_hostnames/${row.cf_id}`, { method: 'DELETE' });
  await db.prepare('DELETE FROM biz_domains WHERE biz_id = ?').bind(biz.id).run();
  await db.prepare(`INSERT INTO biz_domains (biz_id, host, cf_id, status) VALUES (?, ?, ?, 'pending')`).bind(biz.id, host, made.result?.id ?? null).run();
  await notify(`🌐 Свой домен подключается: ${host} (клиент ${clientId})`);
  const fresh = await db.prepare('SELECT id, host, cf_id, status, error FROM biz_domains WHERE biz_id = ?').bind(biz.id).first<{ id: number; host: string; cf_id: string | null; status: string; error: string | null }>();
  return { status: 200, body: { ok: true, ready, site: true, domain: state(fresh!) } };
}

const DONE: Record<string, [string, string]> = {
  en: ['Your domain is live', 'Your site now opens at https://{host} with SSL.\n\n— Vax, Vaxo'],
  ru: ['Ваш домен заработал', 'Ваш сайт теперь открывается по адресу https://{host}, с защитой SSL.\n\n— Vax, Vaxo'],
  ua: ['Ваш домен запрацював', 'Ваш сайт тепер відкривається за адресою https://{host}, із захистом SSL.\n\n— Vax, Vaxo'],
};

/** Hourly: names still waiting for DNS get checked; the owner gets a letter when one goes live. */
export async function checkDomains(db: DB, cf: Cf, notify: Notify) {
  if (!cf.token) return;
  const rows = (await db.prepare(`SELECT d.id, d.host, d.cf_id, d.status, d.error, c.email, c.lang FROM biz_domains d JOIN biz b ON b.id = d.biz_id JOIN clients c ON c.id = b.owner_id
    WHERE d.status != 'active' AND d.created_at > datetime('now', '-14 days') ORDER BY d.checked_at LIMIT 20`).all<{ id: number; host: string; cf_id: string | null; status: string; error: string | null; email: string | null; lang: string | null }>()).results;
  for (const r of rows) {
    const n = await refresh(db, cf, r);
    if (n.status === 'active') {
      const [subj, text] = DONE[r.lang || 'en'] ?? DONE.en;
      if (r.email) await sendMail(r.email, subj, text.replace('{host}', r.host)).catch(() => false);
      await notify(`✅ Домен заработал: ${r.host}`);
    }
  }
}

const NOT_OURS = new Response(null, { status: 404 });

/** A request on a client's own domain: their page, its manifest and the form script; everything else goes home. */
export async function serveOwnDomain(db: DB, url: URL): Promise<Response | 'pass' | null> {
  const r = await db.prepare(`SELECT d.status, p.slug, b.owner_id FROM biz_domains d JOIN biz_pages p ON p.biz_id = d.biz_id JOIN biz b ON b.id = d.biz_id WHERE d.host = ?`).bind(url.hostname).first<{ status: string; slug: string; owner_id: number }>().catch(() => null);
  if (!r) return null;
  if (!(await moduleAccess(db, r.owner_id))) return Response.redirect(`https://vaxogroup.com/s/${r.slug}`, 302);
  const p = url.pathname;
  if (p === '/' || p === '/index.html') return servePage(db, r.slug, false);
  if (p === '/manifest.webmanifest' || p === `/s/${r.slug}/manifest.webmanifest`) return servePage(db, r.slug, true);
  if (p === '/robots.txt') return new Response('User-agent: *\nAllow: /\n', { headers: { 'Content-Type': 'text/plain' } });
  if (p === '/w.js' || p === '/api/w' || p === '/icon-192.png' || p === '/favicon.ico') return 'pass';
  if (p.startsWith('/s/')) return NOT_OURS.clone();
  return Response.redirect(`${url.origin}/`, 302);
}
