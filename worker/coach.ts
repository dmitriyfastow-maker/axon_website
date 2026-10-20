// Partner AI coach: Vax answers partners in their cabinet — where to find clients, what to write, which offer fits,
// how commissions work. Honest selling only; 30 questions per partner per day so the free AI allocation lasts.
import type { DB } from './partner.js';
import { FACTS, type AiBinding } from './chat.js';
import { json as parse } from './autopilot.js';

const MODELS = ['@cf/google/gemma-4-26b-a4b-it', '@cf/meta/llama-3.1-8b-instruct-fp8-fast'];
export const COACH_DAILY = 20;
const HISTORY = 12;
const MAX_CHARS = 800;

const SYSTEM = `You are Vax, the AI coach of Vaxo's partner program. You help one partner (an adult who recommends Vaxo for commission) earn honestly.
Help with: where and how to find businesses that need our services (local businesses without a site, weak ads, no AI chat; niches; communities; their own network), what to write to a business owner (short personal messages, 3–6 sentences, with one real reason and their partner link placeholder {link}), how to answer objections, which Vaxo offer fits a business (start with the smallest: starter packages $149–249, then services), how commissions and payouts work, short-form video ideas, inviting other partners.
Teach, don't do everything: the partner has 20 questions a day, so make each answer reusable. When a task repeats (messages to many businesses, post ideas, objection answers, video captions), give a short READY PROMPT in a plain block that the partner pastes into their own AI — Claude (best), or free ChatGPT, Gemini or Copilot — with [brackets] for what they fill in, plus one line on how to use it. Point to the "AI prompts" tab in the cabinet for the full library. Answer questions about Vaxo, our offers, links, rates and payouts directly.
Stay on Vaxo work. For personal tasks unrelated to Vaxo (homework, other businesses, coding for themselves), say kindly that you only help with Vaxo work and suggest a free AI for it.
Rules you never break:
- Only real facts and the real cases AiPro Partners and TrichoTech. Never invent clients, numbers, guarantees or discounts.
- No spam: no mass email blasts or cold email lists (not allowed for now), no bots, no buying contacts, no fake reviews or fake accounts, no messaging minors, no bypassing ad-platform bans, no pressure or fake urgency. Personal, one-to-one messages only, and respect a "no".
- Never ask for or accept passwords, card numbers or documents. Payouts and personal questions about money disputes go to the team via the Payouts tab.
- If unsure about a term or price, say the team will confirm it.
Style: answer in the partner's language (default: {lang}), short and concrete (at most 8 lines), ready-to-copy texts in plain lines, no markdown headings.
Return plain text only.
FACTS:
${FACTS}`;

const LANG: Record<string, string> = { en: 'English', ua: 'Ukrainian', ru: 'Russian' };

async function usedToday(db: DB, partnerId: number): Promise<number> {
  const r = await db
    .prepare(`SELECT COUNT(*) AS n FROM coach_messages WHERE partner_id = ? AND role = 'user' AND created_at >= date('now')`)
    .bind(partnerId)
    .first<{ n: number }>();
  return r?.n ?? 0;
}

async function ask(ai: AiBinding, messages: { role: string; content: string }[]): Promise<string> {
  for (const model of MODELS) {
    try {
      const r = (await ai.run(model, { messages, max_tokens: 500, temperature: 0.5, chat_template_kwargs: { enable_thinking: false } })) as Record<string, any>;
      let t = (typeof r?.response === 'string' ? r.response : r?.choices?.[0]?.message?.content || '').trim();
      // Some models wrap the answer in JSON anyway.
      const j = t.startsWith('{') ? parse<{ reply?: string }>(t) : null;
      if (j?.reply) t = j.reply;
      t = t.replace(/\*\*/g, '').replace(/^#+\s*/gm, '').trim();
      if (t) return t.slice(0, 3000);
    } catch (err) {
      console.error('[coach]', model, err);
    }
  }
  return '';
}

const out = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

/** GET coach → history + questions left today; POST coach {message, lang} → Vax's answer. */
export async function handleCoach(db: DB, ai: AiBinding | undefined, request: Request, partnerId: number): Promise<Response> {
  if (request.method === 'GET') {
    const { results } = await db
      .prepare('SELECT role, text FROM (SELECT id, role, text FROM coach_messages WHERE partner_id = ? ORDER BY id DESC LIMIT 40) ORDER BY id')
      .bind(partnerId)
      .all<{ role: string; text: string }>();
    return out(200, { ok: true, messages: results, left: Math.max(0, COACH_DAILY - (await usedToday(db, partnerId))) });
  }
  if (request.method !== 'POST') return out(405, { ok: false });
  let b: Record<string, unknown> = {};
  try { b = (await request.json()) as Record<string, unknown>; } catch { /* empty body */ }
  const message = (typeof b.message === 'string' ? b.message : '').trim().slice(0, MAX_CHARS);
  if (!message) return out(400, { ok: false });
  const used = await usedToday(db, partnerId);
  if (used >= COACH_DAILY) return out(429, { ok: false, reason: 'limit', left: 0 });
  if (!ai) return out(503, { ok: false, reason: 'ai' });

  const { results: past } = await db
    .prepare('SELECT role, text FROM (SELECT id, role, text FROM coach_messages WHERE partner_id = ? ORDER BY id DESC LIMIT ?) ORDER BY id')
    .bind(partnerId, HISTORY)
    .all<{ role: string; text: string }>();
  const lang = LANG[typeof b.lang === 'string' ? b.lang : 'en'] ?? 'English';
  const reply = await ask(ai, [
    { role: 'system', content: SYSTEM.replace('{lang}', lang) },
    ...past.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.text })),
    { role: 'user', content: message },
  ]);
  if (!reply) return out(502, { ok: false, reason: 'ai' });
  await db.prepare('INSERT INTO coach_messages (partner_id, role, text) VALUES (?, ?, ?)').bind(partnerId, 'user', message).run();
  await db.prepare('INSERT INTO coach_messages (partner_id, role, text) VALUES (?, ?, ?)').bind(partnerId, 'assistant', reply).run();
  return out(200, { ok: true, reply, left: COACH_DAILY - used - 1 });
}
