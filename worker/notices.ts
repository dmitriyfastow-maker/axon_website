// Terms-change notices (Terms § "Changes to these terms"): one letter + one chat message to every client with an
// active order or a cabinet, at least 14 days before the new version takes effect. Run from the HQ (Autopilot).
import type { DB } from './partner.js';
import { addMessage } from './rooms.js';
import { mailReady, sendMail } from './mail.js';

type Lang = 'en' | 'ru' | 'ua';
const LANGS: Lang[] = ['en', 'ru', 'ua'];
const TERMS: Record<Lang, string> = { en: 'https://vaxogroup.com/terms/', ru: 'https://vaxogroup.com/ru/terms/', ua: 'https://vaxogroup.com/ua/terms/' };
const SUBJECT: Record<Lang, string> = { en: 'Vaxo: our terms are changing', ru: 'Vaxo: меняются наши условия', ua: 'Vaxo: змінюються наші умови' };
const BODY: Record<Lang, (what: string, date: string) => string> = {
  en: (w, d) => `Hi! We are updating our Terms of Service. From ${d}:\n\n${w}\n\nYour current orders keep the terms that applied when you confirmed the brief. If you do not agree, you can stop using our services before ${d} — just tell us in your chat. Full text: ${TERMS.en}`,
  ru: (w, d) => `Здравствуйте! Мы обновляем условия работы. С ${d}:\n\n${w}\n\nВаши текущие заказы идут по условиям на дату подтверждения брифа. Если вы не согласны, до ${d} можно прекратить пользоваться услугами — просто напишите в чат. Полный текст: ${TERMS.ru}`,
  ua: (w, d) => `Вітаємо! Ми оновлюємо умови роботи. З ${d}:\n\n${w}\n\nВаші поточні замовлення йдуть за умовами на дату підтвердження брифу. Якщо ви не згодні, до ${d} можна припинити користуватися послугами — просто напишіть у чат. Повний текст: ${TERMS.ua}`,
};
const s = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const lang = (v: string | null): Lang => (LANGS.includes(v as Lang) ? (v as Lang) : 'en');

/** POST body: { what: {en, ru?, ua?}, effective: 'YYYY-MM-DD', send?: true }. Without send it only counts recipients. */
export async function termsNotice(db: DB, b: Record<string, unknown>) {
  const w = (b.what ?? {}) as Record<string, unknown>;
  const what: Record<Lang, string> = { en: s(w.en, 2000), ru: s(w.ru, 2000) || s(w.en, 2000), ua: s(w.ua, 2000) || s(w.en, 2000) };
  const effective = s(b.effective, 10);
  const days = (Date.parse(effective) - Date.now()) / 86400000;
  if (!what.en || !/^\d{4}-\d{2}-\d{2}$/.test(effective)) return { ok: false, error: 'what.en and effective (YYYY-MM-DD) are required' };
  if (!(days >= 14)) return { ok: false, error: 'effective date must be at least 14 days from today' };
  // Active orders: brief confirmed (the contract) and not delivered yet, or open deals; plus everyone with a cabinet.
  const leads = (await db.prepare(
    `SELECT id, lang, email_addr FROM leads WHERE room IS NOT NULL AND contact NOT LIKE 'test%'
       AND (status IN ('proposal', 'won') OR (brief_confirmed_at IS NOT NULL AND COALESCE(stage, '') != 'delivered'))`,
  ).all<{ id: number; lang: string | null; email_addr: string | null }>()).results ?? [];
  const clients = (await db.prepare('SELECT email, lang FROM clients WHERE email IS NOT NULL').all<{ email: string; lang: string | null }>()).results ?? [];
  const covered = new Set(leads.map((l) => (l.email_addr ?? '').toLowerCase()).filter(Boolean));
  const mailOnly = clients.filter((c) => !covered.has(c.email.toLowerCase()));
  const plan = { chats: leads.length, letters: covered.size + mailOnly.length, mail: mailReady() };
  if (b.send !== true) return { ok: true, dry: true, ...plan };
  let sent = 0;
  for (const l of leads) {
    // A chat message is relayed by email (and Telegram) automatically when the lead has those channels.
    await addMessage(db, l.id, 'owner', 'text', BODY[lang(l.lang)](what[lang(l.lang)], effective));
  }
  for (const c of mailOnly) {
    const L = lang(c.lang);
    if (await sendMail(c.email, SUBJECT[L], BODY[L](what[L], effective))) sent++;
  }
  await db.prepare("INSERT INTO settings (key, value) VALUES ('terms_notice_last', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .bind(JSON.stringify({ at: new Date().toISOString(), effective, chats: leads.length, letters: sent + covered.size })).run();
  return { ok: true, ...plan, letters_sent: sent + covered.size };
}
