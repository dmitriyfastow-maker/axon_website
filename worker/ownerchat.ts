// Owner ↔ Claude in the HQ. The owner writes anything: a quick question gets an instant answer from Workers AI
// with a snapshot of the company; a task ("сделай", "добавь", "исправь"...) is queued for Claude Code, which reads
// the queue every session, does the work and replies here. Claude's ideas and questions to the owner land here too,
// each with "Да / Нет / Обсудить" buttons.
import type { DB } from './partner.js';
import type { AiBinding } from './chat.js';
import { askAi, settings } from './autopilot.js';
import type { Notify } from './deals.js';

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const TASK = /^(сделай|добавь|исправь|измени|убери|создай|напиши|подготовь|проверь|запусти|настрой|переделай|сделать|нужно|надо|давай|make|add|fix|change|remove|create|write|prepare|check)\b/i;

async function snapshot(db: DB): Promise<string> {
  const q = async (sql: string) => (await db.prepare(sql).first<{ n: number }>())?.n ?? 0;
  const by = (await db.prepare(`SELECT status, COUNT(*) AS n FROM leads WHERE COALESCE(page,'') != 'test' GROUP BY status`).all<{ status: string; n: number }>()).results;
  const recent = (await db.prepare(`SELECT id, name, status, COALESCE(service, interest, '') AS what, human FROM leads WHERE COALESCE(page,'') != 'test' AND status NOT IN ('archived','lost') ORDER BY updated_at DESC LIMIT 8`).all<Record<string, unknown>>()).results;
  const income = await q(`SELECT COALESCE(SUM(amount_uah),0) AS n FROM payments WHERE status='ok' AND at >= date('now','start of year')`);
  const views = await q(`SELECT COUNT(*) AS n FROM pageviews WHERE at > datetime('now','-7 days')`);
  const tasks = (await db.prepare(`SELECT text FROM owner_chat WHERE kind='task' AND status='open' ORDER BY id DESC LIMIT 5`).all<{ text: string }>()).results;
  return `Leads by status: ${by.map((r) => `${r.status} ${r.n}`).join(', ') || 'none'}. Income this year: ${Math.round(income)} UAH. Site views last 7 days: ${views}.
Recent clients: ${recent.map((r) => `#${r.id} ${r.name} (${r.status}${r.what ? ', ' + r.what : ''}${r.human ? ', needs owner: ' + r.human : ''})`).join('; ') || 'none'}.
Open tasks for Claude: ${tasks.map((t) => t.text.slice(0, 80)).join(' | ') || 'none'}.`;
}

export async function handleOwnerChat(db: DB, ai: AiBinding | undefined, request: Request, path: string, notify: Notify): Promise<Response> {
  if (request.method === 'GET' && path === '') {
    const { results } = await db.prepare('SELECT id, at, sender, kind, text, status FROM owner_chat ORDER BY id DESC LIMIT 80').all();
    return json(200, { ok: true, messages: results.reverse() });
  }
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const done = path.match(/^(\d+)\/(done|yes|no|discuss)$/);
  if (done && request.method === 'POST') {
    const id = Number(done[1]);
    const row = await db.prepare('SELECT kind, text FROM owner_chat WHERE id = ?').bind(id).first<{ kind: string; text: string }>();
    if (!row) return json(404, { ok: false });
    await db.prepare(`UPDATE owner_chat SET status = ? WHERE id = ?`).bind(done[2] === 'done' ? 'done' : 'answered', id).run();
    if (done[2] !== 'done') {
      const word = { yes: 'ДА', no: 'НЕТ', discuss: 'ОБСУДИТЬ' }[done[2] as 'yes'];
      await db.prepare(`INSERT INTO owner_chat (sender, kind, text) VALUES ('owner', 'task', ?)`).bind(`Ответ на «${row.text.slice(0, 120)}»: ${word}${typeof b.note === 'string' && b.note ? ' — ' + b.note.slice(0, 500) : ''}`).run();
    }
    return json(200, { ok: true });
  }
  if (path === '' && request.method === 'POST') {
    const text = typeof b.text === 'string' ? b.text.trim().slice(0, 3000) : '';
    if (!text) return json(400, { ok: false });
    const isTask = b.task === true || TASK.test(text);
    await db.prepare('INSERT INTO owner_chat (sender, kind, text) VALUES (?, ?, ?)').bind('owner', isTask ? 'task' : 'msg', text).run();
    let reply = '';
    if (isTask) reply = 'Записал задачу для Claude ✅ Она в очереди — Claude возьмёт её в ближайшей рабочей сессии и ответит здесь, что сделано.';
    else {
      const st = await settings(db);
      const history = (await db.prepare('SELECT sender, text FROM owner_chat ORDER BY id DESC LIMIT 10').all<{ sender: string; text: string }>()).results.reverse().map((m) => `${m.sender === 'owner' ? 'Owner' : 'Assistant'}: ${m.text.slice(0, 400)}`).join('\n');
      reply = (await askAi(ai, `You are the assistant of Dmitry, the owner of Vaxo (an AI-first digital studio: websites, apps, AI chats, ads, cartoon Vax & Roxy). Answer in Russian, simply and briefly (max 6 lines), like a sharp business partner. Use only the facts below; if you do not know, say so and suggest writing it as a task for Claude (start the message with "Сделай…"). Never invent numbers.
COMPANY NOW: ${await snapshot(db)}
Price mode for friends: ${st.price_owner === '0' ? 'off' : 'on'}. Friend codes: ${st.friend_codes || 'DIMA'}.
CHAT:
${history}`, 450)).trim() || 'Не получилось ответить сейчас. Напишите это задачей: «Сделай …» — Claude возьмёт её в работу.';
    }
    await db.prepare('INSERT INTO owner_chat (sender, kind, text) VALUES (?, ?, ?)').bind('ai', 'msg', reply).run();
    return json(200, { ok: true });
  }
  return json(404, { ok: false });
}

/** Claude Code (through D1) or the autopilot asks the owner something: shown in the HQ chat with buttons + Telegram. */
export async function askOwner(db: DB, notify: Notify, text: string, kind: 'idea' | 'question' = 'question') {
  await db.prepare('INSERT INTO owner_chat (sender, kind, text, notified) VALUES (?, ?, ?, 1)').bind('claude', kind, text.slice(0, 3000)).run();
  await notify(`${kind === 'idea' ? '💡 Идея' : '❓ Вопрос'} от Claude:\n${text.slice(0, 1500)}\n\nОтветить: Штаб → 🧠 Claude.`);
}

/** Hourly: Claude's new questions, ideas and messages (written by Claude Code sessions) go to the owner's Telegram. */
export async function notifyOwnerChat(db: DB, notify: Notify) {
  const { results } = await db.prepare(`SELECT id, kind, text FROM owner_chat WHERE sender = 'claude' AND notified = 0 ORDER BY id LIMIT 10`).all<{ id: number; kind: string; text: string }>();
  for (const r of results) {
    await notify(`${r.kind === 'idea' ? '💡 Идея от Claude' : r.kind === 'question' ? '❓ Вопрос от Claude' : '🧠 Claude'}:\n${r.text.slice(0, 1500)}\n\nОтветить: Штаб → 🧠 Claude (кнопки Да / Нет / Обсудить + комментарий).`);
    await db.prepare('UPDATE owner_chat SET notified = 1 WHERE id = ?').bind(r.id).run();
  }
}
