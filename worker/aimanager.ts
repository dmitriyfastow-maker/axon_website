// AI manager: Vax leads every client from the first message to the repeat order — answers in seconds, gathers the
// brief, recommends one package, reports project status, follows up after silence and after delivery.
// A human manager joins only when the client needs a live conversation (call, complaint, refund, special price).
import type { DB } from './partner.js';
import { FACTS, type AiBinding } from './chat.js';
import { askAi, json, settings } from './autopilot.js';
import { logEvent, type Notify } from './deals.js';
import { addMessage } from './rooms.js';

// In owner-price mode Vax must not see any client prices at all (partner rates stay).
const FACTS_NO_PRICES = FACTS.split('\n').filter((line) => !/\$\d/.test(line) || line.startsWith('PARTNER')).join('\n');
const PRICE_RE = /(?:\$\s?\d[\d,. ]*|\d[\d,. ]*\s?(?:\$|usd|долл\w*|дол\w*|eur\w*|евро|€|грн|uah|гривен\w*))/i;

const MODELS = ['@cf/google/gemma-4-26b-a4b-it', '@cf/meta/llama-3.1-8b-instruct-fp8-fast'];
const LANG: Record<string, string> = { en: 'English', ua: 'Ukrainian', ru: 'Russian' };

/** Project stages after payment. 'qa' is internal: the client sees it as "in progress". */
export const STAGES = ['work', 'qa', 'review', 'revisions', 'delivered'] as const;
const STAGE_TEXT: Record<string, string> = {
  work: 'in progress — the team is building it',
  qa: 'in progress — final quality checks',
  review: 'ready for the client to review (preview link in this chat)',
  revisions: 'applying the client’s revisions (2 rounds included)',
  delivered: 'delivered',
};

type Lead = {
  id: number; mode: string; name: string; lang: string | null; status: string; service: string | null; budget: string | null;
  interest: string | null; message: string | null; brief: string | null; profile: string | null; ai: string;
  stage: string | null; stage_due: string | null; human: string | null; progress: number | null; promo: string | null; manager: string | null; value_usd: number | null;
};

async function loadLead(db: DB, id: number): Promise<Lead | null> {
  return db
    .prepare(`SELECT d.id, d.mode, d.name, d.lang, d.status, d.service, d.budget, d.interest, d.message, d.brief, d.profile, d.ai, d.stage, d.stage_due, d.human, d.progress, d.promo, d.value_usd, p.name AS manager
              FROM leads d LEFT JOIN partners p ON p.id = d.closer_id WHERE d.id = ?`)
    .bind(id)
    .first<Lead>();
}

function system(l: Lead, extra = '', ownerPrice = false, friend = false): string {
  if (l.mode === 'collab') return collabSystem(l);
  const first = l.manager ? l.manager.trim().split(/\s+/)[0] : null;
  return `You are Vax, the AI account manager of Vaxo (a full-cycle digital studio). You run this client's private project chat 24/7.
You are an AI assistant and say so honestly if asked or in your first message. ${first ? `The client's human manager is ${first}; they join for live calls.` : 'A human manager joins only for live calls.'}
Answer in ${LANG[l.lang || 'en'] ?? 'English'} unless the client writes in another language — then use theirs.
Style: short (1–4 sentences), warm, concrete, no markdown headings. Adapt to the client's communication profile below (tone, formality, what matters to them, their concerns). Ethical persuasion only: real facts, real cases (AiPro Partners, TrichoTech), honest timelines; never pressure, fake urgency or invented discounts.
Your job by stage:
${ownerPrice ? `- Before payment (PRICE MODE — right now the team sets every price personally): understand the business and goal (ask at most 2 questions at a time). Do NOT name prices or price ranges, even from the facts. When the task is clear, ask what budget they have in mind or what they are ready to pay for it. When the client names a price, set "offer" to {"price": "<amount as they said it>", "task": "<one line in English>"} and tell them the team will confirm within 24 hours. Timelines only as a range with a safety margin: one-page site 1–3 days, landing page 3–7 days, multi-page site 1–3 weeks, app MVP 4–8 weeks; say it may well be faster.` : `- Before payment: understand the business and goal (ask at most 2 questions at a time: business and audience, goal, deadline, budget, examples they like). When you know enough, recommend the ONE smallest package from the facts that solves their goal, with its price range and the next step (strategy call or starter package). If their budget is below that range, first offer what honestly fits the price list (a starter package, a one-page site, a landing page, or a smaller first phase). Final prices are fixed by the team after the strategy session.`}
- Brief (every client, before any work): ask short questions until you know the goal, the audience, what the site/product must do, what content they already have (texts, photos, logo), 1–3 examples they like, must-haves and the deadline. Then send a numbered summary titled "Brief" and ask them to confirm or correct it. Work starts only from a confirmed brief — it saves revisions.
${friend ? `- FRIENDS MODE (this client came personally from the Vaxo team): for small projects there is no prepayment — we build first, show a preview, include up to 5 revision rounds, and the client pays after approving the result; then we hand over files, access and full rights. After handover, offer support (updates, fixes, small changes, checks) and explain why it helps; the client names their price for support too and you pass it to the team the same way.
` : ''}- After payment: report the project stage, progress % and date below (short, no technical details), collect revision requests clearly, never promise dates beyond the one given. When a preview link exists, share it.
- After delivery: ask how it works for them; suggest the one most useful next step (ads, support, content, SEO) only if it fits their goal.
- Word of mouth: when the client is happy, thanks you, after delivery, or mentions a friend or another business — once, naturally, mention they can recommend Vaxo: they get 10% of the friend's first order in cash or 15% off their own next order, and the friend gets 10% off (vaxogroup.com/partners/). Never during a complaint, never twice in a row.
Never ask for passwords, card numbers or documents in the chat. Never promise results, discounts or dates not listed. Never move the client to other contacts.
Set "human" (a short reason in English) when the client asks for a call or a human, complains, asks for a refund, insists on a custom price below the listed range after you offered what fits, or is ready to order something over $3,000 — then tell the client a human manager will join here shortly.
Set "brief" when you have learned new facts about the client's business or task (one line, English), else null.
Return ONLY JSON: {"reply": "...", "human": null, "brief": null${ownerPrice ? ', "offer": null' : ''}}
CLIENT: ${l.name}. Asked about: ${l.interest || '?'} ${l.service ? `/ service: ${l.service}` : ''} ${l.budget ? `/ budget: ${l.budget}` : ''}.
First request: ${(l.message || '').slice(0, 600)}
Known brief: ${(l.brief || '—').slice(0, 1200)}
Communication profile: ${l.profile || 'unknown yet — mirror their style'}
Deal status: ${l.status}${l.stage ? `. Project stage: ${STAGE_TEXT[l.stage] ?? l.stage}${l.progress != null ? `, ${l.progress}% done` : ''}${l.stage_due ? `, expected by ${l.stage_due.slice(0, 10)}` : ''}` : ''}.
${l.interest?.startsWith('gift-') && l.interest !== 'gift-business' ? `GIFT WAITLIST: this person joined the waitlist for a personal cartoon gift with Vax & Roxy (video card $7.99, personal scene $19–39, mini-series $79–129). Orders and payment are NOT open yet: never take an order, payment or deadline. Thank them, ask the occasion, names and date if missing, and say we write to them first when orders open. Do not offer websites or other services unless they ask.\n` : ''}${extra}
FACTS:
${ownerPrice ? FACTS_NO_PRICES : FACTS}`;
}

// Partnerships: creators, UGC, agencies, brands, tech partners, job seekers. Vax agrees standard terms itself and
// sends anything involving our money, exclusivity or non-standard terms to the owner (the "human" flag).
function collabSystem(l: Lead): string {
  return `You are Vax, the AI partnerships manager of Vaxo (a full-cycle digital studio: websites, apps, AI assistants, ads, content, an AI-animated cartoon with our mascots Vax the raccoon and Roxy the fox). You run this private chat with someone who sent a collaboration proposal. You are an AI and say so in your first message.
Answer in ${LANG[l.lang || 'en'] ?? 'English'} unless they write in another language. Short (1–4 sentences), warm, businesslike, no markdown headings.
Goal: understand the proposal fast (who they are, audience or portfolio, what exactly they offer, what they want in return), then move it to a clear next step.
Standard terms you may agree yourself:
- Creators, bloggers, clippers: free partner account at vaxogroup.com/partners/ with their own link. Recommending: 30% of the first order + 10% of every later payment for life. Bring a client AND close the call yourself: 40% + 10% for life. Content-only partners choose 30% of the first sale or 10% of every sale for life. We pay on sales, never for views or posts, and pay after the client pays. Every promo is marked #ad.
- UGC creators: collect niche, languages, portfolio link and their price per video; say we add them to our talent base and offer paid work when a client project fits; they can also earn commission by recommending us.
- Agencies and freelancers: white-label (we build, they resell under their brand) or referral commission; their clients stay theirs, we never sell to their clients the service they provide. White-label prices are agreed individually.
- Job seekers: managers apply in the partner cabinet (Clients tab); other roles: collect portfolio and rate.
Be realistic about money: compare any price they ask with the market and say honestly if it is high. Never promise income, views or results.
Set "human" (short reason, English) when they ask us to PAY anything (fees, paid posts, ads, salary), want exclusivity, a contract, a discount or white-label prices, or it is a big brand deal — tell them the Vaxo team will review it and answer in this chat.
Set "brief" to a one-line summary of the proposal when you learn something new, else null.
Return ONLY JSON: {"reply": "...", "human": null, "brief": null}
FROM: ${l.name}. Type: ${l.interest || '?'}.
Proposal: ${(l.message || '').slice(0, 1500)}
Known: ${(l.brief || '—').slice(0, 800)}`;
}

async function run(ai: AiBinding, messages: { role: string; content: string }[]): Promise<{ reply: string; human: string | null; brief: string | null; offer: { price: string; task: string } | null } | null> {
  for (const model of MODELS) {
    try {
      const r = (await ai.run(model, { messages, max_tokens: 400, temperature: 0.4, chat_template_kwargs: { enable_thinking: false } })) as Record<string, any>;
      const t = (typeof r?.response === 'string' ? r.response : r?.choices?.[0]?.message?.content || '').trim();
      if (!t) continue;
      const j = json<{ reply?: unknown; human?: unknown; brief?: unknown; offer?: { price?: unknown; task?: unknown } | null }>(t);
      const reply = (typeof j?.reply === 'string' ? j.reply : j ? '' : t).replace(/\*\*/g, '').trim();
      if (!reply) continue;
      const str = (v: unknown) => (typeof v === 'string' && v.trim() && v.trim().toLowerCase() !== 'null' ? v.trim().slice(0, 300) : null);
      const op = j?.offer && typeof j.offer === 'object' ? str(j.offer.price) : null;
      return { reply: reply.slice(0, 2000), human: str(j?.human), brief: str(j?.brief), offer: op ? { price: op, task: str(j?.offer?.task) || '' } : null };
    } catch (err) {
      console.error('[aimanager]', model, err);
    }
  }
  return null;
}

/** Vax answers the client's latest message (or greets a new request). Silent while a human is talking or the AI is paused. */
export async function aiReply(db: DB, ai: AiBinding | undefined, leadId: number, notify: Notify, opts: { greet?: boolean; nudge?: string } = {}): Promise<boolean> {
  if (!ai) return false;
  const st = await settings(db);
  if (st.ai_manager === '0') return false;
  const l = await loadLead(db, leadId);
  if (!l || l.ai === 'paused' || ['lost', 'archived'].includes(l.status)) return false;
  const { results } = await db
    .prepare(`SELECT sender, kind, text, at FROM messages WHERE lead_id = ? AND kind != 'note' ORDER BY id DESC LIMIT 20`)
    .bind(leadId)
    .all<{ sender: string; kind: string; text: string; at: string }>();
  const msgs = results.reverse();
  const last = msgs[msgs.length - 1];
  if (opts.greet ? msgs.length > 0 : !opts.nudge && last?.sender !== 'client') return false;
  // A human manager or the owner wrote in the last 30 minutes: let them lead.
  const humanRecent = await db
    .prepare(`SELECT 1 FROM messages WHERE lead_id = ? AND (sender = 'owner' OR sender LIKE 'partner:%') AND kind != 'note' AND at > datetime('now', '-30 minutes') LIMIT 1`)
    .bind(leadId)
    .first();
  if (humanRecent && !opts.nudge) return false;
  const convo = msgs.filter((m) => m.sender !== 'system').map((m) => ({ role: m.sender === 'client' ? 'user' : 'assistant', content: m.text.slice(0, 1500) }));
  if (opts.greet) convo.push({ role: 'user', content: `(The client just sent the request above via the site form and opened this chat. Greet them by name, say you are Vax, the AI manager, and ask the first 1–2 questions.)` });
  if (opts.nudge) convo.push({ role: 'user', content: `(System, not the client: ${opts.nudge})` });
  // Models expect alternating turns starting with the user.
  const merged: { role: string; content: string }[] = [];
  for (const m of convo) {
    const prev = merged[merged.length - 1];
    if (prev && prev.role === m.role) prev.content += '\n' + m.content;
    else merged.push({ ...m });
  }
  if (merged[0]?.role !== 'user') merged.unshift({ role: 'user', content: '(conversation start)' });
  // Friend promo code: from the form/link, or written in the chat.
  const codes = (st.friend_codes || 'DIMA').split(',').map((c) => c.trim().toUpperCase()).filter(Boolean);
  if (!l.promo) {
    const said = msgs.filter((m) => m.sender === 'client').map((m) => m.text.toUpperCase()).join(' ');
    const hit = codes.find((c) => new RegExp(`(^|[^A-Z0-9])${c}([^A-Z0-9]|$)`).test(said));
    if (hit) { l.promo = hit; await db.prepare('UPDATE leads SET promo = ? WHERE id = ?').bind(hit, leadId).run(); await logEvent(db, leadId, 'ai', 'note', `Friend promo code: ${hit}`); }
  }
  const friend = !!l.promo && codes.includes(l.promo.toUpperCase());
  const ownerPrice = friend && st.price_owner !== '0' && l.status !== 'won';
  let out = await run(ai, [{ role: 'system', content: system(l, '', ownerPrice, friend) }, ...merged]);
  if (out && ownerPrice && PRICE_RE.test(out.reply)) {
    // Named a price anyway: rewrite once without any amounts.
    const again = await run(ai, [{ role: 'system', content: system(l, 'Your previous draft named a price. Rewrite it WITHOUT any prices or amounts; ask for their budget instead, or say the team confirms the price.', ownerPrice, friend) }, ...merged]);
    if (again && !PRICE_RE.test(again.reply)) out = { ...again, offer: again.offer ?? out.offer };
    else out = { ...out, reply: l.lang === 'ru' ? 'Цену по вашей задаче команда подтвердит лично — подскажите, какой бюджет вы рассматриваете?' : l.lang === 'ua' ? 'Ціну за вашою задачею команда підтвердить особисто — підкажіть, який бюджет ви розглядаєте?' : 'The team confirms the price for your task personally — what budget do you have in mind?' };
  }
  // The client named an amount but the model missed it: still send it to the owner.
  const lastClient = [...msgs].reverse().find((m) => m.sender === 'client');
  if (out && ownerPrice && !out.offer && lastClient && !opts.greet && !opts.nudge) {
    const m = lastClient.text.match(PRICE_RE);
    if (m) out = { ...out, offer: { price: m[0].trim(), task: (l.brief || l.message || l.interest || '').split('\n').pop()!.slice(0, 160) } };
  }
  if (!out) return false;
  await addMessage(db, leadId, 'ai', 'text', out.reply);
  if (out.brief) {
    const brief = `${l.brief ? l.brief + '\n' : ''}• ${out.brief}`.slice(-3000);
    await db.prepare(`UPDATE leads SET brief = ?, updated_at = datetime('now') WHERE id = ?`).bind(brief, leadId).run();
  }
  if (out.offer && ownerPrice) await priceDecision(db, ai, l, out.offer, msgs, notify);
  if (out.human && !l.human) {
    await db.prepare(`UPDATE leads SET human = ?, updated_at = datetime('now') WHERE id = ?`).bind(out.human, leadId).run();
    await logEvent(db, leadId, 'ai', 'note', `Live manager needed: ${out.human}`);
    await notify(`🙋 #${leadId} ${l.name}: нужен живой менеджер — ${out.human}${l.manager ? ` (менеджер ${l.manager})` : ' (менеджер не назначен)'}`);
  }
  // Every 3rd client message: refresh the communication profile.
  const n = msgs.filter((m) => m.sender === 'client').length;
  if (n > 0 && n % 3 === 0) await refreshProfile(db, ai, leadId, msgs);
  return true;
}

async function refreshProfile(db: DB, ai: AiBinding, leadId: number, msgs: { sender: string; text: string }[]) {
  const chat = msgs.filter((m) => m.sender === 'client').map((m) => `- ${m.text.slice(0, 400)}`).join('\n');
  const t = await askAi(ai, `From these client messages, describe how to talk to this person. Return only JSON:
{"lang":"...","tone":"brief|detailed","formality":"casual|formal","priorities":["price|speed|quality|status|results|..."],"concerns":"one line","tip":"one line: how to talk to them"}
${chat}`, 200);
  const j = json<Record<string, unknown>>(t);
  if (j) await db.prepare('UPDATE leads SET profile = ? WHERE id = ?').bind(JSON.stringify(j).slice(0, 800), leadId).run();
}

/** The client named a price: the owner decides. AI writes a short feasibility note (can we do it, nuances, how to cut cost and risk). */
async function priceDecision(db: DB, ai: AiBinding, l: Lead, offer: { price: string; task: string }, msgs: { sender: string; text: string }[], notify: Notify) {
  const chat = msgs.slice(-12).map((m) => `${m.sender === 'client' ? 'Client' : 'Vax'}: ${m.text.slice(0, 300)}`).join('\n');
  const note = await askAi(ai, `You advise the owner of Vaxo, a digital studio where AI (Claude) does most of the work. A client offers a price. Write to the OWNER (not to the client), in Russian, max 5 short lines: 1) можем ли сделать за эти деньги и за какой срок (с запасом); 2) что именно входит (минимальный разумный объём); 3) нюансы и риски (домен, контент, правки, доступы); 4) как сократить наши расходы и риски; 5) рекомендация: принять / принять с уменьшенным объёмом / предложить другую цену (какую).
Task: ${offer.task}. Offered price: ${offer.price}.
${chat}`, 350);
  const human = `Цена клиента: ${offer.price} — ${offer.task}`.slice(0, 300);
  await db.prepare(`UPDATE leads SET human = ?, budget = ?, updated_at = datetime('now') WHERE id = ?`).bind(human, offer.price.slice(0, 60), l.id).run();
  await logEvent(db, l.id, 'ai', 'decision', `${human}\n${note}`);
  await notify(`💰 Нужно ваше решение — #${l.id} ${l.name}\nПредлагает: ${offer.price}\nЗадача: ${offer.task}\n\n${note || '(оценка не получилась — посмотрите переписку)'}\n\nОтветить: Штаб → Чаты → #${l.id} → «Принять цену» / «Отказать».`);
}

/** Owner's answer to a client's price: Vax tells the client and moves on. */
export async function answerOffer(db: DB, ai: AiBinding | undefined, leadId: number, accept: boolean, counter: string | null, notify: Notify) {
  const l = await loadLead(db, leadId);
  if (!l) return false;
  await db.prepare(`UPDATE leads SET human = NULL, status = CASE WHEN ? THEN 'proposal' ELSE status END, updated_at = datetime('now') WHERE id = ?`).bind(accept ? 1 : 0, leadId).run();
  await logEvent(db, leadId, 'owner', 'decision', accept ? `Price accepted: ${l.budget}` : counter ? `Counter-offer: ${counter}` : 'Price declined');
  const nudge = accept
    ? `The team ACCEPTED the client's price (${l.budget}). Tell them warmly, confirm the scope in one line, say the team will send payment details here and the work starts as soon as the payment arrives, and give the timeline as a range with a margin.`
    : counter
      ? `The team cannot do it for ${l.budget}, but offers ${counter}. Explain kindly what this price includes and ask if it works for them.`
      : `The team cannot do it for ${l.budget}. Thank them kindly, offer a smaller first step that could fit, and keep the door open.`;
  return aiReply(db, ai, leadId, notify, { nudge });
}

/** Hourly: one gentle follow-up after 48 h of client silence before payment; check-ins 7 and 30 days after delivery. */
export async function aiFollowups(db: DB, ai: AiBinding | undefined, notify: Notify) {
  if (!ai) return;
  const { results } = await db
    .prepare(
      `SELECT d.id, d.status, d.stage, d.followups, (SELECT MAX(at) FROM messages m WHERE m.lead_id = d.id AND m.kind != 'note') AS last_at,
              (SELECT sender FROM messages m WHERE m.lead_id = d.id AND m.kind != 'note' ORDER BY id DESC LIMIT 1) AS last_sender,
              (SELECT MAX(at) FROM lead_events e WHERE e.lead_id = d.id AND e.kind = 'status' AND e.text LIKE 'stage: delivered%') AS delivered_at
       FROM leads d WHERE d.ai = 'on' AND d.status NOT IN ('lost', 'archived', 'collab', 'gift') AND d.followups < 3 ORDER BY d.id DESC LIMIT 40`,
    )
    .all<{ id: number; status: string; stage: string | null; followups: number; last_at: string | null; last_sender: string | null; delivered_at: string | null }>();
  const ago = (iso: string | null) => (iso ? (Date.now() - Date.parse(iso.replace(' ', 'T') + 'Z')) / 864e5 : 0);
  for (const r of results) {
    let nudge = '';
    if (r.stage === 'delivered' && r.delivered_at) {
      const d = ago(r.delivered_at);
      if (r.followups < 2 && d >= 7 && ago(r.last_at) >= 5) nudge = 'It has been a week since delivery. Ask how it works for them and whether anything needs fixing. Ask for a short review if they are happy.';
      else if (r.followups < 3 && d >= 30 && ago(r.last_at) >= 14) nudge = 'A month since delivery. Ask about results and suggest the one most useful next step for their goal, with its price range.';
    } else if (r.status === 'won' && (r.stage === 'work' || r.stage === 'qa' || r.stage === 'revisions') && ago(r.last_at) >= 3) {
      nudge = 'No news for 3 days while the project is in progress. Send a short status update: what stage it is at, the % done and the expected date. No technical details. If a preview link exists in the chat, mention it.';
    } else if (r.status !== 'won' && r.last_sender === 'ai' && r.followups === 0 && ago(r.last_at) >= 2) {
      nudge = 'The client has not answered for 2 days. Send one short, friendly follow-up with value (an idea or a relevant real case). Make it easy to answer. Never pressure.';
    }
    if (!nudge) continue;
    if (await aiReply(db, ai, r.id, notify, { nudge })) {
      await db.prepare('UPDATE leads SET followups = followups + 1 WHERE id = ?').bind(r.id).run();
      await logEvent(db, r.id, 'ai', 'note', 'AI follow-up sent');
    }
  }
}

/** Owner/manager controls: pause or resume the AI, set the project stage and date. */
export async function setAiState(db: DB, leadId: number, actor: string, b: Record<string, unknown>) {
  if (b.ai === 'on' || b.ai === 'paused') {
    await db.prepare(`UPDATE leads SET ai = ?, updated_at = datetime('now') WHERE id = ?`).bind(b.ai, leadId).run();
    await logEvent(db, leadId, actor, 'note', b.ai === 'paused' ? 'AI manager paused' : 'AI manager resumed');
  }
  if (b.human === null) await db.prepare('UPDATE leads SET human = NULL WHERE id = ?').bind(leadId).run();
  if (typeof b.stage === 'string' && (STAGES as readonly string[]).includes(b.stage)) {
    const due = typeof b.stage_due === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(b.stage_due) ? b.stage_due : null;
    const pct = typeof b.progress === 'number' && b.progress >= 0 && b.progress <= 100 ? Math.round(b.progress) : ({ work: 30, qa: 70, review: 85, revisions: 90, delivered: 100 } as Record<string, number>)[b.stage];
    await db.prepare(`UPDATE leads SET stage = ?, stage_due = ?, progress = ?, followups = 0, updated_at = datetime('now') WHERE id = ?`).bind(b.stage, due, pct, leadId).run();
    await logEvent(db, leadId, actor, 'status', `stage: ${b.stage}${due ? ' until ' + due : ''}`);
    if (b.stage !== 'qa') await addMessage(db, leadId, 'system', 'text', `stage:${b.stage}${due ? ':' + due : ''}`);
  }
}
