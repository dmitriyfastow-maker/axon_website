// Owner-only API: leads (with the lead exchange), partners and closers. Protected by the ADMIN_TOKEN secret.
import type { DB } from './partner.js';
import { ownerLead, ownerOverview, ownerUpdateLead, ownerUpdatePartner, type Notify } from './deals.js';
import { staffMessage } from './rooms.js';
import { aiReply, decideOffer, setAiState } from './aimanager.js';
import { handleFinanceAdmin } from './finance.js';
import { handleInvoiceAdmin, invoiceForPayment } from './invoices.js';
import { handleOwnerChat } from './ownerchat.js';
import { newRoom } from './rooms.js';
import { addRenewal, allPayouts, setPayout } from './payouts.js';
import HQ from './hq.json';
import { analytics, makeDigest } from './autopilot.js';
import { termsNotice } from './notices.js';
import { handlePlan } from './plan.js';
import { OWNER_KEY, ROLES, SECTION_NAMES, handleStaffAdmin, sectionOf, staffFromToken, type Me } from './staff.js';
import { settings } from './autopilot.js';
import type { AiBinding } from './chat.js';
import { assistAnswer, tipsFor } from './assist.js';

/** An invoice was paid (by hand in the HQ, or by card through the mono webhook): record it through Finance (taxes,
 * cashback) and let Vax thank the client. Returns 400 when the invoice is not open (already paid or cancelled). */
export async function settleInvoice(db: DB, ai: AiBinding | undefined, notify: Notify, id: number, method: 'bank' | 'card', base: string): Promise<Response> {
  const inv = await invoiceForPayment(db, id);
  if (!inv) return json(400, { ok: false });
  const fake = new Request(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: inv.amount, currency: inv.currency, lead_id: inv.lead_id, part: inv.part, method, note: `Invoice ${inv.number}${method === 'card' ? ' (card, mono)' : ''}` }) });
  const got = { id: 0 };
  const res = await handleFinanceAdmin(db, fake, 'payment', notify, (lid) => { got.id = lid; });
  if (got.id) await aiReply(db, ai, got.id, notify, { nudge: PAID_NUDGE }).catch(() => false);
  return res;
}
const PAID_NUDGE = 'The team has just RECEIVED the client\'s payment. Thank them warmly in one or two sentences, say the payment arrived and what happens next (work starts / continues, next preview or step). No amounts unless they ask.';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

function authorized(request: Request, token: string | undefined): boolean {
  const got = (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token || token.length < 32 || got.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < token.length; i++) diff |= token.charCodeAt(i) ^ got.charCodeAt(i);
  return diff === 0;
}

/** The owner's key, or a team member's session (worker/staff.ts). */
async function whoIs(db: DB, request: Request, token: string | undefined): Promise<Me | null> {
  if (authorized(request, token)) return OWNER_KEY;
  return staffFromToken(db, (request.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, ''));
}

/** "All processes" for the overview: one number set per process, each with a status light. */
async function pulse(db: DB) {
  const one = async <T>(sql: string) => ((await db.prepare(sql).first<T>()) ?? ({} as T));
  const leads = await one<Record<string, number>>(`SELECT
    SUM(status = 'new') AS fresh, SUM(status IN ('open','claimed','contacted','meeting')) AS talking, SUM(status = 'proposal') AS proposal,
    SUM(status = 'won') AS won, SUM(created_at > datetime('now','-7 days')) AS week,
    SUM(status = 'won' AND COALESCE(stage,'') NOT IN ('', 'delivered')) AS in_work,
    SUM(status = 'won' AND stage_due IS NOT NULL AND stage_due < datetime('now') AND COALESCE(stage,'') != 'delivered') AS late,
    ROUND(AVG(CASE WHEN status = 'won' AND COALESCE(stage,'') NOT IN ('', 'delivered') THEN progress END)) AS progress,
    SUM(human IS NOT NULL AND status NOT IN ('lost','archived')) AS human
    FROM leads WHERE COALESCE(page,'') != 'test' AND contact NOT LIKE 'test%'`);
  const money = await one<Record<string, number>>(`SELECT
    (SELECT COALESCE(SUM(amount_uah),0) FROM payments WHERE status='ok' AND at >= date('now','start of month')) AS month_uah,
    (SELECT COALESCE(SUM(amount_uah),0) FROM payments WHERE status='ok' AND at >= date('now','start of year')) AS year_uah,
    (SELECT COUNT(*) FROM invoices WHERE status='open') AS open_inv,
    (SELECT COUNT(*) FROM payouts WHERE status='due') AS payouts_due`);
  const partners = await one<Record<string, number>>(`SELECT COUNT(*) AS total, SUM(closer='approved') AS closers, SUM(closer='applied') AS applied FROM partners`);
  const site = await one<Record<string, number>>(`SELECT
    (SELECT COUNT(*) FROM pageviews WHERE at > datetime('now','-7 days')) AS views7,
    (SELECT COUNT(*) FROM events WHERE kind = 'chat_open' AND at > datetime('now','-7 days')) AS chats7`).catch(() => ({} as Record<string, number>));
  const work = await one<Record<string, number>>(`SELECT SUM(status='waiting') AS waiting, SUM(at > datetime('now','-1 day')) AS today,
    SUM(kind='video' AND status='waiting') AS videos_waiting, SUM(kind='video' AND status IN ('sent','done')) AS videos_out FROM claude_work`);
  const claude = await one<Record<string, number>>(`SELECT SUM(sender='owner' AND kind='task' AND status='open') AS tasks, SUM(sender='claude' AND kind IN ('question','idea') AND status='open') AS questions,
    (SELECT MAX(at) FROM owner_chat WHERE sender='claude') AS last_at FROM owner_chat`);
  const st = await settings(db);
  const toggles = ['auto_publish', 'auto_approve', 'auto_qc', 'ai_manager', 'digest', 'vax_learn', 'email_replies'];
  const auto = { on: toggles.filter((k) => st[k] !== '0').length, total: toggles.length, price_owner: st.price_owner !== '0' };
  return { leads, money, partners, site, work, claude, auto };
}

/** /api/admin, /api/admin/lead/<id>, /api/admin/partner/<id> */
export async function handleAdminApi(db: DB, request: Request, token: string | undefined, path: string, notify: Notify, ai?: AiBinding, card = false): Promise<Response> {
  const me = await whoIs(db, request, token);
  if (!me) return json(401, { ok: false });
  const sec = sectionOf(path);
  if (!me.sections.includes(sec)) return json(403, { ok: false, error: 'section' });
  if (request.method !== 'GET' && !me.write && sec !== 'today') return json(403, { ok: false, error: 'read_only' });
  if (path === 'me') return json(200, { ok: true, me: { name: me.name, email: me.email, role: me.role, role_name: ROLES[me.role]?.name, sections: me.sections, write: me.write }, names: SECTION_NAMES });
  if (path === 'plan') return handlePlan(db, request);
  if (path === 'pulse') return json(200, { ok: true, ...(await pulse(db)) });
  if (path === 'assist') {
    const p = (await pulse(db)) as Record<string, Record<string, any>>;
    const b = request.method === 'POST' ? ((await request.json().catch(() => ({}))) as Record<string, unknown>) : {};
    const q = typeof b.q === 'string' ? b.q.trim() : '';
    return json(200, { ok: true, tips: tipsFor(p, me), text: q ? await assistAnswer(ai, p, me, q) : '' });
  }
  if (path === 'staff' || path.startsWith('staff/')) return handleStaffAdmin(db, request, path.slice('staff'.length).replace(/^\//, ''), me, new URL(request.url).origin);
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
  // 📋 Claude's work log: everything done, with previews; the owner can leave a note or a decision on any item.
  if (path === 'work' && request.method === 'GET') {
    const { results } = await db.prepare('SELECT * FROM claude_work ORDER BY id DESC LIMIT 400').all();
    return json(200, { ok: true, items: results });
  }
  // 📨 Рассылки: everything that goes (or went) out — Claude's drafts waiting for a yes, approved and sent ones,
  // what Vax wrote to clients by itself, and Claude's questions to the owner.
  if (path === 'outbox' && request.method === 'GET') {
    const work = (await db.prepare(`SELECT id, at, kind, title, body, link, file, status, note FROM claude_work WHERE status IN ('waiting','approved','sent') ORDER BY id DESC LIMIT 600`).all()).results;
    const auto = (await db.prepare(`SELECT m.id, m.at, m.sender, m.text, l.id AS lead_id, COALESCE(l.name, l.contact) AS name FROM messages m JOIN leads l ON l.id = m.lead_id
      WHERE m.sender != 'client' AND m.kind = 'text' AND m.at > datetime('now','-60 days') AND COALESCE(l.page,'') != 'test' ORDER BY m.id DESC LIMIT 200`).all()).results;
    const asks = (await db.prepare(`SELECT id, at, kind, text, status FROM owner_chat WHERE sender = 'claude' AND at > datetime('now','-30 days') ORDER BY id DESC LIMIT 100`).all()).results;
    return json(200, { ok: true, work, auto, asks });
  }
  // One or many decisions at once: "yes" (approved → Claude sends it and marks it sent), "no", or back to waiting.
  if (path === 'work/bulk' && request.method === 'POST') {
    const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const ids = (Array.isArray(b.ids) ? b.ids : []).map(Number).filter((n) => n > 0).slice(0, 500);
    const status = ['approved', 'rejected', 'waiting', 'done'].includes(String(b.status)) ? String(b.status) : null;
    if (!ids.length || !status) return json(400, { ok: false });
    await db.prepare(`UPDATE claude_work SET status = ? WHERE id IN (${ids.map(() => '?').join(',')})`).bind(status, ...ids).run();
    if (status === 'approved' || status === 'rejected') {
      const verb = status === 'approved' ? 'ДА, можно отправлять/публиковать' : 'НЕТ, не отправлять';
      await db.prepare(`INSERT INTO owner_chat (sender, kind, text) VALUES ('owner', 'task', ?)`).bind(`Рассылки: ${verb} — работы #${ids.join(', #')}`.slice(0, 1900)).run();
    }
    return json(200, { ok: true, n: ids.length });
  }
  const wk = path.match(/^work\/(\d+)$/);
  if (wk && request.method === 'POST') {
    const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const note = typeof b.note === 'string' ? b.note.trim().slice(0, 1000) : null;
    const status = ['ready', 'waiting', 'approved', 'sent', 'rejected', 'done'].includes(String(b.status)) ? String(b.status) : null;
    await db.prepare('UPDATE claude_work SET note = COALESCE(?, note), status = COALESCE(?, status) WHERE id = ?').bind(note, status, Number(wk[1])).run();
    if (note) await db.prepare(`INSERT INTO owner_chat (sender, kind, text) VALUES ('owner', 'task', ?)`).bind(`Комментарий к работе #${wk[1]}: ${note}`).run();
    return json(200, { ok: true });
  }
  if (path === 'claude' || path.startsWith('claude/')) return handleOwnerChat(db, ai, request, path.slice('claude'.length).replace(/^\//, ''), notify);
  // 🧾 Invoices: create/list/cancel; "paid" records the payment through Finance (taxes, cashback, Vax thanks the client).
  const ip = path.match(/^invoice\/(\d+)\/paid$/);
  if (ip && request.method === 'POST') return settleInvoice(db, ai, notify, Number(ip[1]), 'bank', request.url);
  if (path === 'invoice' || path.startsWith('invoice/')) return handleInvoiceAdmin(db, request, path.slice('invoice'.length).replace(/^\//, ''), new URL(request.url).origin, card);
  if (path === 'finance' || path.startsWith('finance/')) {
    const got = { id: 0 };
    const res = await handleFinanceAdmin(db, request, path.slice('finance'.length).replace(/^\//, ''), notify, (id) => { got.id = id; });
    if (got.id) await aiReply(db, ai, got.id, notify, { nudge: 'The team has just RECEIVED the client\'s payment. Thank them warmly in one or two sentences, say the payment arrived and what happens next (work starts / continues, next preview or step). No amounts unless they ask.' }).catch(() => false);
    return res;
  }
  if (path === 'terms-notice' && request.method === 'POST') return json(200, await termsNotice(db, (await request.json().catch(() => ({}))) as Record<string, unknown>));
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
