// Vax chat: the site's own AI assistant (the same product we sell as the $249 "AI chat assistant").
// Runs on Workers AI's free daily allocation; on any model error the widget falls back to the contact form.

export interface AiBinding {
  run(model: string, input: Record<string, unknown>): Promise<unknown>;
}

const MODELS = ['@cf/google/gemma-4-26b-a4b-it', '@cf/meta/llama-3.1-8b-instruct-fp8-fast'];
const MAX_TURNS = 14;
const MAX_CHARS = 600;

const LANG_NAME: Record<string, string> = { en: 'English', ua: 'Ukrainian', ru: 'Russian' };

const FACTS = `
ABOUT VAXO (vaxogroup.com): a small AI & web studio for small businesses (bakeries, cleaners, salons, contractors, clinics, shops). We build websites, AI chat assistants, automations, ads funnels.
STARTER PACKAGES (one-time, delivered in 7 days, one round of edits): AI chat assistant for your website $249 (answers FAQ 24/7, collects leads, sends them to email/Telegram — exactly like this chat); one-page website $199 (mobile-first, contact form, click-to-call, basic Google setup); one automation $149 (website requests into a sheet/CRM, instant phone notifications, auto-reply). Page: /start/
NEXT STEPS: full website, lead funnel or ads from $800 (starter price credited if they continue within 30 days); support $50–$200/month.
BIG TIERS: Foundation $900–$1,300 (30–60 days), Growth $1,500–$2,400 (3–6 months), Scale $3,000–$5,500 (12 months).
SHOP (/shop/): 12 ready AI templates and kits for small business, $9–$12 each (e.g. Get Paid On Time Kit $9, Customer Review Request Kit $9, AI Prompt Pack $12, AI Chatbot FAQ Builder $12); all 12 in one bundle $67. Templates are in English.
FREE TOOLS (/tools/): calculators and a free "Business check-up with Vax".
PARTNER PROGRAM (/partners/, 18+ only): recommend Vaxo and earn 30% on agency services from clients you bring, 20% on warm leads we give you, +10% on every renewal for life, 50% on our templates, +10% of what your invited partners earn. Free training, AI toolkit, weekly payouts. Free sign-up.
REAL CASES: AiPro Partners, TrichoTech (see /#cases). Never invent other clients, numbers or guarantees.
CONTACT: the form on the site (#contact); we reply within 24 hours.`;

function systemPrompt(lang: string): string {
  const L = LANG_NAME[lang] ?? 'English';
  return `You are Vax, the friendly raccoon mascot and AI assistant of Vaxo. You live on the Vaxo website.
Personality: warm, funny, a bit cheeky, very short answers (1–3 sentences, max ~60 words). One light joke or raccoon touch at most per answer. No markdown headings, no long lists.
Always answer in ${L}, unless the visitor clearly writes in another language — then use theirs.
Goal: understand the visitor's business and problem in 1–2 questions, recommend ONE concrete next step from the facts below (usually a starter package, a $9 kit, a free tool, or the partner program), and when they show interest, ask for their name and contact (email, phone or @telegram) so a human from Vaxo follows up.
When the visitor wants to order, get a quote, talk to a human, or agrees to leave a contact, end your answer with the exact tag [FORM] (the site then shows a 2-field form). Do not ask for payment details, passwords or documents.
You are proof that the product works: if asked, say a chat like you costs $249 one-time for their website.
Use only these facts; if unsure, say a human will answer and add [FORM]. Never promise results, discounts or dates not listed here.
${FACTS}`;
}

type Msg = { role: 'user' | 'assistant'; content: string };

function clean(x: unknown): Msg[] | null {
  if (!Array.isArray(x) || !x.length) return null;
  const out: Msg[] = [];
  for (const m of x.slice(-MAX_TURNS)) {
    if (!m || typeof m !== 'object') return null;
    const { role, content } = m as Record<string, unknown>;
    if ((role !== 'user' && role !== 'assistant') || typeof content !== 'string') return null;
    out.push({ role, content: content.slice(0, MAX_CHARS) });
  }
  return out[out.length - 1].role === 'user' ? out : null;
}

function textOf(r: unknown): string {
  const o = r as Record<string, any>;
  if (typeof o?.response === 'string') return o.response;
  const c = o?.choices?.[0]?.message?.content;
  return typeof c === 'string' ? c : '';
}

export async function handleChat(ai: AiBinding | undefined, request: Request): Promise<Response> {
  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  if (request.method !== 'POST') return json(405, { ok: false });
  if (!ai) return json(503, { ok: false });
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json(400, { ok: false });
  }
  const messages = clean(body.messages);
  if (!messages) return json(400, { ok: false });
  const lang = typeof body.lang === 'string' && body.lang in LANG_NAME ? body.lang : 'en';
  const input = { messages: [{ role: 'system', content: systemPrompt(lang) }, ...messages], max_tokens: 220, temperature: 0.6 };
  for (const model of MODELS) {
    try {
      let reply = textOf(await ai.run(model, input)).trim();
      if (!reply) continue;
      const form = /\[FORM\]/i.test(reply);
      reply = reply.replace(/\[FORM\]/gi, '').replace(/\*\*/g, '').trim();
      return json(200, { ok: true, reply, form });
    } catch (err) {
      console.error('[chat]', model, err);
    }
  }
  return json(502, { ok: false });
}
