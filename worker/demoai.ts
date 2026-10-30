// Live AI for the reference demos (/examples/eco-*): smart search ("describe what you need") and the shop/clinic
// consultant. The page sends its own small catalog; the model picks items from it and answers in the visitor's language.
// Demo only: short inputs, a per-visitor hourly cap, nothing is stored.
import type { AiBinding } from './chat.js';
import { json as parse } from './autopilot.js';

const MODELS = ['@cf/google/gemma-4-26b-a4b-it', '@cf/meta/llama-3.1-8b-instruct-fp8-fast'];
const LANGS: Record<string, string> = { en: 'English', ru: 'Russian', ua: 'Ukrainian' };
const PER_HOUR = 40;
const hits = new Map<string, { n: number; at: number }>();

const out = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

type Item = { id: string; t: string };

/** POST /api/demo/ai {brand, role, items:[{id,t}], q, history?, lang, mode:'search'|'chat'} → {text, ids} */
export async function handleDemoAi(ai: AiBinding | undefined, request: Request): Promise<Response> {
  if (request.method !== 'POST' || !ai) return out(405, { ok: false });
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  const now = Date.now();
  const h = hits.get(ip);
  if (h && now - h.at < 3600_000) { if (++h.n > PER_HOUR) return out(429, { ok: false, error: 'limit' }); } else hits.set(ip, { n: 1, at: now });

  const b = (await request.json().catch(() => ({}))) as Record<string, any>;
  const q = String(b.q || '').trim().slice(0, 400);
  const items: Item[] = (Array.isArray(b.items) ? b.items : []).slice(0, 60).map((x: any) => ({ id: String(x.id).slice(0, 30), t: String(x.t).slice(0, 220) }));
  if (!q || !items.length) return out(400, { ok: false });
  const lang = LANGS[b.lang] ? b.lang : 'en';
  const brand = String(b.brand || 'the store').slice(0, 60);
  const role = String(b.role || 'a friendly shop assistant').slice(0, 200);
  const history = (Array.isArray(b.history) ? b.history : []).slice(-6).map((m: any) => ({ role: m.role === 'a' ? 'assistant' : 'user', content: String(m.text || '').slice(0, 500) }));
  const search = b.mode === 'search';

  const sys = `You are ${role} at "${brand}" (a demo website). Catalog, one per line as id | description:
${items.map((i) => `${i.id} | ${i.t}`).join('\n')}

Rules: answer in ${LANGS[lang]}. Only recommend items from the catalog, by id. Never invent items, prices, discounts or medical claims; for health concerns suggest a consultation.
${search ? 'The visitor typed a search request in their own words. Pick the 1-6 best matching items, best first. "text" is ONE short sentence (max 20 words) on why these fit.' : 'Talk like a warm, expert human consultant: 1-3 short sentences, ask one clarifying question when the need is unclear, suggest at most 3 items.'}
Reply ONLY with JSON: {"text": "...", "ids": ["id1", "id2"]}`;

  for (const model of MODELS) {
    try {
      const r = (await ai.run(model, { messages: [{ role: 'system', content: sys }, ...history, { role: 'user', content: q }], max_tokens: 300, temperature: 0.3, chat_template_kwargs: { enable_thinking: false } })) as Record<string, any>;
      const t = (typeof r?.response === 'string' ? r.response : r?.choices?.[0]?.message?.content || '').trim();
      const j = parse<{ text?: string; ids?: unknown[] }>(t);
      if (!j?.text) continue;
      const known = new Set(items.map((i) => i.id));
      const ids = (Array.isArray(j.ids) ? j.ids : []).map(String).filter((id) => known.has(id)).slice(0, 6);
      return out(200, { ok: true, text: String(j.text).replace(/\*\*/g, '').slice(0, 600), ids });
    } catch (err) {
      console.error('[demoai]', model, err);
    }
  }
  return out(502, { ok: false });
}
