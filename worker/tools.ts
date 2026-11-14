// Execution engine (Decision 38): a wish in words becomes a working tool (calculator, checklist or tracker).
// The model only fills a spec; worker/toolcore.ts validates it and the page draws it. Tools live in the chat as a
// [[TOOL:{...}]] marker inside a message, so no new table is needed and the cabinet lists them from the messages.
import type { AiBinding } from './chat.js';
import { json as parse } from './autopilot.js';
import { sanitizeTool, type ToolSpec } from './toolcore.js';

const MODELS = ['@cf/google/gemma-4-26b-a4b-it', '@cf/meta/llama-3.1-8b-instruct-fp8-fast'];
const LANGS: Record<string, string> = { en: 'English', ru: 'Russian', ua: 'Ukrainian' };

// Cheap filter so the second model call runs only when a tool can help. Matches the common wishes in EN/RU/UA/ES/DE.
export const WANTS_TOOL = /track|monitor|следить|отслеж|стежити|відстеж|дневник|щоденник|calculat|checklist|budget|planner|\bplan\b|schedule|habit|routine|funnel|roadmap|compute|\bhow much\b|трекер|калькул|посчита|рассчита|розрах|порахуй|чек-?лист|бюджет|планер|планиров|планув|план[ауеы]?(?![а-яёіїєґ])|\d+\s*-?\s*(дн|ден|day)|окупаем|окупн|payback|break-?even|бизнес-план|бізнес-план|business plan|финмодел|фінмодел|financial model|юнит-эконом|юніт-економ|unit economics|маржинальн|рентабельн|\broi\b|расписан|розклад|привыч|звичк|рутин|воронк|калори|кбжу|бжу|диет|дієт|питани|харчув|тренир|тренув|выучить|вивчити|учить|сколько|скільки|presupuesto|calcula|rutina|lista|horario|kalkul|budget|gewohnheit/i;

const TRACK = /track|monitor|следить|отслеж|стежити|відстеж|вести\s+(учёт|дневник)/i;

const PROMPT = (L: string) => `You turn a person's wish into ONE small working tool. Reply with JSON only, no markdown. All text in ${L} (or the language of the wish).
Choose the kind that is most useful:
1) calculator: {"kind":"calc","title":"...","fields":[{"id":"w","label":"Weight","unit":"kg","value":75}],"outputs":[{"label":"Water a day","unit":"l","f":"round(w*0.033,1)"}],"note":"..."}
   Field ids are short latin names. Formulas may use + - * / ^ ( ) and min max abs sqrt floor ceil round(x,digits), and ONLY field ids. No text inside formulas. Give realistic default values. 2-12 fields, 1-8 outputs. A financial model, unit economics or a budget is a calculator: every amount the person named becomes a field with that value (revenue, ad spend, team, other costs, tax %), and the outputs are the results (profit before tax, tax, net profit, margin %, payback or break-even).
2) checklist: {"kind":"list","title":"...","items":["concrete step","..."],"note":"..."} 4-12 short, concrete, ordered steps. A program over a number of days (up to 31: a 30-day plan, a training or recovery protocol, a course) is a checklist with exactly one item per day: "Day 1: ...", "Day 2: ..." (in the language of the wish), each a concrete action for that day.
3) tracker for something measured over time: {"kind":"tracker","title":"...","metric":"Weight","unit":"kg","target":70,"note":"..."} target may be null.
Choosing: words like track, follow, log, monitor, keep an eye on (следить, вести, отслеживать, стежити) over time mean a tracker, never a checklist. A wish to count or compare means a calculator. Steps to do once mean a checklist.
If no tool would help, reply {"kind":"none"}: small talk, a question with one factual answer (how long to boil an egg, what is the capital of France), a medical treatment question, a request for a website, app or anything big. A day-by-day program is never "none": it is a checklist.
Money: use $ unless the person named a currency; never rubles. A formula must be mathematically correct: compound growth of a monthly deposit p at yearly rate r over n months is p*((1+r/1200)^n-1)/(r/1200).
Facts only: well-established formulas and evidence-based guidance; name the formula or rule in "note" in one short line. On health say it is a guide, not medical advice. Never invent statistics. Never promise results.`;

export async function buildTool(ai: AiBinding | undefined, wish: string, lang: string): Promise<ToolSpec | null> {
  if (!ai || !wish.trim()) return null;
  for (const model of MODELS) {
    try {
      const r = (await ai.run(model, {
        messages: [{ role: 'system', content: PROMPT(LANGS[lang] ?? 'English') }, { role: 'user', content: wish.slice(0, 500) + (TRACK.test(wish) ? '\n(Make a tracker.)' : '') }],
        max_tokens: /(\d{2})\s*-?\s*(дн|ден|day)/i.test(wish) ? 2000 : 900, temperature: 0.2, chat_template_kwargs: { enable_thinking: false },
      })) as Record<string, any>;
      const t = (typeof r?.response === 'string' ? r.response : r?.choices?.[0]?.message?.content || '').trim();
      if (!t) continue;
      const j = parse<Record<string, unknown>>(t);
      if (j?.kind === 'none') return null;
      const spec = sanitizeTool(j);
      if (spec) return spec;
    } catch (e) { console.error('[tool]', model, e); }
  }
  return null;
}

// The answer is written in parallel with the tool, so it cannot know the tool is ready: drop its "I can build..." offer,
// and any stock tail about memory (it came out in the wrong language and promised more than the site chat keeps).
const OFFER = /^\W*(я\s+(также\s+|ще\s+|теж\s+)?(могу|можу)|могу\s|можу\s|хотите|хочешь|хочете|хочеш|i\s+can\b|want\s+me\b|would\s+you\s+like\b|puedo\b|ich\s+kann\b)/i;
const TAIL = /^\W*vax\s+(can|может|може|puede|kann)\b/i;
// The same for "to calculate this I need your weight...": the tool under the answer already has those fields.
const NEEDS = /^\W*(чтобы\s+я|чтобы\s+точно|для\s+точного|мне\s+нужн|щоб\s+я|щоб\s+точно|для\s+точного|мені\s+потрібн|to\s+(give|calculate|make|do)\b|i\s+need\b|please\s+(tell|share|give))/i;
// Small models sometimes write LaTeX arrows and signs ($\rightarrow$) in plain chat text.
const TEX: Record<string, string> = { rightarrow: '→', to: '→', leftarrow: '←', Rightarrow: '⇒', times: '×', approx: '≈', le: '≤', ge: '≥', pm: '±', cdot: '·' };
export function tidyReply(reply: string, hasTool: boolean): string {
  return reply.replace(/\$\s*\\(rightarrow|to|leftarrow|Rightarrow|times|approx|le|ge|pm|cdot)\s*\$/g, (_m, k) => TEX[k]).replace(/\[+\s*TOOL\b[^\]]*\]+/gi, '').replace(/\[+\s*(canvas|холст|полотно|tool|calculator|калькулятор|doc)[^\]\n]*\]*/gi, '').split(/\n+/).map((p) => p.trim()).filter((p) => p && !TAIL.test(p) && !(hasTool && (OFFER.test(p) || NEEDS.test(p)))).join('\n\n');
}
export const READY: Record<string, string> = { en: 'Ready: enter your numbers below.', ru: 'Готово: введите свои данные ниже.', ua: 'Готово: введіть свої дані нижче.' };

export const toolMarker = (t: ToolSpec) => `[[TOOL:${JSON.stringify(t)}]]`;

const TOOL_RE = /\[\[TOOL:(\{[\s\S]*?\})\]\]/;
const LIST_RE = /\[\[LIST:\s*([^|\]]+)\|([\s\S]*?)\]\]/;
const CONFIRM_RE = /\[\[CONFIRM:\s*([\s\S]*?)\]\]/;

/** The site chat has no cards: a [[LIST]] becomes a tool, a [[CONFIRM]] stays as a plain sentence. */
export function pullList(reply: string): { reply: string; tool: ToolSpec | null } {
  const m = reply.match(LIST_RE);
  const tool = m ? sanitizeTool({ kind: 'list', title: m[1], items: m[2].split(';') }) : null;
  return { reply: reply.replace(LIST_RE, '').replace(CONFIRM_RE, '$1').trim(), tool };
}

const CHECK_LINE = /^\s*(?:[-*•]\s*)?\[\s?[xх ]?\s?\]\s*(.+)$/i;
/** A reply that wrote a checklist by hand ("- [ ] ...", or a made-up <canvas> tag) becomes a real checklist on the Canvas. */
export function pullChecklist(reply: string, title: string): { reply: string; tool: ToolSpec | null } {
  const lines = reply.split('\n');
  const items = lines.map((l) => l.match(CHECK_LINE)?.[1]?.trim()).filter((x): x is string => !!x);
  const head = reply.match(/<canvas[^>]*title=["']([^"']{2,70})["']/i)?.[1];
  const clean = reply.replace(/<\/?canvas[^>]*>/gi, '');
  if (items.length < 3) return { reply: clean, tool: null };
  const tool = sanitizeTool({ kind: 'list', title: head || title, items });
  return { reply: tool ? clean.split('\n').filter((l) => !CHECK_LINE.test(l)).join('\n').replace(/\n{3,}/g, '\n\n').trim() : clean, tool };
}

/** Plain text of a message for places without cards: Telegram, email and the model's own history. */
export function plainText(text: string): string {
  return text
    .replace(TOOL_RE, (_, j) => { try { return `(${JSON.parse(j).title} — vaxogroup.com/app/)`; } catch { return ''; } })
    .replace(LIST_RE, (_, t, items) => `${t.trim()}:\n${items.split(';').map((x: string) => '• ' + x.trim()).filter((x: string) => x.length > 2).join('\n')}`)
    .replace(CONFIRM_RE, '$1')
    .trim();
}

export function toolsIn(text: string): ToolSpec | null {
  const m = text.match(TOOL_RE);
  if (!m) return null;
  try { return sanitizeTool(JSON.parse(m[1])); } catch { return null; }
}
