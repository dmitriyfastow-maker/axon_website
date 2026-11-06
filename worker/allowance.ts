// Allowance (Decision 34): every plan has a daily and a weekly allowance of Vax replies in the client's private chat.
// Trial month (no paid invoice yet) = one third. Counted from the messages table (sender 'ai'), so no new table is needed.
// Caps are fair-use numbers, far below real cost; the client only ever sees words and bars, never numbers.
import type { DB } from './partner.js';

export const CAPS: Record<string, [number, number]> = { start: [20, 60], personal: [40, 160], care: [80, 400], growth: [200, 1000], pro: [500, 3000] };
const ORDER = ['start', 'personal', 'care', 'growth', 'pro'];

export interface Allowance { plan: string; trial: boolean; day: { used: number; cap: number }; week: { used: number; cap: number }; blocked: 'day' | 'week' | null }

export async function allowance(db: DB, leadIds: number[]): Promise<Allowance> {
  const ids = leadIds.length ? leadIds : [0];
  const q = ids.map(() => '?').join(',');
  let plan = 'start', trial = false;
  try {
    const rows = (await db.prepare(`SELECT plan FROM leads WHERE id IN (${q}) AND plan IS NOT NULL`).bind(...ids).all<{ plan: string }>()).results;
    plan = rows.map((r) => r.plan).filter((p) => ORDER.includes(p)).sort((a, b) => ORDER.indexOf(b) - ORDER.indexOf(a))[0] || 'start';
    if (plan !== 'start') trial = !(await db.prepare(`SELECT 1 FROM invoices WHERE lead_id IN (${q}) AND status = 'paid' LIMIT 1`).bind(...ids).first());
  } catch { /* before migration 0034 */ }
  const [cd, cw] = CAPS[plan];
  const k = trial ? 3 : 1;
  const count = async (mod: string) => (await db.prepare(`SELECT COUNT(*) AS n FROM messages WHERE lead_id IN (${q}) AND sender = 'ai' AND at > datetime('now', ?)`).bind(...ids, mod).first<{ n: number }>())?.n ?? 0;
  const day = { used: await count('-1 day'), cap: Math.max(5, Math.round(cd / k)) };
  const week = { used: await count('-7 days'), cap: Math.max(15, Math.round(cw / k)) };
  return { plan, trial, day, week, blocked: day.used >= day.cap ? 'day' : week.used >= week.cap ? 'week' : null };
}

export function limitText(lang: string | null, a: Allowance): string {
  const w = a.blocked === 'week';
  if (lang === 'ru') return `${w ? 'Недельный' : 'Дневной'} запас закончился — он ${w ? 'обновится в течение недели' : 'обновится завтра'}. Всё, что мы обсудили, сохранено. Если нужно продолжить сейчас: можно перейти на тариф выше в кабинете или написать «докупить» — команда пришлёт счёт на дополнительный запас, тариф менять не нужно.`;
  if (lang === 'ua') return `${w ? 'Тижневий' : 'Денний'} запас закінчився — він ${w ? 'оновиться протягом тижня' : 'оновиться завтра'}. Усе, що ми обговорили, збережено. Якщо потрібно продовжити зараз: можна перейти на вищий тариф у кабінеті або написати «докупити» — команда надішле рахунок на додатковий запас, тариф міняти не треба.`;
  return `Your ${w ? 'weekly' : 'daily'} allowance is used up — it ${w ? 'renews within the week' : 'renews tomorrow'}. Everything we discussed is saved. To continue right now you can move up a plan in your cabinet, or write “top up” — the team will send an invoice for extra allowance, no plan change needed.`;
}
