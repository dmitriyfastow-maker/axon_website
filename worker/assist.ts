// Personal AI assistant in the HQ: each team member gets today's to-dos for their role (from live numbers)
// and can ask the AI what to do. GET /api/admin/assist → {tips}; POST {q} → {tips, text}.
import type { Me } from './staff.js';
import { ROLES } from './staff.js';
import { askAi } from './autopilot.js';
import type { AiBinding } from './chat.js';

type Pulse = Record<string, Record<string, any>>;
export type Tip = { icon: string; text: string; view: string };

const n = (x: unknown) => Number(x) || 0;
const pl = (k: number, one: string, few: string, many: string) => {
  const a = k % 10, b = k % 100;
  return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many;
};

/** Today's to-dos for this person: only from sections they can open, most urgent first. */
export function tipsFor(p: Pulse, me: Me): Tip[] {
  const can = (s: string) => me.sections.includes(s);
  const { leads = {}, money = {}, partners = {}, site = {}, work = {}, claude = {} } = p;
  const out: Tip[] = [];
  const add = (cond: boolean, icon: string, text: string, view: string) => { if (cond) out.push({ icon, text, view }); };
  add(can('chats') && n(leads.human) > 0, '🙋', `${n(leads.human)} ${pl(n(leads.human), 'клиент ждёт', 'клиента ждут', 'клиентов ждут')} живого человека — ответьте сами, ИИ уже подготовил контекст.`, 'chats');
  add(can('chats') && n(leads.late) > 0, '⏰', `${n(leads.late)} ${pl(n(leads.late), 'проект просрочен', 'проекта просрочены', 'проектов просрочены')} — сдвиньте срок или предупредите клиента.`, 'chats');
  add(can('leads') && n(leads.fresh) > 0, '🆕', `${n(leads.fresh)} ${pl(n(leads.fresh), 'новая заявка', 'новые заявки', 'новых заявок')} — ИИ-менеджер уже ответил, проверьте, кому нужен звонок.`, 'leads');
  add(can('chats') && n(leads.proposal) > 0, '📄', `${n(leads.proposal)} ${pl(n(leads.proposal), 'клиент думает', 'клиента думают', 'клиентов думают')} над предложением — мягко напомните о себе.`, 'chats');
  add(can('fin') && n(money.open_inv) > 0, '🧾', `${n(money.open_inv)} ${pl(n(money.open_inv), 'неоплаченный счёт', 'неоплаченных счёта', 'неоплаченных счетов')} — проверьте, не пора ли напомнить.`, 'fin');
  add(can('pay') && n(money.payouts_due) > 0, '💸', `${n(money.payouts_due)} ${pl(n(money.payouts_due), 'выплата ждёт', 'выплаты ждут', 'выплат ждут')} партнёрам.`, 'pay');
  add(can('work') && n(work.waiting) > 0, '✅', `${n(work.waiting)} ${pl(n(work.waiting), 'работа ждёт', 'работы ждут', 'работ ждут')} вашего «да» — откройте и одобрите или остановите.`, 'outbox');
  add(can('claude') && n(claude.questions) > 0, '🧠', `Claude ${pl(n(claude.questions), 'задал', 'задал', 'задал')} ${n(claude.questions)} ${pl(n(claude.questions), 'вопрос', 'вопроса', 'вопросов')} — ответ «да/нет» займёт минуту.`, 'claude');
  add(can('team') && n(partners.applied) > 0, '🤝', `${n(partners.applied)} ${pl(n(partners.applied), 'заявка', 'заявки', 'заявок')} в закрыватели — ИИ уже оценил, решите.`, 'team');
  add(can('stats') && n(site.views7) > 0, '📈', `За 7 дней: ${n(site.views7)} просмотров сайта, ${n(site.chats7)} открыли чат с Vax. Посмотрите, где люди уходят.`, 'stats');
  if (!out.length) out.push({ icon: '🌿', text: 'Срочного нет. Хорошее время улучшить то, что приносит клиентов: аналитика и план — в «Планы и прогноз».', view: can('plan') ? 'plan' : 'today' });
  return out.slice(0, 6);
}

export async function assistAnswer(ai: AiBinding | undefined, p: Pulse, me: Me, q: string): Promise<string> {
  const facts = JSON.stringify({ leads: p.leads, money: p.money, partners: p.partners, site: p.site, work: p.work, claude: p.claude });
  const role = ROLES[me.role]?.name || me.role;
  const prompt = `Ты — личный ИИ-помощник сотрудника студии Vaxo (сайты, приложения, CRM, реклама, контент с ИИ).
Сотрудник: ${me.name}, роль: ${role}. Он видит разделы: ${me.sections.join(', ')}.
Живые цифры бизнеса сейчас (JSON): ${facts}
Вопрос: ${q.slice(0, 500)}
Ответь по-русски, 2–5 коротких предложений: конкретно, что сделать и в каком разделе. Опирайся только на эти цифры, ничего не выдумывай. Если вопрос про деньги, цены или скидки — напомни, что решает владелец.`;
  return (await askAi(ai, prompt, 350)) || 'ИИ сейчас занят — попробуйте через минуту.';
}
