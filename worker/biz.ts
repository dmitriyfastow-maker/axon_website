// Owner app (Decision 29): the client's own business inside Vaxo.
// Public: GET /w.js?k=<key> — one line of code for any site; POST /api/w — visits, clicks and form requests from it.
// Cabinet (/api/biz/…, signed-in client from /me/): businesses I own or work in, analytics, leads, team, AI assistant.
// Roles: owner — everything; manager — analytics + leads (assigned to them or unassigned); viewer — analytics only.
import type { DB } from './partner.js';
import type { Notify } from './deals.js';
import type { AiBinding } from './chat.js';
import { askAi } from './autopilot.js';
import { sessionClient } from './cabinet.js';

const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' };
const hex = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, '0')).join('');
const cut = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i;
const host = (d: string) => d.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/[/:?#].*$/, '');
// Until migration 0033 is on the live DB the tables are missing: the cabinet shows "switching on soon".
const soon = () => json(503, { ok: false, error: 'soon' });

/** The snippet: pageviews (also on SPA navigation), clicks on calls/messengers/buttons, and form submissions as leads. */
export function snippet(key: string, origin: string) {
  return `(function(){if(window.__vx)return;window.__vx=1;var K=${JSON.stringify(key)},U=${JSON.stringify(origin + '/api/w')};
var s;try{s=sessionStorage.getItem('vx_s');if(!s){s=Math.random().toString(36).slice(2,12);sessionStorage.setItem('vx_s',s)}}catch(e){s='x'}
var q=new URLSearchParams(location.search),src=q.get('utm_source')||(document.referrer&&document.referrer.indexOf(location.host)<0?new URL(document.referrer).hostname:'')||'direct';
try{if(q.get('utm_source'))sessionStorage.setItem('vx_src',src);else src=sessionStorage.getItem('vx_src')||src;sessionStorage.setItem('vx_src',src)}catch(e){}
function send(d){d.k=K;d.s=s;d.p=location.pathname;d.u=src;var b=JSON.stringify(d);if(navigator.sendBeacon&&navigator.sendBeacon(U,new Blob([b],{type:'text/plain'})))return;fetch(U,{method:'POST',body:b,keepalive:true,headers:{'Content-Type':'text/plain'}}).catch(function(){})}
var last='';function pv(){if(last===location.pathname)return;last=location.pathname;send({t:'pv'})}pv();
var ps=history.pushState;history.pushState=function(){ps.apply(this,arguments);setTimeout(pv,0)};addEventListener('popstate',pv);
document.addEventListener('click',function(e){var a=e.target.closest&&e.target.closest('a,button');if(!a)return;var h=a.getAttribute('href')||'';
var l=/^tel:/.test(h)?'call':/^mailto:/.test(h)?'email':/wa\\.me|whatsapp/.test(h)?'whatsapp':/t\\.me\\//.test(h)?'telegram':/instagram\\.com/.test(h)?'instagram':(a.tagName==='BUTTON'||/btn|button|cta/i.test(a.className))?('button: '+(a.textContent||'').trim().slice(0,40)):'';if(l)send({t:'click',l:l})},true);
document.addEventListener('submit',function(e){var f=e.target,d={},m=[];if(!f||!f.elements)return;for(var i=0;i<f.elements.length;i++){var el=f.elements[i],n=((el.name||el.id||el.type||'')+'').toLowerCase(),v=(el.value||'').trim();
if(!v||/pass|card|cvv|cvc|iban|ssn|token|captcha|csrf/.test(n)||el.type==='hidden'||el.type==='password'||el.type==='checkbox'||el.type==='radio'||el.type==='submit')continue;
if(!d.name&&/name|имя|ім/.test(n))d.name=v;else if(!d.contact&&(el.type==='email'||el.type==='tel'||/mail|phone|tel|contact/.test(n)))d.contact=v;else m.push(v)}
if(!d.contact&&!m.length)return;d.t='lead';d.m=m.join('\\n').slice(0,2000);send(d)},true);})();`;
}

/** Public collector. Text/plain body keeps it a "simple" CORS request (no preflight). */
export async function handleCollect(db: DB, request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
  if (request.method !== 'POST') return json(405, { ok: false }, CORS);
  const ua = request.headers.get('User-Agent') || '';
  if (/bot|crawl|spider|preview|headless/i.test(ua)) return json(200, { ok: true }, CORS);
  const b = (await request.text().then((t) => JSON.parse(t.slice(0, 8000))).catch(() => ({}))) as Record<string, unknown>;
  const key = cut(b.k, 40);
  if (!/^[a-f0-9]{24}$/.test(key)) return json(400, { ok: false }, CORS);
  const biz = await db.prepare('SELECT id, domain FROM biz WHERE key = ?').bind(key).first<{ id: number; domain: string | null }>().catch(() => null);
  if (!biz) return json(404, { ok: false }, CORS);
  // Only the owner's own site may report (when a domain is set). Local previews are allowed for testing.
  const from = host(request.headers.get('Origin') || request.headers.get('Referer') || '');
  if (biz.domain && from && from !== biz.domain && !from.endsWith('.' + biz.domain) && !/^(localhost|127\.0\.0\.1)$/.test(from)) return json(403, { ok: false }, CORS);
  const t = cut(b.t, 8), sid = cut(b.s, 16), path = cut(b.p, 200), source = cut(b.u, 80);
  if (t === 'pv' || t === 'click') {
    await db.prepare('INSERT INTO biz_events (biz_id, type, sid, path, source, label) VALUES (?, ?, ?, ?, ?, ?)').bind(biz.id, t, sid, path, source, cut(b.l, 60) || null).run();
  } else if (t === 'lead') {
    const contact = cut(b.contact, 120), message = cut(b.m, 2000);
    if (!contact && !message) return json(400, { ok: false }, CORS);
    // One form, one row: the same visit sending the same text twice in a minute is a double click.
    const dup = await db.prepare("SELECT id FROM biz_leads WHERE biz_id = ? AND contact IS ? AND message IS ? AND at > datetime('now', '-1 minute')").bind(biz.id, contact || null, message || null).first();
    if (!dup) await db.prepare('INSERT INTO biz_leads (biz_id, name, contact, message, source, path) VALUES (?, ?, ?, ?, ?, ?)').bind(biz.id, cut(b.name, 80) || null, contact || null, message || null, source, path).run();
  }
  return json(200, { ok: true }, CORS);
}

type Role = 'owner' | 'manager' | 'viewer';
type Access = { id: number; name: string; role: Role; domain: string | null; key: string; about: string | null };

async function access(db: DB, me: { id: number; email: string | null; email_verified_at: string | null }, bizId: number): Promise<Access | null> {
  const b = await db.prepare('SELECT id, name, owner_id, domain, key, about FROM biz WHERE id = ?').bind(bizId).first<Access & { owner_id: number }>();
  if (!b) return null;
  if (b.owner_id === me.id) return { ...b, role: 'owner' };
  // Team members are matched by a confirmed email only, so nobody can claim a seat by typing someone's address.
  if (!me.email || !me.email_verified_at) return null;
  const m = await db.prepare('SELECT role FROM biz_members WHERE biz_id = ? AND email = ?').bind(bizId, me.email.toLowerCase()).first<{ role: Role }>();
  return m ? { ...b, role: m.role } : null;
}

async function stats(db: DB, id: number, days: number) {
  const since = `-${days} days`;
  const one = <T>(sql: string) => db.prepare(sql).bind(id, since).first<T>();
  const all = (sql: string) => db.prepare(sql).bind(id, since).all().then((r) => r.results);
  const tot = await one<{ visits: number; views: number }>("SELECT COUNT(DISTINCT sid) AS visits, COUNT(*) AS views FROM biz_events WHERE biz_id = ? AND type = 'pv' AND at > datetime('now', ?)");
  const leads = await one<{ n: number }>("SELECT COUNT(*) AS n FROM biz_leads WHERE biz_id = ? AND at > datetime('now', ?)");
  const clicks = await one<{ n: number }>("SELECT COUNT(*) AS n FROM biz_events WHERE biz_id = ? AND type = 'click' AND at > datetime('now', ?)");
  return {
    days,
    visits: tot?.visits ?? 0, views: tot?.views ?? 0, leads: leads?.n ?? 0, clicks: clicks?.n ?? 0,
    byDay: await all("SELECT date(at) AS d, COUNT(DISTINCT sid) AS visits, 0 AS leads FROM biz_events WHERE biz_id = ? AND type = 'pv' AND at > datetime('now', ?) GROUP BY d ORDER BY d"),
    leadsByDay: await all("SELECT date(at) AS d, COUNT(*) AS n FROM biz_leads WHERE biz_id = ? AND at > datetime('now', ?) GROUP BY d"),
    sources: await all("SELECT source AS k, COUNT(DISTINCT sid) AS n FROM biz_events WHERE biz_id = ? AND type = 'pv' AND at > datetime('now', ?) GROUP BY source ORDER BY n DESC LIMIT 8"),
    pages: await all("SELECT path AS k, COUNT(*) AS n FROM biz_events WHERE biz_id = ? AND type = 'pv' AND at > datetime('now', ?) GROUP BY path ORDER BY n DESC LIMIT 8"),
    actions: await all("SELECT label AS k, COUNT(*) AS n FROM biz_events WHERE biz_id = ? AND type = 'click' AND at > datetime('now', ?) GROUP BY label ORDER BY n DESC LIMIT 8"),
    leadSources: await all("SELECT source AS k, COUNT(*) AS n FROM biz_leads WHERE biz_id = ? AND at > datetime('now', ?) GROUP BY source ORDER BY n DESC LIMIT 8"),
  };
}

export async function handleBiz(db: DB, request: Request, path: string, ai: AiBinding | undefined, notify: Notify, origin: string): Promise<Response> {
  const me = await sessionClient(db, request);
  if (!me) return json(401, { ok: false });
  const m = request.method;
  const b = m === 'POST' || m === 'DELETE' ? ((await request.json().catch(() => ({}))) as Record<string, unknown>) : {};
  try {
    if (path === '' && m === 'GET') {
      const own = (await db.prepare("SELECT id, name, domain, 'owner' AS role FROM biz WHERE owner_id = ? ORDER BY id").bind(me.id).all()).results;
      const team = me.email && me.email_verified_at
        ? (await db.prepare('SELECT b.id, b.name, b.domain, m.role FROM biz_members m JOIN biz b ON b.id = m.biz_id WHERE m.email = ? ORDER BY b.id').bind(me.email.toLowerCase()).all()).results
        : [];
      return json(200, { ok: true, list: [...own, ...team] });
    }
    if (path === '' && m === 'POST') {
      const name = cut(b.name, 80), domain = host(cut(b.domain, 120));
      if (!name) return json(400, { ok: false, error: 'name' });
      const n = await db.prepare('SELECT COUNT(*) AS n FROM biz WHERE owner_id = ?').bind(me.id).first<{ n: number }>();
      if ((n?.n ?? 0) >= 10) return json(400, { ok: false, error: 'limit' });
      const key = hex(12);
      await db.prepare('INSERT INTO biz (owner_id, name, domain, key) VALUES (?, ?, ?, ?)').bind(me.id, name, domain || null, key).run();
      await notify(`🏢 Новый бизнес в пульте: ${name}${domain ? ` (${domain})` : ''} — клиент ${me.email || me.id}`);
      return json(200, { ok: true });
    }
    const mm = path.match(/^(\d+)(?:\/(.+))?$/);
    if (!mm) return json(404, { ok: false });
    const a = await access(db, me, Number(mm[1]));
    if (!a) return json(404, { ok: false });
    const sub = mm[2] || '';
    const owner = a.role === 'owner', canLeads = a.role !== 'viewer';

    if (sub === '' && m === 'GET') {
      const url = new URL(request.url);
      const days = [1, 7, 30, 90].includes(Number(url.searchParams.get('days'))) ? Number(url.searchParams.get('days')) : 7;
      const leads = canLeads
        ? (await db.prepare(`SELECT id, at, name, contact, message, source, path, status, assignee, note FROM biz_leads WHERE biz_id = ? ${a.role === 'manager' ? 'AND (assignee IS NULL OR assignee = ?)' : 'AND ? IS NOT NULL'} ORDER BY id DESC LIMIT 200`).bind(a.id, (me.email || '').toLowerCase()).all()).results
        : [];
      const team = owner ? (await db.prepare('SELECT email, role, at FROM biz_members WHERE biz_id = ? ORDER BY at').bind(a.id).all()).results : [];
      return json(200, {
        ok: true,
        biz: { id: a.id, name: a.name, domain: a.domain, role: a.role, about: owner ? a.about : null, code: owner ? `<script src="${origin}/w.js?k=${a.key}" async></script>` : null },
        stats: await stats(db, a.id, days), leads, team,
      });
    }
    if (sub === 'settings' && m === 'POST' && owner) {
      await db.prepare('UPDATE biz SET name = COALESCE(NULLIF(?, \'\'), name), domain = ?, about = ? WHERE id = ?').bind(cut(b.name, 80), host(cut(b.domain, 120)) || null, cut(b.about, 4000) || null, a.id).run();
      return json(200, { ok: true });
    }
    const lm = sub.match(/^leads\/(\d+)$/);
    if (lm && m === 'POST' && canLeads) {
      const status = cut(b.status, 8);
      if (status && !['new', 'work', 'won', 'lost'].includes(status)) return json(400, { ok: false });
      const assignee = owner && typeof b.assignee === 'string' ? cut(b.assignee, 190).toLowerCase() : null;
      const scope = a.role === 'manager' ? ' AND (assignee IS NULL OR assignee = ?)' : ' AND ? IS NOT NULL';
      await db.prepare(`UPDATE biz_leads SET status = COALESCE(NULLIF(?, ''), status), note = COALESCE(?, note), assignee = CASE WHEN ? IS NULL THEN assignee ELSE NULLIF(?, '') END WHERE id = ? AND biz_id = ?${scope}`)
        .bind(status, typeof b.note === 'string' ? cut(b.note, 1000) : null, assignee, assignee ?? '', Number(lm[1]), a.id, (me.email || '').toLowerCase()).run();
      return json(200, { ok: true });
    }
    if (sub === 'leads' && m === 'POST' && canLeads) {
      // A lead taken by phone or in person, typed in by hand.
      const contact = cut(b.contact, 120), name = cut(b.name, 80);
      if (!contact && !name) return json(400, { ok: false });
      await db.prepare("INSERT INTO biz_leads (biz_id, name, contact, message, source) VALUES (?, ?, ?, ?, 'manual')").bind(a.id, name || null, contact || null, cut(b.message, 2000) || null).run();
      return json(200, { ok: true });
    }
    if (sub === 'team' && m === 'POST' && owner) {
      const email = cut(b.email, 190).toLowerCase(), role = cut(b.role, 8);
      if (!EMAIL.test(email) || !['manager', 'viewer'].includes(role)) return json(400, { ok: false });
      const n = await db.prepare('SELECT COUNT(*) AS n FROM biz_members WHERE biz_id = ?').bind(a.id).first<{ n: number }>();
      if ((n?.n ?? 0) >= 50) return json(400, { ok: false, error: 'limit' });
      await db.prepare('INSERT INTO biz_members (biz_id, email, role) VALUES (?, ?, ?) ON CONFLICT (biz_id, email) DO UPDATE SET role = excluded.role').bind(a.id, email, role).run();
      return json(200, { ok: true });
    }
    if (sub === 'team' && m === 'DELETE' && owner) {
      await db.prepare('DELETE FROM biz_members WHERE biz_id = ? AND email = ?').bind(a.id, cut(b.email, 190).toLowerCase()).run();
      return json(200, { ok: true });
    }
    if (sub === 'ask' && m === 'POST') {
      const q = cut(b.q, 500);
      if (!q) return json(400, { ok: false });
      const s = await stats(db, a.id, 30);
      const recent = canLeads ? (await db.prepare('SELECT at, source, status, substr(message, 1, 140) AS m FROM biz_leads WHERE biz_id = ? ORDER BY id DESC LIMIT 15').bind(a.id).all()).results : [];
      const lang = cut(b.lang, 2);
      const prompt = `You are the personal AI assistant of a small business owner inside Vaxo (the platform that runs their website, leads and marketing).
Business: ${a.name}${a.domain ? ` (${a.domain})` : ''}. About the business: ${(a.about || 'not filled in yet').slice(0, 1500)}
Their website numbers for the last 30 days (JSON): ${JSON.stringify(s)}
Recent requests (no personal data): ${JSON.stringify(recent)}
The person asking is the ${a.role}. Question: ${q}
Answer in ${lang === 'ru' ? 'Russian' : lang === 'ua' ? 'Ukrainian' : 'English'}, 2–6 short sentences: concrete, what to do next and why, based only on these numbers. Never invent numbers. If there is too little data, say what to do to get it (share the site link, ask Vaxo to set up ads or posts). If they need something built or changed, tell them Vax in the project chat will do it.`;
      return json(200, { ok: true, text: (await askAi(ai, prompt, 400)) || '…' });
    }
    return json(404, { ok: false });
  } catch (e) {
    if (/no such table/i.test(String(e))) return soon();
    throw e;
  }
}
