// Omnichannel, step 1: clients talk to Vaxo in Telegram. Same bot as the owner's notifications.
// Incoming messages land in the client's project chat (the same thread as the site room);
// every reply from Vax, the manager or the owner is relayed back to Telegram.
import type { DB } from './partner.js';
import { logEvent, type Notify } from './deals.js';
import { addMessage, newRoom } from './rooms.js';
import { settings } from './autopilot.js';

let token = '';
let ownerChat = '';
let botName = '';

export function configureTelegram(tok?: string, owner?: string) {
  token = tok?.trim() || '';
  ownerChat = owner?.trim() || '';
}

async function api(method: string, body: unknown): Promise<Record<string, any> | null> {
  if (!token) return null;
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }).catch(() => null);
  return r ? ((await r.json().catch(() => null)) as Record<string, any> | null) : null;
}

/** A message with buttons to the owner's chat (price decisions). False when Telegram is not set up. */
export async function ownerButtons(text: string, rows: { text: string; callback_data: string }[][]): Promise<boolean> {
  if (!token || !ownerChat) return false;
  const r = await api('sendMessage', { chat_id: ownerChat, text: text.slice(0, 4000), disable_web_page_preview: true, reply_markup: { inline_keyboard: rows } });
  return !!r?.ok;
}

/** Secret for the webhook header, derived from the bot token (no extra secret to set). */
async function secret(): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('vaxo-tg:' + token));
  return Array.from(new Uint8Array(h), (b) => b.toString(16).padStart(2, '0')).join('').slice(0, 48);
}

/** t.me link that binds the client's Telegram to their project chat. */
export async function botLink(room: string): Promise<string | null> {
  if (!token) return null;
  if (!botName) botName = (await api('getMe', {}))?.result?.username || '';
  return botName ? `https://t.me/${botName}?start=${room}` : null;
}

/** Once, on the production host: point the bot's webhook at /api/tg. */
export async function ensureWebhook(db: DB, origin: string) {
  if (!token) return;
  const st = await settings(db);
  const url = `${origin}/api/tg`;
  const mark = url + '#buttons';
  if (st.tg_webhook === mark) return;
  const r = await api('setWebhook', { url, secret_token: await secret(), allowed_updates: ['message', 'callback_query'] });
  if (r?.ok) await db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES ('tg_webhook', ?)`).bind(mark).run();
}

/** Called for every new message in a project chat: client-visible replies go to the client's Telegram. */
export async function relayToClient(db: DB, leadId: number, sender: string, text: string) {
  if (!token || sender === 'client' || sender === 'system') return;
  const l = await db
    .prepare(`SELECT d.tg_chat, p.name AS partner FROM leads d LEFT JOIN partners p ON ? = 'partner:' || p.id WHERE d.id = ?`)
    .bind(sender, leadId)
    .first<{ tg_chat: string | null; partner: string | null }>();
  if (!l?.tg_chat) return;
  const who = sender === 'ai' ? '' : sender === 'owner' ? 'Vaxo team:\n' : l.partner ? `${l.partner.trim().split(/\s+/)[0]} (Vaxo):\n` : '';
  await api('sendMessage', { chat_id: l.tg_chat, text: (who + text).slice(0, 4000), disable_web_page_preview: true });
}

const HI: Record<string, string> = {
  en: 'Connected! This chat is now linked to your Vaxo project. Write here any time — Vax answers in seconds, a human manager joins for calls.',
  ru: 'Подключено! Этот чат связан с вашим проектом в Vaxo. Пишите сюда в любое время — Vax отвечает за секунды, живой менеджер подключается на созвон.',
  ua: 'Підключено! Цей чат пов’язаний з вашим проєктом у Vaxo. Пишіть сюди будь-коли — Vax відповідає за секунди, живий менеджер підключається на дзвінок.',
};
const TEXT_ONLY: Record<string, string> = {
  en: 'For now I read text messages only — please describe it in words or send a link.',
  ru: 'Пока я читаю только текст — опишите словами или пришлите ссылку.',
  ua: 'Поки я читаю лише текст — опишіть словами або надішліть посилання.',
};
const langOf = (code?: string) => (code === 'uk' ? 'ua' : code === 'ru' ? 'ru' : 'en');

/** POST /api/tg — Telegram webhook. onClient(leadId, greet) asks Vax to answer. */
export async function handleTelegram(db: DB, request: Request, notify: Notify, onClient: (leadId: number, greet: boolean) => void, onDecision?: (leadId: number, choice: string) => Promise<unknown>): Promise<Response> {
  const ok = new Response('ok');
  if (!token || request.method !== 'POST' || request.headers.get('X-Telegram-Bot-Api-Secret-Token') !== (await secret())) return new Response('no', { status: 403 });
  const u = (await request.json().catch(() => ({}))) as Record<string, any>;
  // The owner pressed a price-decision button. Only the owner's chat may decide.
  const cq = u.callback_query;
  if (cq) {
    const from = String(cq.message?.chat?.id ?? '');
    const d = typeof cq.data === 'string' ? cq.data.match(/^of:(\d+):([arcn])$/) : null;
    if (!d || !ownerChat || from !== ownerChat || !onDecision) { await api('answerCallbackQuery', { callback_query_id: cq.id }); return ok; }
    const pending = await db.prepare(`SELECT human FROM leads WHERE id = ?`).bind(Number(d[1])).first<{ human: string | null }>();
    if (!pending?.human?.startsWith('Цена клиента')) {
      await api('answerCallbackQuery', { callback_query_id: cq.id, text: 'Уже решено' });
      return ok;
    }
    const label = { a: '✅ Приняли цену клиента', r: '💡 Предложили вашу цену', c: '✂️ Предложили урезанный вариант', n: '❌ Отказали' }[d[2] as 'a'];
    await api('answerCallbackQuery', { callback_query_id: cq.id, text: label });
    await api('editMessageReplyMarkup', { chat_id: from, message_id: cq.message?.message_id, reply_markup: { inline_keyboard: [[{ text: `${label} — Vax пишет клиенту`, callback_data: 'done' }]] } });
    await onDecision(Number(d[1]), d[2]);
    return ok;
  }
  const m = u.message;
  const chat = m?.chat?.id != null ? String(m.chat.id) : '';
  // Private chats with clients only; the owner's chat stays for notifications.
  if (!chat || m.chat.type !== 'private' || chat === ownerChat || m.from?.is_bot) return ok;
  const text = typeof m.text === 'string' ? m.text.trim().slice(0, 2000) : '';
  const lang = langOf(m.from?.language_code);

  // /start <room>: link this Telegram chat to an existing project chat.
  const start = text.match(/^\/start(?:\s+([a-f0-9]{24}))?$/);
  if (start?.[1]) {
    const lead = await db.prepare('SELECT id, lang FROM leads WHERE room = ?').bind(start[1]).first<{ id: number; lang: string | null }>();
    if (lead) {
      await db.prepare('UPDATE leads SET tg_chat = NULL WHERE tg_chat = ?').bind(chat).run();
      await db.prepare(`UPDATE leads SET tg_chat = ?, updated_at = datetime('now') WHERE id = ?`).bind(chat, lead.id).run();
      await logEvent(db, lead.id, 'system', 'note', 'Client connected Telegram');
      await api('sendMessage', { chat_id: chat, text: HI[lead.lang || ''] || HI[lang] });
      return ok;
    }
  }

  let lead = await db.prepare('SELECT id, name, ai, lang FROM leads WHERE tg_chat = ?').bind(chat).first<{ id: number; name: string; ai: string; lang: string | null }>();
  if (!lead) {
    // A new client wrote to the bot directly: a new lead with its own project chat.
    const name = [m.from?.first_name, m.from?.last_name].filter(Boolean).join(' ').slice(0, 100) || 'Telegram client';
    const contact = m.from?.username ? `@${m.from.username}` : `tg:${chat}`;
    const res = (await db
      .prepare('INSERT INTO leads (mode, name, contact, interest, message, lang, room, tg_chat) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind('telegram', name, contact, null, start ? null : text || null, lang, newRoom(), chat)
      .run()) as { meta?: { last_row_id?: number } };
    const id = res?.meta?.last_row_id;
    if (!id) return ok;
    lead = { id, name, ai: 'on', lang };
    await logEvent(db, id, 'system', 'note', 'Request received from Telegram');
    await notify(`🆕 #${id} ${name} (${contact}) написал в Telegram${text && !start ? `: ${text.slice(0, 300)}` : ''}`);
  }
  if (start) {
    onClient(lead.id, true);
    return ok;
  }
  if (!text) {
    await api('sendMessage', { chat_id: chat, text: TEXT_ONLY[lead.lang || ''] || TEXT_ONLY[lang] });
    return ok;
  }
  const recent = await db
    .prepare(`SELECT COUNT(*) AS n FROM messages WHERE lead_id = ? AND sender = 'client' AND at > datetime('now', '-1 hour')`)
    .bind(lead.id)
    .first<{ n: number }>();
  if ((recent?.n ?? 0) >= 40) return ok;
  await addMessage(db, lead.id, 'client', 'text', text);
  if (lead.ai === 'on') onClient(lead.id, false);
  else await notify(`💬 #${lead.id} ${lead.name} (Telegram): ${text.slice(0, 300)}`);
  return ok;
}
