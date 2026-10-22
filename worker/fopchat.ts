// The FOP holder's assistant (vaxogroup.com/fin/): she can ask anything about her FOP, taxes, Vaxo's money, clients
// and how things work — any time, even when Dmitry is offline. The AI answers from live numbers and the rules below;
// anything only Dmitry can decide goes to him (HQ "🧠 Claude" + Telegram), and his answer appears in her chat.
import type { DB } from './partner.js';
import type { AiBinding } from './chat.js';
import { askAi, json as parseJson } from './autopilot.js';
import { financeView, FOP } from './finance.js';
import { filesForAi } from './files.js';
import type { Notify } from './deals.js';

const out = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const rules = () => `FOP 3rd group, Ukraine, ${FOP.year} (single tax payer, not a VAT payer):
- Single tax ${FOP.singleTax * 100}% of income + military levy ${FOP.militaryLevy * 100}% of income. ESV (social contribution) ${FOP.esvMonth} UAH per month for herself, even with no income.
- Income limit ${FOP.limitUah.toLocaleString('uk-UA')} UAH per year; above it — switch group (tell Dmitry well in advance).
- Declaration: quarterly, within 40 days after the quarter ends (in the Taxpayer's e-cabinet, cabinet.tax.gov.ua). Tax: paid within 50 days after the quarter. ESV: by the 20th of the month after each quarter. Approximate dates are on this page under "Сроки".
- Foreign currency income: counted in UAH at the NBU rate on the day the money arrives to the currency account; this page converts automatically.
- Payments allowed: bank transfer to the FOP account (UAH or currency), payment services. Card payments through a payment service usually need a software cash register (ПРРО) — check with an accountant before switching it on. Crypto cannot be accepted as FOP income.
- Keep: invoices/acts or the public offer (vaxogroup.com/terms/) as the basis for each payment; the CSV export on this page is for the accountant.
- KVED for this work: 62.01 (software), 62.02/62.09 (IT consulting), 73.11 (advertising), 63.12 (web portals), 74.10 (design). Every KVED must be added to the FOP before income from it.
VAXO: an AI-first digital studio of Dmitry (websites, apps, AI chats, ads, SMM, design, short videos, a cartoon with Vax the raccoon and Roxy the fox). Clients come through the site chat; Vax (AI manager) talks to them; prices are decided by Dmitry. Clients pay to her FOP; partners get commissions after the client pays (14-day rule). She sees all money, clients and chats here, read-only.
LIMITS: you are an AI, not a licensed accountant or lawyer — for anything with legal risk (checks from the tax office, large sums, contracts, blocked accounts, switching groups) say to confirm with an accountant and offer to pass it to Dmitry. Never invent numbers or dates you do not have.`;

async function context(db: DB): Promise<string> {
  const v = (await financeView(db, new Date().getUTCFullYear(), true)) as Record<string, any>;
  const orders = (await db.prepare(`SELECT id, name, COALESCE(service, interest, '') AS what, status, stage, progress, value_usd FROM leads WHERE status IN ('won','proposal','contacted','new') AND COALESCE(page,'') != 'test' ORDER BY updated_at DESC LIMIT 12`).all<Record<string, unknown>>()).results;
  return `MONEY THIS YEAR: income ${v.income} UAH, expenses ${v.out} UAH, profit after taxes ~${v.profit} UAH, limit left ${v.limitLeft} UAH.
Taxes so far: single tax ${v.taxes.singleTax}, military levy ${v.taxes.militaryLevy}, ESV to date ${v.taxes.esvYearToDate}, already paid ${v.taxes.paid} UAH. Partner commissions due: $${v.partnersDueUsd}.
Upcoming deadlines: ${JSON.stringify(v.deadlines).slice(0, 600)}
Last payments: ${(v.payments as any[]).slice(0, 8).map((p) => `${p.at} ${p.amount} ${p.currency} (${p.amount_uah} UAH) #${p.lead_id ?? '-'} ${p.client ?? ''}`).join('; ') || 'none yet'}.
Active clients: ${orders.map((o) => `#${o.id} ${o.name} — ${o.what} (${o.status}${o.stage ? ', ' + o.stage : ''}${o.progress != null ? ', ' + o.progress + '%' : ''}${o.value_usd ? ', $' + o.value_usd : ''})`).join('; ') || 'none yet'}.`;
}

/** GET /api/fin?chat=1 → her chat; POST /api/fin {ask} → instant answer (and a hand-over to Dmitry when needed). */
export async function handleFopChat(db: DB, ai: AiBinding | undefined, request: Request, notify: Notify): Promise<Response> {
  if (request.method === 'GET') {
    const { results } = await db.prepare('SELECT id, at, sender, text FROM fop_chat ORDER BY id DESC LIMIT 100').all();
    return out(200, { ok: true, messages: results.reverse() });
  }
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const text = typeof b.ask === 'string' ? b.ask.trim().slice(0, 4000) : '';
  if (!text) return out(400, { ok: false });
  const recent = await db.prepare(`SELECT COUNT(*) AS n FROM fop_chat WHERE sender = 'fop' AND at > datetime('now', '-1 day')`).first<{ n: number }>();
  if ((recent?.n ?? 0) >= 150) return out(429, { ok: false });
  await db.prepare(`INSERT INTO fop_chat (sender, text) VALUES ('fop', ?)`).bind(text).run();
  const history = (await db.prepare('SELECT sender, text FROM fop_chat ORDER BY id DESC LIMIT 12').all<{ sender: string; text: string }>()).results.reverse();
  const lines = await Promise.all(history.map(async (m) => `${m.sender === 'fop' ? 'Her' : m.sender === 'owner' ? 'Dmitry' : 'Assistant'}: ${(await filesForAi(db, m.text).catch(() => m.text)).slice(0, 700)}`));
  const raw = await askAi(ai, `You are the personal assistant of Dmitry's friend who holds the FOP (sole proprietor) through which Vaxo receives money. She is not technical. Answer in the language she writes in (Ukrainian or Russian), warmly, simply and briefly (max 8 short lines), step by step when she asks "how". Use only the facts below and the live numbers; if you do not know, say so honestly.
Set "owner" to a one-line question for Dmitry (in Russian) when: she asks about money that is not in the numbers, wants to change something, asks about her share/payment for the FOP, contracts, a problem with the bank or the tax office, anything personal between them, or you are not sure. Then tell her you passed it to Dmitry and he will answer here. Otherwise "owner" is null.
Return ONLY JSON: {"reply": "...", "owner": null}
${rules()}
${await context(db)}
CHAT:
${lines.join('\n')}`, 700);
  const j = parseJson<{ reply?: string; owner?: string | null }>(raw);
  const reply = (j?.reply || raw || '').toString().trim().slice(0, 3000) || 'Не получилось ответить прямо сейчас — я передал вопрос Дмитрию, он ответит здесь.';
  const toOwner = j?.owner ? String(j.owner).slice(0, 500) : !j && !raw ? text.slice(0, 500) : '';
  await db.prepare(`INSERT INTO fop_chat (sender, text) VALUES ('ai', ?)`).bind(reply).run();
  if (toOwner) {
    await db.prepare(`INSERT INTO owner_chat (sender, kind, text) VALUES ('ai', 'msg', ?)`).bind(`👩‍💼 Вопрос от подруги (ФОП): ${toOwner}\nЕё слова: «${text.slice(0, 300)}». Ответить: Штаб → 💰 Финансы → «Чат с ФОП».`).run();
    await notify(`👩‍💼 Подруга (ФОП) спрашивает: ${toOwner}\n«${text.slice(0, 300)}»\nОтветить: vaxogroup.com/admin/ → 💰 Финансы → Чат с ФОП`);
  }
  return out(200, { ok: true });
}

/** Owner side (HQ → Finance): read her chat and answer as Dmitry. */
export async function handleFopChatAdmin(db: DB, request: Request): Promise<Response> {
  if (request.method === 'GET') {
    const { results } = await db.prepare('SELECT id, at, sender, text FROM fop_chat ORDER BY id DESC LIMIT 100').all();
    return out(200, { ok: true, messages: results.reverse() });
  }
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const text = typeof b.text === 'string' ? b.text.trim().slice(0, 4000) : '';
  if (!text) return out(400, { ok: false });
  await db.prepare(`INSERT INTO fop_chat (sender, text) VALUES ('owner', ?)`).bind(text).run();
  return out(200, { ok: true });
}
