// Autopilot: the owner does nothing by default. AI triages every lead, grades manager applications,
// guards and reviews every manager message, keeps a live client summary, and writes one daily digest.
// Everything runs on Workers AI's free allocation; the owner can switch each part off in the HQ.
import type { DB } from './partner.js';
import type { AiBinding } from './chat.js';
import { logEvent, type Notify } from './deals.js';

const MODELS = ['@cf/google/gemma-4-26b-a4b-it', '@cf/meta/llama-3.1-8b-instruct-fp8-fast'];

export async function askAi(ai: AiBinding | undefined, prompt: string, max = 400): Promise<string> {
  if (!ai) return '';
  for (const model of MODELS) {
    try {
      const r = (await ai.run(model, { messages: [{ role: 'user', content: prompt }], max_tokens: max, temperature: 0.2, chat_template_kwargs: { enable_thinking: false } })) as Record<string, any>;
      const t = (typeof r?.response === 'string' ? r.response : r?.choices?.[0]?.message?.content || '').trim();
      if (t) return t;
    } catch (err) {
      console.error('[ai]', model, err);
    }
  }
  return '';
}

/** First JSON object in a model answer. */
export function json<T>(t: string): T | null {
  const m = t.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]) as T; } catch { return null; }
}

export async function settings(db: DB): Promise<Record<string, string>> {
  const { results } = await db.prepare('SELECT key, value FROM settings').all<{ key: string; value: string }>();
  return Object.fromEntries(results.map((r) => [r.key, r.value]));
}
const on = (s: Record<string, string>, k: string) => s[k] !== '0';

// ---------- analytics (anonymous) ----------

const BOT = /bot|crawl|spider|slurp|preview|monitor|headless|lighthouse|facebookexternalhit|curl|wget/i;
const DC = /amazon|aws|google cloud|google llc|microsoft|azure|digitalocean|ovh|hetzner|linode|akamai|alibaba|tencent|oracle|vultr|contabo|leaseweb|scaleway|choopa|m247|datacamp|cloudflare|fastly|hostinger|ionos/i;

export async function trackView(db: DB, request: Request, url: URL) {
  if (BOT.test(request.headers.get('User-Agent') || '')) return;
  // Bots that pretend to be browsers come from data centers, people do not: skip cloud/hosting networks (28.10:
  // ~90% of "direct" views were US/IE/SG data centers, which made the numbers useless).
  const org = String((request as unknown as { cf?: { asOrganization?: string } }).cf?.asOrganization || '');
  if (DC.test(org)) return;
  let ref: string | null = null;
  try { const r = new URL(request.headers.get('Referer') || ''); if (r.hostname !== url.hostname) ref = r.hostname.replace(/^www\./, ''); } catch {}
  const utm = url.searchParams.get('utm_source') || (url.searchParams.get('ref') ? 'partner' : null);
  const country = (request as { cf?: { country?: string } }).cf?.country ?? null;
  const lang = url.pathname.startsWith('/ua/') ? 'ua' : url.pathname.startsWith('/ru/') ? 'ru' : 'en';
  await db.prepare('INSERT INTO pageviews (path, ref, utm, country, lang) VALUES (?, ?, ?, ?, ?)').bind(url.pathname.slice(0, 120), ref, utm, country, lang).run();
}

export async function trackEvent(db: DB, request: Request) {
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const kind = typeof b.k === 'string' && /^[a-z_]{2,24}$/.test(b.k) ? b.k : null;
  if (!kind || BOT.test(request.headers.get('User-Agent') || '')) return;
  const path = typeof b.p === 'string' ? b.p.slice(0, 120) : null;
  const country = (request as { cf?: { country?: string } }).cf?.country ?? null;
  await db.prepare('INSERT INTO events (kind, path, country) VALUES (?, ?, ?)').bind(kind, path, country).run();
}

/** POST /api/ux: one beacon per page visit from scripts/track.ts (clicks, dead/rage clicks, scroll depth, time). */
export async function trackUx(db: DB, request: Request) {
  if (BOT.test(request.headers.get('User-Agent') || '')) return;
  const org = String((request as unknown as { cf?: { asOrganization?: string } }).cf?.asOrganization || '');
  if (DC.test(org)) return;
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const str = (v: unknown, n: number) => (typeof v === 'string' ? v.slice(0, n) : null);
  const num = (v: unknown) => (typeof v === 'number' && isFinite(v) ? Math.max(0, Math.min(100000, Math.round(v))) : null);
  const path = str(b.p, 120), sess = str(b.sess, 12), src = str(b.src, 80);
  const country = (request as { cf?: { country?: string } }).cf?.country ?? null;
  const evs = (Array.isArray(b.evs) ? b.evs : []).slice(0, 90) as Record<string, unknown>[];
  const stmts = evs.filter((e) => ['click', 'dead', 'rage', 'scroll', 'time'].includes(String(e.k))).map((e) =>
    db.prepare('INSERT INTO ux (sess, path, kind, sel, x, y, val, src, country) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(sess, path, String(e.k), str(e.sel, 90), num(e.x), num(e.y), num(e.val), src, country));
  if (stmts.length) await db.batch(stmts);
}

/** Behaviour summary for the CRM: per page depth/time, what people click, dead and rage clicks, lead sources. */
async function behaviour(db: DB) {
  const q = async (sql: string) => (await db.prepare(sql).all()).results;
  const [pages, clicks, dead, rage, leadSrc] = await Promise.all([
    q(`SELECT path AS p, COUNT(DISTINCT sess) AS visits, ROUND(AVG(CASE WHEN kind='scroll' THEN val END)) AS depth,
         ROUND(100.0 * SUM(kind='scroll' AND val >= 90) / MAX(1, SUM(kind='scroll'))) AS bottom,
         ROUND(AVG(CASE WHEN kind='time' AND val < 3600 THEN val END)) AS secs,
         SUM(kind IN ('click','dead','rage')) AS clicks
       FROM ux WHERE at > datetime('now','-30 days') GROUP BY path ORDER BY visits DESC LIMIT 12`),
    q(`SELECT path AS p, sel AS s, COUNT(*) AS n FROM ux WHERE kind='click' AND at > datetime('now','-30 days') GROUP BY path, sel ORDER BY n DESC LIMIT 15`),
    q(`SELECT path AS p, sel AS s, COUNT(*) AS n FROM ux WHERE kind='dead' AND at > datetime('now','-30 days') GROUP BY path, sel ORDER BY n DESC LIMIT 10`),
    q(`SELECT path AS p, sel AS s, COUNT(*) AS n FROM ux WHERE kind='rage' AND at > datetime('now','-30 days') GROUP BY path, sel ORDER BY n DESC LIMIT 10`),
    q(`SELECT COALESCE(source, 'не известно') AS s, COUNT(*) AS n, SUM(status='won') AS won FROM leads
       WHERE created_at > datetime('now','-30 days') AND COALESCE(page,'') != 'test' AND contact NOT LIKE 'test%' GROUP BY s ORDER BY n DESC LIMIT 12`),
  ]);
  return { pages, clicks, dead, rage, leadSrc };
}

export async function analytics(db: DB) {
  const q = async (sql: string) => (await db.prepare(sql).all()).results;
  const one = async (sql: string) => (await db.prepare(sql).first<Record<string, number>>()) ?? {};
  const [daily, sources, countries, pages, funnel, managers] = await Promise.all([
    q(`SELECT date(at) AS d, COUNT(*) AS views FROM pageviews WHERE at > datetime('now', '-30 days') GROUP BY d ORDER BY d`),
    q(`SELECT COALESCE(utm, ref, 'прямой заход') AS s, COUNT(*) AS n FROM pageviews WHERE at > datetime('now', '-30 days') GROUP BY s ORDER BY n DESC LIMIT 10`),
    q(`SELECT COALESCE(country, '?') AS c, COUNT(*) AS n FROM pageviews WHERE at > datetime('now', '-30 days') GROUP BY c ORDER BY n DESC LIMIT 10`),
    q(`SELECT path AS p, COUNT(*) AS n FROM pageviews WHERE at > datetime('now', '-30 days') GROUP BY p ORDER BY n DESC LIMIT 10`),
    one(`SELECT
      (SELECT COUNT(*) FROM pageviews WHERE at > datetime('now', '-30 days')) AS views,
      (SELECT COUNT(*) FROM events WHERE kind = 'chat_open' AND at > datetime('now', '-30 days')) AS chats,
      (SELECT COUNT(*) FROM leads WHERE created_at > datetime('now', '-30 days')) AS leads,
      (SELECT COUNT(*) FROM leads WHERE created_at > datetime('now', '-30 days') AND closer_id IS NOT NULL) AS taken,
      (SELECT COUNT(*) FROM leads WHERE created_at > datetime('now', '-30 days') AND status IN ('proposal', 'won')) AS proposals,
      (SELECT COUNT(*) FROM leads WHERE created_at > datetime('now', '-30 days') AND status = 'won') AS won,
      (SELECT COALESCE(SUM(value_usd), 0) FROM leads WHERE status = 'won' AND updated_at > datetime('now', '-30 days')) AS revenue`),
    q(`SELECT p.id, p.name, p.strikes, p.closer_rating,
         (SELECT COUNT(*) FROM leads d WHERE d.closer_id = p.id) AS taken,
         (SELECT COUNT(*) FROM leads d WHERE d.closer_id = p.id AND d.status = 'won') AS won,
         (SELECT COALESCE(SUM(value_usd), 0) FROM leads d WHERE d.closer_id = p.id AND d.status = 'won') AS revenue,
         (SELECT COUNT(*) FROM lead_events e WHERE e.kind = 'return' AND e.text LIKE '%[p:' || p.id || ']') AS missed,
         (SELECT COUNT(*) FROM messages m WHERE m.sender = 'partner:' || p.id AND m.flag IS NOT NULL) AS flags
       FROM partners p WHERE p.closer IN ('approved', 'paused') ORDER BY revenue DESC, won DESC`),
  ]);
  // Automatic manager rating: results minus missed deadlines and quality flags.
  const scored = (managers as Record<string, number>[]).map((m) => {
    const winRate = m.taken ? m.won / m.taken : 0;
    const auto = Math.max(1, Math.min(5, Math.round((3.5 + winRate * 2 - m.missed * 0.5 - m.flags * 0.7 - m.strikes * 0.5) * 2) / 2));
    return { ...m, auto_rating: auto };
  });
  return { daily, sources, countries, pages, funnel, managers: scored, ux: await behaviour(db).catch(() => null) };
}

// ---------- leads ----------

/** AI scores a new lead; spam goes to the archive, real requests go straight to the managers. */
export async function triageLead(db: DB, ai: AiBinding | undefined, id: number, notify: Notify) {
  const l = await db.prepare('SELECT name, contact, interest, message, lang, country, status, closer_id, brief FROM leads WHERE id = ?').bind(id).first<Record<string, any>>();
  if (!l || l.status !== 'new') return;
  const s = await settings(db);
  const t = await askAi(ai, `Classify this request to Vaxo, a full-cycle digital studio (websites, apps, AI, automation, ads, SMM, SEO, design, video).
Return only JSON: {"spam": true|false, "score": 1-10, "service": "short English label of what they need", "budget": "budget as stated or empty"}.
spam = gibberish, ads, test text, link spam or abuse. score = how promising: 10 = clear big project with budget, 5 = vague but real, 2 = tiny or unclear.
Name: ${l.name}. Contact: ${l.contact}. Interest: ${l.interest}. Country: ${l.country}.
Message: ${(l.message || '').slice(0, 1500)}`, 150);
  const r = json<{ spam?: boolean; score?: number; service?: string; budget?: string }>(t);
  if (!r) return;
  const score = Math.max(1, Math.min(10, Math.round(Number(r.score) || 5)));
  await db.prepare('UPDATE leads SET score = ?, service = COALESCE(service, ?), budget = COALESCE(budget, ?) WHERE id = ?')
    .bind(score, (r.service || '').slice(0, 120) || null, (r.budget || '').slice(0, 60) || null, id).run();
  if (r.spam) {
    await db.prepare(`UPDATE leads SET status = 'archived', updated_at = datetime('now') WHERE id = ?`).bind(id).run();
    await logEvent(db, id, 'system', 'status', 'archived: AI marked as spam');
    return;
  }
  if (on(s, 'auto_publish') && !l.closer_id) {
    await db.prepare(`UPDATE leads SET status = 'open', updated_at = datetime('now') WHERE id = ? AND status = 'new'`).bind(id).run();
    await logEvent(db, id, 'system', 'publish', `open: auto-published by autopilot (score ${score}/10)`);
    await notify(`📣 New lead #${id} (${score}/10): ${r.service || l.interest} — auto-published to managers.`);
  }
}

/** Every hour: a short AI summary of each client conversation that changed (what they need, mood, next step, risk). */
export async function summarizeClients(db: DB, ai: AiBinding | undefined) {
  const { results } = await db
    .prepare(`SELECT d.id, d.name, d.status, d.service FROM leads d WHERE EXISTS (SELECT 1 FROM messages m WHERE m.lead_id = d.id AND m.at > COALESCE(d.summary_at, ''))
              ORDER BY d.id DESC LIMIT 5`)
    .all<{ id: number; name: string; status: string; service: string }>();
  for (const l of results) {
    const { results: msgs } = await db.prepare(`SELECT sender, kind, text FROM messages WHERE lead_id = ? ORDER BY id DESC LIMIT 30`).bind(l.id).all<{ sender: string; kind: string; text: string }>();
    const chat = msgs.reverse().map((m) => `${m.sender === 'client' ? 'Client' : m.sender === 'owner' ? 'Vaxo' : m.sender === 'ai' ? 'Vax (AI manager)' : 'Manager'}${m.kind === 'note' ? ' (internal note)' : ''}: ${m.text.slice(0, 400)}`).join('\n');
    const t = await askAi(ai, `Summarize this sales conversation for the business owner in Russian, 4 short lines:
Нужно: … / Настроение и готовность: … / Следующий шаг: … / Риск: … (например, клиент пропал, менеджер медлит, просит скидку, хочет уйти на другую платформу).
Client: ${l.name}, stage: ${l.status}, service: ${l.service || '?'}.
${chat}`, 220);
    if (t) await db.prepare(`UPDATE leads SET ai_summary = ?, summary_at = datetime('now') WHERE id = ?`).bind(t.slice(0, 1500), l.id).run();
  }
}

// ---------- managers ----------

/** AI grades a manager application. Strong ones are approved at once, weak ones get feedback, the middle waits for the owner. */
export async function gradeApplication(db: DB, ai: AiBinding | undefined, partnerId: number, notify: Notify) {
  const p = await db.prepare('SELECT name, email, closer_app FROM partners WHERE id = ?').bind(partnerId).first<{ name: string; email: string; closer_app: string }>();
  if (!p) return;
  let app: Record<string, unknown> = {};
  try { app = JSON.parse(p.closer_app || '{}'); } catch {}
  const t = await askAi(ai, `You hire account managers who will talk to US/EU business owners in English for a digital studio.
Grade the applicant. Return only JSON: {"score": 1-10, "english": "A2|B1|B2|C1|C2", "feedback": "2 sentences of advice to the applicant in Russian"}.
10 = fluent, persuasive, polite, honest (no fake promises), understands value. 1 = poor English or rude or off-topic.
Claimed English: ${app.english}. Experience: ${String(app.experience || '').slice(0, 800)}.
Test answer to "Why should I pay you $1,500 for a website if my nephew can do it for $300?":
${String(app.pitch || '').slice(0, 1200)}`, 200);
  const r = json<{ score?: number; english?: string; feedback?: string }>(t);
  if (!r) return;
  const score = Math.max(1, Math.min(10, Math.round(Number(r.score) || 5)));
  const s = await settings(db);
  app.ai = { score, english: r.english, feedback: (r.feedback || '').slice(0, 500) };
  let closer = 'applied';
  if (on(s, 'auto_approve') && score >= 7 && /C1|C2/.test(String(r.english))) closer = 'approved';
  else if (on(s, 'auto_approve') && score <= 4) closer = 'none';
  await db.prepare('UPDATE partners SET closer = ?, closer_app = ?, ai_score = ? WHERE id = ?').bind(closer, JSON.stringify(app), score, partnerId).run();
  await notify(closer === 'approved' ? `✅ Manager auto-approved: ${p.name} (${score}/10, ${r.english}).`
    : closer === 'none' ? `↩️ Manager application declined with advice: ${p.name} (${score}/10).`
    : `📝 Manager application needs your look: ${p.name} (${score}/10, ${r.english}). Open HQ → Team.`);
}

// Off-platform contact or payment in a manager's message to the client: blocked before it is sent.
const OFF = [
  /\+?\d[\d\s().-]{8,}\d/, // phone numbers
  /[\w.+-]+@[\w-]+\.[\w.]+/, // emails
  /(^|\s)@[a-z0-9_]{4,}/i, // @handles
  /\b(whats\s?app|telegram|viber|signal|instagram|wechat|skype|t\.me|wa\.me)\b/i,
  /\b(pay (me|to me) directly|my (paypal|card|wallet|iban|account)|send (the )?money to me|cash ?app|zelle|venmo|crypto|usdt)\b/i,
];
export function guardMessage(text: string): string | null {
  const t = text.replace(/vaxogroup\.com\S*/gi, '').replace(/meet\.google\.com\S*|zoom\.us\S*|teams\.microsoft\.com\S*/gi, '');
  return OFF.some((re) => re.test(t)) ? 'off-platform' : null;
}

/** Hourly: AI reviews new manager messages; problems are flagged, counted as strikes, and pause the manager at 3. */
export async function qcSweep(db: DB, ai: AiBinding | undefined, notify: Notify) {
  const s = await settings(db);
  if (!on(s, 'auto_qc')) return;
  const { results } = await db
    .prepare(`SELECT m.id, m.lead_id, m.sender, m.text, d.name AS client FROM messages m JOIN leads d ON d.id = m.lead_id
              WHERE m.sender LIKE 'partner:%' AND m.kind != 'note' AND m.qc_at IS NULL ORDER BY m.id LIMIT 15`)
    .all<{ id: number; lead_id: number; sender: string; text: string; client: string }>();
  if (!results.length) return;
  const list = results.map((m, i) => `${i + 1}. ${m.text.slice(0, 500).replace(/\n/g, ' ')}`).join('\n');
  const t = await askAi(ai, `You check messages that account managers of Vaxo (digital studio) sent to clients.
Official prices: websites $400–6,000, apps $3,000–50,000, ads management $300–1,500/month, starter packages $149–249. The client pays only Vaxo.
For each numbered message return a flag: "ok", "rude", "off_platform" (moving the client to other contacts or payments), "wrong_price" (price outside ranges or unapproved discount), "overpromise" (guaranteed results or dates).
Return only JSON: {"flags": ["ok", ...]} with exactly ${results.length} items.
${list}`, 200);
  const flags = json<{ flags?: string[] }>(t)?.flags ?? [];
  for (const [i, m] of results.entries()) {
    const f = flags[i] && flags[i] !== 'ok' ? String(flags[i]).slice(0, 20) : null;
    await db.prepare(`UPDATE messages SET qc_at = datetime('now'), flag = ? WHERE id = ?`).bind(f, m.id).run();
    if (!f) continue;
    const pid = Number(m.sender.split(':')[1]);
    await db.prepare('UPDATE partners SET strikes = strikes + 1 WHERE id = ?').bind(pid).run();
    const p = await db.prepare('SELECT name, strikes FROM partners WHERE id = ?').bind(pid).first<{ name: string; strikes: number }>();
    if ((p?.strikes ?? 0) >= 3) await db.prepare(`UPDATE partners SET closer = 'paused' WHERE id = ?`).bind(pid).run();
    await logEvent(db, m.lead_id, 'system', 'alert', `Quality check: ${f} in a message by ${p?.name}`);
    await notify(`🚩 Quality check (${f}): ${p?.name} → ${m.client}: «${m.text.slice(0, 160)}»${(p?.strikes ?? 0) >= 3 ? ' — manager paused (3 strikes).' : ''}`);
  }
}

/** Grades every application that has no AI grade yet (right after submit, and hourly as a fallback). */
export async function gradePending(db: DB, ai: AiBinding | undefined, notify: Notify) {
  const { results } = await db.prepare(`SELECT id FROM partners WHERE closer = 'applied' AND ai_score IS NULL LIMIT 5`).all<{ id: number }>();
  for (const r of results) await gradeApplication(db, ai, r.id, notify);
}

// ---------- daily digest ----------

export async function makeDigest(db: DB, ai: AiBinding | undefined): Promise<string> {
  const one = async (sql: string) => (await db.prepare(sql).first<Record<string, number>>()) ?? {};
  const d = await one(`SELECT
    (SELECT COUNT(*) FROM pageviews WHERE at > datetime('now', '-1 day')) AS views_1d,
    (SELECT COUNT(*) FROM pageviews WHERE at > datetime('now', '-7 days')) AS views_7d,
    (SELECT COUNT(*) FROM events WHERE kind = 'chat_open' AND at > datetime('now', '-1 day')) AS chats_1d,
    (SELECT COUNT(*) FROM leads WHERE created_at > datetime('now', '-1 day')) AS leads_1d,
    (SELECT COUNT(*) FROM leads WHERE created_at > datetime('now', '-7 days')) AS leads_7d,
    (SELECT COUNT(*) FROM leads WHERE status = 'open') AS waiting_manager,
    (SELECT COUNT(*) FROM leads WHERE status IN ('claimed','contacted','meeting','proposal')) AS in_work,
    (SELECT COUNT(*) FROM leads WHERE status = 'won' AND updated_at > datetime('now', '-7 days')) AS won_7d,
    (SELECT COALESCE(SUM(value_usd), 0) FROM leads WHERE status = 'won' AND updated_at > datetime('now', '-7 days')) AS revenue_7d,
    (SELECT COUNT(*) FROM leads WHERE status = 'lost' AND updated_at > datetime('now', '-7 days')) AS lost_7d,
    (SELECT COUNT(*) FROM messages WHERE flag IS NOT NULL AND at > datetime('now', '-1 day')) AS flags_1d,
    (SELECT COUNT(*) FROM partners WHERE created_at > datetime('now', '-1 day')) AS partners_1d,
    (SELECT COUNT(*) FROM partners WHERE closer = 'approved') AS managers,
    (SELECT COUNT(*) FROM partners WHERE closer = 'applied') AS applications,
    (SELECT COALESCE(SUM(amount_usd), 0) FROM payouts WHERE status = 'due') AS payouts_due`);
  const src = (await db.prepare(`SELECT COALESCE(utm, ref, 'direct') AS s, COUNT(*) AS n FROM pageviews WHERE at > datetime('now', '-7 days') GROUP BY s ORDER BY n DESC LIMIT 5`).all()).results;
  const t = await askAi(ai, `Ты — операционный директор Vaxo (digital-студия полного цикла). Напиши владельцу ежедневную сводку по-русски, очень просто, 8–12 коротких строк:
1) одной строкой — главное за сутки; 2) цифры (просмотры, чаты, заявки, сделки, выручка за 7 дней); 3) что идёт плохо и почему; 4) 2–3 конкретных действия, которые автопилот или владелец должен сделать (владельцу — только если без него никак).
Не выдумывай цифр, используй только эти данные: ${JSON.stringify(d)}. Источники трафика за 7 дней: ${JSON.stringify(src)}.`, 450);
  const text = t || `Сводка: просмотров за сутки ${d.views_1d}, заявок ${d.leads_1d}, в работе ${d.in_work}, выиграно за 7 дней ${d.won_7d} ($${d.revenue_7d}).`;
  await db.prepare('INSERT INTO digests (text) VALUES (?)').bind(text).run();
  return text;
}

/** Called hourly: once a day at 05:00 UTC (08:00 Kyiv / Tel Aviv) the owner gets the digest in Telegram. */
export async function maybeDigest(db: DB, ai: AiBinding | undefined, notify: Notify, now = new Date()) {
  const s = await settings(db);
  if (!on(s, 'digest') || now.getUTCHours() !== 5) return;
  const last = await db.prepare(`SELECT COUNT(*) AS n FROM digests WHERE at > datetime('now', '-20 hours')`).first<{ n: number }>();
  if ((last?.n ?? 0) > 0) return;
  await notify('☀️ Vaxo — сводка дня\n\n' + (await makeDigest(db, ai)));
}
