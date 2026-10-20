// AI manager: Vax leads every client from the first message to the repeat order — answers in seconds, gathers the
// brief, recommends one package, reports project status, follows up after silence and after delivery.
// A human manager joins only when the client needs a live conversation (call, complaint, refund, special price).
import type { DB } from './partner.js';
import { FACTS, type AiBinding } from './chat.js';
import { askAi, json, settings } from './autopilot.js';
import { logEvent, type Notify } from './deals.js';
import { addMessage } from './rooms.js';

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
  stage: string | null; stage_due: string | null; human: string | null; manager: string | null; value_usd: number | null;
};

async function loadLead(db: DB, id: number): Promise<Lead | null> {
  return db
    .prepare(`SELECT d.id, d.mode, d.name, d.lang, d.status, d.service, d.budget, d.interest, d.message, d.brief, d.profile, d.ai, d.stage, d.stage_due, d.human, d.value_usd, p.name AS manager
              FROM leads d LEFT JOIN partners p ON p.id = d.closer_id WHERE d.id = ?`)
    .bind(id)
    .first<Lead>();
}

function system(l: Lead, extra = ''): string {
  if (l.mode === 'collab') return collabSystem(l);
  const first = l.manager ? l.manager.trim().split(/\s+/)[0] : null;
  return `You are Vax, the AI account manager of Vaxo (a full-cycle digital studio). You run this client's private project chat 24/7.
You are an AI assistant and say so honestly if asked or in your first message. ${first ? `The client's human manager is ${first}; they join for live calls.` : 'A human manager joins only for live calls.'}
Answer in ${LANG[l.lang || 'en'] ?? 'English'} unless the client writes in another language — then use theirs.
Style: short (1–4 sentences), warm, concrete, no markdown headings. Adapt to the client's communication profile below (tone, formality, what matters to them, their concerns). Ethical persuasion only: real facts, real cases (AiPro Partners, TrichoTech), honest timelines; never pressure, fake urgency or invented discounts.
Your job by stage:
- Before payment: understand the business and goal (ask at most 2 questions at a time: business and audience, goal, deadline, budget, examples they like). When you know enough, recommend the ONE smallest package from the facts that solves their goal, with its price range and the next step (strategy call or starter package). If their budget is below that range, first offer what honestly fits the price list (a starter package, a one-page site, a landing page, or a smaller first phase). Final prices are fixed by the team after the strategy session.
- After payment: report the project stage and date below, collect revision requests clearly, never promise dates beyond the one given.
- After delivery: ask how it works for them; suggest the one most useful next step (ads, support, content, SEO) only if it fits their goal.
Never ask for passwords, card numbers or documents in the chat. Never promise results, discounts or dates not listed. Never move the client to other contacts.
Set "human" (a short reason in English) when the client asks for a call or a human, complains, asks for a refund, insists on a custom price below the listed range after you offered what fits, or is ready to order something over $3,000 — then tell the client a human manager will join here shortly.
Set "brief" when you have learned new facts about the client's business or task (one line, English), else null.
Return ONLY JSON: {"reply": "...", "human": null, "brief": null}
CLIENT: ${l.name}. Asked about: ${l.interest || '?'} ${l.service ? `/ service: ${l.service}` : ''} ${l.budget ? `/ budget: ${l.budget}` : ''}.
First request: ${(l.message || '').slice(0, 600)}
Known brief: ${(l.brief || '—').slice(0, 1200)}
Communication profile: ${l.profile || 'unknown yet — mirror their style'}
Deal status: ${l.status}${l.stage ? `. Project stage: ${STAGE_TEXT[l.stage] ?? l.stage}${l.stage_due ? `, expected by ${l.stage_due.slice(0, 10)}` : ''}` : ''}.
${extra}
FACTS:
${FACTS}`;
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
Set "human" (short reason, English) when they ask us to PAY anything (fees, paid posts, ads, salary), want exclusivity, a contract, a discount or white-label prices, or it is a big brand deal — tell them the founder will review and answer in this chat.
Set "brief" to a one-line summary of the proposal when you learn something new, else null.
Return ONLY JSON: {"reply": "...", "human": null, "brief": null}
FROM: ${l.name}. Type: ${l.interest || '?'}.
Proposal: ${(l.message || '').slice(0, 1500)}
Known: ${(l.brief || '—').slice(0, 800)}`;
}

async function run(ai: AiBinding, messages: { role: string; content: string }[]): Promise<{ reply: string; human: string | null; brief: string | null } | null> {
  for (const model of MODELS) {
    try {
      const r = (await ai.run(model, { messages, max_tokens: 400, temperature: 0.4, chat_template_kwargs: { enable_thinking: false } })) as Record<string, any>;
      const t = (typeof r?.response === 'string' ? r.response : r?.choices?.[0]?.message?.content || '').trim();
      if (!t) continue;
      const j = json<{ reply?: unknown; human?: unknown; brief?: unknown }>(t);
      const reply = (typeof j?.reply === 'string' ? j.reply : j ? '' : t).replace(/\*\*/g, '').trim();
      if (!reply) continue;
      const str = (v: unknown) => (typeof v === 'string' && v.trim() && v.trim().toLowerCase() !== 'null' ? v.trim().slice(0, 300) : null);
      return { reply: reply.slice(0, 2000), human: str(j?.human), brief: str(j?.brief) };
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
  const out = await run(ai, [{ role: 'system', content: system(l) }, ...merged]);
  if (!out) return false;
  await addMessage(db, leadId, 'ai', 'text', out.reply);
  if (out.brief) {
    const brief = `${l.brief ? l.brief + '\n' : ''}• ${out.brief}`.slice(-3000);
    await db.prepare(`UPDATE leads SET brief = ?, updated_at = datetime('now') WHERE id = ?`).bind(brief, leadId).run();
  }
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

/** Hourly: one gentle follow-up after 48 h of client silence before payment; check-ins 7 and 30 days after delivery. */
export async function aiFollowups(db: DB, ai: AiBinding | undefined, notify: Notify) {
  if (!ai) return;
  const { results } = await db
    .prepare(
      `SELECT d.id, d.status, d.stage, d.followups, (SELECT MAX(at) FROM messages m WHERE m.lead_id = d.id AND m.kind != 'note') AS last_at,
              (SELECT sender FROM messages m WHERE m.lead_id = d.id AND m.kind != 'note' ORDER BY id DESC LIMIT 1) AS last_sender,
              (SELECT MAX(at) FROM lead_events e WHERE e.lead_id = d.id AND e.kind = 'status' AND e.text LIKE 'stage: delivered%') AS delivered_at
       FROM leads d WHERE d.ai = 'on' AND d.status NOT IN ('lost', 'archived', 'collab') AND d.followups < 3 ORDER BY d.id DESC LIMIT 40`,
    )
    .all<{ id: number; status: string; stage: string | null; followups: number; last_at: string | null; last_sender: string | null; delivered_at: string | null }>();
  const ago = (iso: string | null) => (iso ? (Date.now() - Date.parse(iso.replace(' ', 'T') + 'Z')) / 864e5 : 0);
  for (const r of results) {
    let nudge = '';
    if (r.stage === 'delivered' && r.delivered_at) {
      const d = ago(r.delivered_at);
      if (r.followups < 2 && d >= 7 && ago(r.last_at) >= 5) nudge = 'It has been a week since delivery. Ask how it works for them and whether anything needs fixing. Ask for a short review if they are happy.';
      else if (r.followups < 3 && d >= 30 && ago(r.last_at) >= 14) nudge = 'A month since delivery. Ask about results and suggest the one most useful next step for their goal, with its price range.';
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
    await db.prepare(`UPDATE leads SET stage = ?, stage_due = ?, followups = 0, updated_at = datetime('now') WHERE id = ?`).bind(b.stage, due, leadId).run();
    await logEvent(db, leadId, actor, 'status', `stage: ${b.stage}${due ? ' until ' + due : ''}`);
    if (b.stage !== 'qa') await addMessage(db, leadId, 'system', 'text', `stage:${b.stage}${due ? ':' + due : ''}`);
  }
}
