// Lead exchange: agency leads are worked by verified partner-closers.
// Owner publishes a lead → an approved closer claims it → strict SLA per stage → missed SLA returns it to the pool.
// Every action lands in lead_events, so the owner sees the whole history of every client.
import type { DB } from './partner.js';
import type { AiBinding } from './chat.js';
import { roomMessages, staffMessage, unansweredAlerts } from './rooms.js';
import { createPayouts, partnerPayouts } from './payouts.js';

export type Notify = (text: string) => Promise<void>;

/** Hours a closer has to move the lead to the next stage before it returns to the pool. */
const SLA_HOURS: Record<string, number> = { claimed: 24, contacted: 72, meeting: 120, proposal: 240 };
const PARTNER_STATUSES = ['contacted', 'meeting', 'proposal', 'won', 'lost'] as const;
const OWNER_STATUSES = ['new', 'open', 'claimed', 'contacted', 'meeting', 'proposal', 'won', 'lost', 'archived'] as const;
const ACTIVE = "('claimed','contacted','meeting','proposal')";

const due = (status: string) => (SLA_HOURS[status] ? `datetime('now', '+${SLA_HOURS[status]} hours')` : 'NULL');
const s = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export async function logEvent(db: DB, leadId: number, actor: string, kind: string, text: string | null) {
  await db.prepare('INSERT INTO lead_events (lead_id, actor, kind, text) VALUES (?, ?, ?, ?)').bind(leadId, actor, kind, text).run();
}

/** Return overdue leads to the pool; two misses in 30 days pause the closer. Cheap, so it runs on every list request. */
export async function sweep(db: DB, notify: Notify) {
  await unansweredAlerts(db, notify);
  const { results } = await db
    .prepare(`SELECT d.id, d.status, d.closer_id, p.name FROM leads d JOIN partners p ON p.id = d.closer_id
              WHERE d.status IN ${ACTIVE} AND d.due_at IS NOT NULL AND d.due_at < datetime('now')`)
    .all<{ id: number; status: string; closer_id: number; name: string }>();
  for (const l of results) {
    await db.prepare(`UPDATE leads SET status = 'open', closer_id = NULL, claimed_at = NULL, due_at = NULL, updated_at = datetime('now') WHERE id = ?`).bind(l.id).run();
    await logEvent(db, l.id, 'system', 'return', `SLA missed at stage "${l.status}" by ${l.name} [p:${l.closer_id}]`);
    const misses = await db
      .prepare(`SELECT COUNT(*) AS n FROM lead_events WHERE kind = 'return' AND actor = 'system' AND text LIKE ? AND at > datetime('now', '-30 days')`)
      .bind(`%[p:${l.closer_id}]`)
      .first<{ n: number }>();
    if ((misses?.n ?? 0) >= 2) await db.prepare(`UPDATE partners SET closer = 'paused' WHERE id = ?`).bind(l.closer_id).run();
    await notify(`⏰ Lead #${l.id} returned to the pool: ${l.name} missed the deadline (${l.status}).${(misses?.n ?? 0) >= 2 ? ' Closer paused.' : ''}`);
  }
}

/** How many leads a closer may hold at once: earned through results. */
async function limitFor(db: DB, partnerId: number, rating: number | null): Promise<number> {
  const won = await db.prepare(`SELECT COUNT(*) AS n FROM leads WHERE closer_id = ? AND status = 'won'`).bind(partnerId).first<{ n: number }>();
  if ((won?.n ?? 0) >= 3 && (rating ?? 5) >= 4.5) return 5;
  if ((won?.n ?? 0) >= 1 && (rating ?? 5) >= 4) return 3;
  return 2;
}

// ---------- AI client profile ----------

/** Draft a client profile for the closer from the raw request (runs in the background after a lead arrives). */
export async function draftBrief(db: DB, ai: AiBinding | undefined, leadId: number) {
  if (!ai) return;
  const l = await db.prepare('SELECT name, contact, interest, message, lang, country, page FROM leads WHERE id = ?').bind(leadId).first<Record<string, string>>();
  if (!l) return;
  const prompt = `You prepare a sales brief for a Vaxo closer (Vaxo is a full-cycle digital studio: websites, apps, AI, automations, ads, SMM, SEO, design, video).
From the request below write, in English, short labelled lines:
Business: what they do (or "unknown").
Goal: what they want to achieve.
Likely service: which Vaxo services fit.
Budget signal: any hint in the currency the client used (assume USD if no currency), else "unknown — ask".
Pains and objections to expect.
Questions to ask on the first call (3).
Suggested first offer.
Links to check: any website, social or domain mentioned (or derive from an email domain if it is not gmail/outlook/yahoo/icloud).
Never invent facts; mark guesses with "(guess)".

Request: name=${l.name}; contact=${l.contact}; interest=${l.interest}; language=${l.lang}; country=${l.country}; page=${l.page}
Message:
${(l.message || '').slice(0, 1800)}`;
  try {
    const r = (await ai.run('@cf/google/gemma-4-26b-a4b-it', {
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.3,
      chat_template_kwargs: { enable_thinking: false },
    })) as Record<string, any>;
    const text = (typeof r?.response === 'string' ? r.response : r?.choices?.[0]?.message?.content || '').trim();
    if (text) await db.prepare(`UPDATE leads SET brief = COALESCE(brief, ?) WHERE id = ?`).bind(text.slice(0, 4000), leadId).run();
  } catch (err) {
    console.error('[brief]', err);
  }
}

// ---------- partner side ----------

type Me = { id: number; name: string; email: string };
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export async function handleDealsApi(db: DB, request: Request, me: Me, path: string, notify: Notify): Promise<Response> {
  const method = request.method;
  const body = method === 'POST' ? ((await request.json().catch(() => ({}))) as Record<string, unknown>) : {};
  const p = await db.prepare('SELECT closer, closer_app, closer_rating FROM partners WHERE id = ?').bind(me.id).first<{ closer: string; closer_app: string | null; closer_rating: number | null }>();
  const closer = p?.closer ?? 'none';

  if (path === 'deals/apply' && method === 'POST') {
    if (closer === 'approved') return json(400, { ok: false, error: 'already' });
    const app = {
      english: s(body.english, 20), experience: s(body.experience, 1500), profile: s(body.profile, 300),
      pitch: s(body.pitch, 1500), timezone: s(body.timezone, 60), hours: s(body.hours, 60), agreed: body.agreed === true,
    };
    if (!app.english || app.experience.length < 30 || app.pitch.length < 80 || !app.agreed) return json(400, { ok: false, error: 'fields' });
    await db.prepare(`UPDATE partners SET closer = 'applied', closer_app = ? WHERE id = ?`).bind(JSON.stringify(app), me.id).run();
    await notify(`📝 Closer application: ${me.name} (${me.email}), English ${app.english}. Review in /admin/.`);
    return json(200, { ok: true });
  }

  if (path === 'deals' && method === 'GET') {
    await sweep(db, notify);
    const limit = await limitFor(db, me.id, p?.closer_rating ?? null);
    const mine = await db
      .prepare(`SELECT id, created_at, status, name, contact, interest, message, lang, country, page, service, budget, brief, value_usd, claimed_at, due_at, room, ai_summary,
                  (SELECT COUNT(*) FROM messages m WHERE m.lead_id = leads.id AND m.sender = 'client' AND m.at > COALESCE(leads.manager_seen_at, '')) AS unread
                FROM leads WHERE closer_id = ? ORDER BY CASE WHEN status IN ${ACTIVE} THEN 0 ELSE 1 END, id DESC LIMIT 100`)
      .bind(me.id)
      .all<Record<string, unknown>>();
    const ids = mine.results.map((l) => l.id as number);
    const events = ids.length
      ? (await db.prepare(`SELECT lead_id, at, actor, kind, text FROM lead_events WHERE lead_id IN (${ids.map(() => '?').join(',')}) ORDER BY id`).bind(...ids).all()).results
      : [];
    // Open leads are a preview only: no name, contact or raw message until a verified closer claims one.
    const open = closer === 'approved'
      ? (await db.prepare(`SELECT id, created_at, interest, lang, country, service, budget, substr(COALESCE(brief, ''), 1, 280) AS teaser FROM leads WHERE status = 'open' ORDER BY id DESC LIMIT 50`).all()).results
      : [];
    const active = mine.results.filter((l) => ['claimed', 'contacted', 'meeting', 'proposal'].includes(String(l.status))).length;
    const messages = [];
    for (const id of ids.slice(0, 30)) for (const m of await roomMessages(db, id, true)) messages.push({ ...m, lead_id: id });
    return json(200, { ok: true, closer, rating: p?.closer_rating ?? null, limit, active, open, mine: mine.results, events, messages, payouts: await partnerPayouts(db, me.id), sla: SLA_HOURS });
  }

  const msg = path.match(/^deals\/(\d+)\/(msg|seen)$/);
  if (msg && method === 'POST') {
    const id = Number(msg[1]);
    const own = await db.prepare('SELECT id FROM leads WHERE id = ? AND closer_id = ?').bind(id, me.id).first();
    if (!own) return json(404, { ok: false });
    if (msg[2] === 'seen') {
      await db.prepare(`UPDATE leads SET manager_seen_at = datetime('now') WHERE id = ?`).bind(id).run();
      return json(200, { ok: true });
    }
    const ok = await staffMessage(db, id, `partner:${me.id}`, body);
    if (ok === 'guard') {
      await db.prepare('UPDATE partners SET strikes = strikes + 1 WHERE id = ?').bind(me.id).run();
      await logEvent(db, id, `partner:${me.id}`, 'alert', 'Blocked: tried to share outside contacts or payment details');
      await notify(`🚫 Blocked message from ${me.name} (#${id}): tried to move the client off the platform.`);
      return json(400, { ok: false, error: 'guard' });
    }
    return json(ok ? 200 : 400, { ok });
  }

  const m = path.match(/^deals\/(\d+)\/(claim|status|release)$/);
  if (m && method === 'POST') {
    if (closer !== 'approved') return json(403, { ok: false, error: 'not-closer' });
    const id = Number(m[1]);
    const action = m[2];
    if (action === 'claim') {
      const limit = await limitFor(db, me.id, p?.closer_rating ?? null);
      const act = await db.prepare(`SELECT COUNT(*) AS n FROM leads WHERE closer_id = ? AND status IN ${ACTIVE}`).bind(me.id).first<{ n: number }>();
      if ((act?.n ?? 0) >= limit) return json(400, { ok: false, error: 'limit' });
      // The status guard makes the claim atomic: only one closer can win the race.
      const r = (await db
        .prepare(`UPDATE leads SET status = 'claimed', closer_id = ?, claimed_at = datetime('now'), due_at = ${due('claimed')}, updated_at = datetime('now') WHERE id = ? AND status = 'open'`)
        .bind(me.id, id)
        .run()) as { meta?: { changes?: number } };
      if (!r?.meta?.changes) return json(409, { ok: false, error: 'taken' });
      await logEvent(db, id, `partner:${me.id}`, 'claim', `${me.name} took the lead`);
      await notify(`🤝 Lead #${id} claimed by ${me.name}. First contact due within 24 h.`);
      return json(200, { ok: true });
    }
    const lead = await db.prepare('SELECT status FROM leads WHERE id = ? AND closer_id = ?').bind(id, me.id).first<{ status: string }>();
    if (!lead || !['claimed', 'contacted', 'meeting', 'proposal'].includes(lead.status)) return json(404, { ok: false });
    const note = s(body.note, 2000);
    if (action === 'release') {
      await db.prepare(`UPDATE leads SET status = 'open', closer_id = NULL, claimed_at = NULL, due_at = NULL, updated_at = datetime('now') WHERE id = ?`).bind(id).run();
      await logEvent(db, id, `partner:${me.id}`, 'return', note || 'Released by closer');
      await notify(`↩️ Lead #${id} released by ${me.name}: ${note || 'no reason'}`);
      return json(200, { ok: true });
    }
    const to = s(body.status, 20);
    if (!(PARTNER_STATUSES as readonly string[]).includes(to) || note.length < 10) return json(400, { ok: false, error: 'note' });
    const value = to === 'won' ? Math.max(0, Math.round(Number(body.value) || 0)) : null;
    if (to === 'won' && !value) return json(400, { ok: false, error: 'value' });
    await db
      .prepare(`UPDATE leads SET status = ?, due_at = ${due(to)}, value_usd = COALESCE(?, value_usd), updated_at = datetime('now') WHERE id = ?`)
      .bind(to, value, id)
      .run();
    await logEvent(db, id, `partner:${me.id}`, 'status', `${to}: ${note}`);
    if (to === 'won') await createPayouts(db, id);
    await notify(`${to === 'won' ? '🏆' : to === 'lost' ? '❌' : '➡️'} Lead #${id} → ${to}${value ? ` ($${value})` : ''} by ${me.name}: ${note.slice(0, 300)}`);
    return json(200, { ok: true });
  }
  return json(404, { ok: false });
}

// ---------- owner side ----------

export async function ownerOverview(db: DB, notify: Notify) {
  await sweep(db, notify);
  const [leads, partners, stats] = await Promise.all([
    db
      .prepare(
        `SELECT d.id, d.created_at, d.mode, d.status, d.name, d.contact, d.interest, d.message, d.lang, d.country, d.page, d.ref,
           d.service, d.budget, d.brief, d.value_usd, d.closer_id, d.claimed_at, d.due_at, d.updated_at, d.room, d.score, d.ai_summary,
           (SELECT COUNT(*) FROM messages m WHERE m.lead_id = d.id) AS msgs,
           (SELECT m.at FROM messages m WHERE m.lead_id = d.id AND m.kind != 'note' ORDER BY m.id DESC LIMIT 1) AS last_at,
           (SELECT m.sender FROM messages m WHERE m.lead_id = d.id AND m.kind != 'note' ORDER BY m.id DESC LIMIT 1) AS last_sender,
           (SELECT substr(m.text, 1, 120) FROM messages m WHERE m.lead_id = d.id AND m.kind != 'note' ORDER BY m.id DESC LIMIT 1) AS last_text,
           c.name AS closer_name, p.name AS partner_name
         FROM leads d LEFT JOIN partners c ON c.id = d.closer_id
           LEFT JOIN links l ON l.slug = d.ref LEFT JOIN partners p ON p.id = l.partner_id
         ORDER BY d.id DESC LIMIT 1000`,
      )
      .all(),
    db
      .prepare(
        `SELECT p.id, p.name, p.email, p.created_at, p.closer, p.closer_app, p.closer_rating, p.closer_note, p.ai_score, p.strikes, par.name AS invited_by,
           (SELECT COUNT(*) FROM links l WHERE l.partner_id = p.id) AS links,
           (SELECT COUNT(*) FROM clicks c JOIN links l ON l.id = c.link_id WHERE l.partner_id = p.id) AS clicks,
           (SELECT COUNT(*) FROM leads d JOIN links l ON l.slug = d.ref WHERE l.partner_id = p.id) AS leads,
           (SELECT COUNT(*) FROM partners t WHERE t.parent_id = p.id) AS team,
           (SELECT COUNT(*) FROM leads d WHERE d.closer_id = p.id AND d.status IN ${ACTIVE}) AS active_deals,
           (SELECT COUNT(*) FROM leads d WHERE d.closer_id = p.id AND d.status = 'won') AS won,
           (SELECT COALESCE(SUM(value_usd), 0) FROM leads d WHERE d.closer_id = p.id AND d.status = 'won') AS won_usd
         FROM partners p LEFT JOIN partners par ON par.id = p.parent_id
         ORDER BY CASE p.closer WHEN 'applied' THEN 0 WHEN 'approved' THEN 1 ELSE 2 END, p.id DESC LIMIT 1000`,
      )
      .all(),
    db.prepare(`SELECT status, COUNT(*) AS n, COALESCE(SUM(value_usd), 0) AS usd FROM leads GROUP BY status`).all(),
  ]);
  return { leads: leads.results, partners: partners.results, stats: stats.results };
}

export async function ownerLead(db: DB, id: number) {
  const events = await db.prepare('SELECT at, actor, kind, text FROM lead_events WHERE lead_id = ? ORDER BY id').bind(id).all();
  return { events: events.results, messages: await roomMessages(db, id, true) };
}

export async function ownerUpdateLead(db: DB, id: number, b: Record<string, unknown>, notify: Notify) {
  const lead = await db.prepare('SELECT status, closer_id FROM leads WHERE id = ?').bind(id).first<{ status: string; closer_id: number | null }>();
  if (!lead) return false;
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const k of ['service', 'budget', 'brief'] as const) {
    if (typeof b[k] === 'string') { sets.push(`${k} = ?`); vals.push(s(b[k], 4000) || null); }
  }
  if (b.value_usd !== undefined) { sets.push('value_usd = ?'); vals.push(Math.round(Number(b.value_usd)) || null); }
  let status = typeof b.status === 'string' && (OWNER_STATUSES as readonly string[]).includes(b.status) ? b.status : null;
  if (b.closer_id !== undefined) {
    const cid = Number(b.closer_id) || null;
    sets.push('closer_id = ?'); vals.push(cid);
    if (cid) {
      status = status && status !== 'open' && status !== 'new' ? status : 'claimed';
      sets.push(`claimed_at = datetime('now')`);
    }
  }
  if (status) {
    sets.push('status = ?'); vals.push(status);
    sets.push(`due_at = ${due(status)}`);
    if (status === 'open' || status === 'new') sets.push('closer_id = NULL', 'claimed_at = NULL');
  }
  if (sets.length) {
    sets.push(`updated_at = datetime('now')`);
    await db.prepare(`UPDATE leads SET ${sets.join(', ')} WHERE id = ?`).bind(...vals, id).run();
  }
  const note = s(b.note, 2000);
  if (status && status !== lead.status) {
    await logEvent(db, id, 'owner', status === 'open' ? 'publish' : 'status', `${status}${note ? `: ${note}` : ''}`);
    if (status === 'open') await notify(`📣 Lead #${id} published to closers.`);
  } else if (note) {
    await logEvent(db, id, 'owner', 'note', note);
  }
  if (sets.length && !status && !note) await logEvent(db, id, 'owner', 'edit', 'Profile updated');
  await createPayouts(db, id);
  return true;
}

export async function ownerUpdatePartner(db: DB, id: number, b: Record<string, unknown>) {
  const sets: string[] = [];
  const vals: unknown[] = [];
  if (typeof b.closer === 'string' && ['none', 'applied', 'approved', 'paused'].includes(b.closer)) { sets.push('closer = ?'); vals.push(b.closer); }
  if (b.rating !== undefined) { const r = Number(b.rating); sets.push('closer_rating = ?'); vals.push(r >= 1 && r <= 5 ? r : null); }
  if (typeof b.note === 'string') { sets.push('closer_note = ?'); vals.push(s(b.note, 2000) || null); }
  if (!sets.length) return false;
  await db.prepare(`UPDATE partners SET ${sets.join(', ')} WHERE id = ?`).bind(...vals, id).run();
  return true;
}
