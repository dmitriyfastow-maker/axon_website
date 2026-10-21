// Finance screen shared by the HQ (owner, full) and /fin/ (FOP holder, read-only, no names).
type R = Record<string, any>;

const PART: R = { prepay: 'Предоплата', stage: 'Этап', final: 'Остаток', full: 'Полная оплата', support: 'Поддержка', micro: 'Микрозадача', strategy: 'Стратегия', product: 'Шаблон / набор', other: 'Другое' };
const CAT: R = { partner: 'Партнёру', owner: 'Владельцу', tax: 'Налог (ЕН + ВС)', esv: 'ЕСВ', service: 'Сервисы', ads: 'Реклама', refund: 'Возврат', bank: 'Комиссия банка', other: 'Другое' };
const MONTHS = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

const uah = (n: number) => `${Number(n || 0).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ₴`;
const money = (n: number, c: string) => `${Number(n).toLocaleString('ru-RU', { maximumFractionDigits: 2 })} ${c === 'UAH' ? '₴' : c === 'USD' ? '$' : '€'}`;

function el(tag: string, attrs: R = {}, ...kids: (Node | string | null | undefined | false)[]) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v; else if (k.startsWith('on')) (e as any)[k] = v; else if (v != null && v !== false) e.setAttribute(k, String(v));
  }
  for (const k of kids) if (k != null && k !== false) e.append(k);
  return e;
}

/** onCancel (owner only): mark a row cancelled. */
export function renderFinance(box: HTMLElement, d: R, full: boolean, onCancel?: (kind: 'payment' | 'expense', id: number) => void) {
  const t = d.taxes;
  const kpi = (label: string, value: string, note = '') => el('div', { class: 'fk' }, el('small', {}, label), el('b', {}, value), note ? el('span', {}, note) : null);
  const max = Math.max(1, ...d.byMonth.map((m: R) => Math.max(m.in, m.out)));
  const bars = el('div', { class: 'fbars', role: 'img', 'aria-label': 'Поступления и расходы по месяцам' },
    ...d.byMonth.map((m: R) => el('div', { class: 'fb', title: `${MONTHS[m.m - 1]}: пришло ${uah(m.in)}, ушло ${uah(m.out)}` },
      el('div', { class: 'fcol' }, el('i', { class: 'fin', style: `height:${(m.in / max) * 100}%` }), el('i', { class: 'fout', style: `height:${(m.out / max) * 100}%` })),
      el('small', {}, MONTHS[m.m - 1]))));
  const pRows = d.payments.map((p: R) => el('tr', { class: p.status !== 'ok' ? 'off' : '' },
    el('td', {}, p.at), el('td', {}, p.order), full ? el('td', {}, p.client || '—') : null,
    el('td', {}, PART[p.part] || p.part), el('td', { class: 'num' }, money(p.amount, p.currency)),
    el('td', { class: 'num' }, uah(p.amount_uah)), el('td', {}, p.status === 'ok' ? (p.source === 'bank' ? 'банк ✓' : 'отмечено') : p.status === 'refunded' ? 'возврат' : 'отменено'),
    full && onCancel && p.status === 'ok' ? el('td', {}, el('button', { class: 'ghost sm', type: 'button', onclick: () => onCancel('payment', p.id) }, 'Отменить')) : full ? el('td', {}) : null));
  const eRows = d.expenses.map((e: R) => el('tr', { class: e.status !== 'ok' ? 'off' : '' },
    el('td', {}, e.at), el('td', {}, CAT[e.category] || e.category), full ? el('td', {}, e.partner || e.note || '—') : el('td', {}, e.note || '—'),
    el('td', { class: 'num' }, money(e.amount, e.currency)), el('td', { class: 'num' }, uah(e.amount_uah)),
    full && onCancel && e.status === 'ok' ? el('td', {}, el('button', { class: 'ghost sm', type: 'button', onclick: () => onCancel('expense', e.id) }, 'Отменить')) : full ? el('td', {}) : null));
  const used = Math.min(100, (d.income / d.fop.limitUah) * 100);
  box.replaceChildren(
    el('div', { class: 'fkpis' },
      kpi('Пришло за год', uah(d.income)),
      kpi('Ушло за год', uah(d.out)),
      kpi('Налоги к уплате (5% + 1%)', uah(t.singleTax + t.militaryLevy), `оплачено налогов и ЕСВ: ${uah(t.paid)}`),
      kpi('ЕСВ', `${uah(t.esvMonth)} / мес`, `за год по сегодня: ${uah(t.esvYearToDate)}`),
      full ? kpi('Чистыми (оценка)', uah(d.profit), 'после налогов, ЕСВ и расходов') : null,
      kpi('Партнёрам к выплате', `$${d.partnersDueUsd}`)),
    el('p', { class: 'hint' }, `Ближайшие сроки за ${d.deadlines.quarter}: декларация до ${d.deadlines.declare}, оплата налога до ${d.deadlines.pay}. Ставки ${d.fop.year}: единый налог 5%, военный сбор 1%, ЕСВ ${uah(d.fop.esvMonth)} в месяц — сверьте с бухгалтером.`),
    el('div', { class: 'flimit' }, el('small', {}, `Лимит ФОП 3 группы на ${d.fop.year}: ${uah(d.fop.limitUah)} · осталось ${uah(d.limitLeft)}`), el('i', {}, el('u', { style: `width:${used}%` }))),
    el('h3', {}, 'По месяцам'), bars,
    el('p', { class: 'flegend' }, el('i', { class: 'fin' }), ' пришло ', el('i', { class: 'fout' }), ' ушло'),
    el('h3', {}, 'По кварталам'),
    el('div', { class: 'table' }, el('table', {}, el('thead', {}, el('tr', {}, el('th', {}, 'Квартал'), el('th', { class: 'num' }, 'Доход'), el('th', { class: 'num' }, 'Налог 5% + ВС 1%'))),
      el('tbody', {}, ...d.byQuarter.map((v: number, i: number) => el('tr', {}, el('td', {}, `Q${i + 1}`), el('td', { class: 'num' }, uah(v)), el('td', { class: 'num' }, uah(t.byQuarter[i]))))))),
    el('h3', {}, 'Поступления'),
    d.payments.length ? el('div', { class: 'table' }, el('table', {}, el('thead', {}, el('tr', {}, el('th', {}, 'Дата'), el('th', {}, 'Заказ'), full ? el('th', {}, 'Клиент') : null, el('th', {}, 'За что'), el('th', { class: 'num' }, 'Сумма'), el('th', { class: 'num' }, 'В гривне (НБУ)'), el('th', {}, 'Статус'), full ? el('th', {}) : null)), el('tbody', {}, ...pRows)))
      : el('p', { class: 'mut' }, 'Поступлений пока нет.'),
    el('h3', {}, 'Расходы и выплаты'),
    d.expenses.length ? el('div', { class: 'table' }, el('table', {}, el('thead', {}, el('tr', {}, el('th', {}, 'Дата'), el('th', {}, 'Куда'), el('th', {}, full ? 'Кому / заметка' : 'Заметка'), el('th', { class: 'num' }, 'Сумма'), el('th', { class: 'num' }, 'В гривне'), full ? el('th', {}) : null)), el('tbody', {}, ...eRows)))
      : el('p', { class: 'mut' }, 'Расходов пока нет.'),
  );
}

export const FIN_CSS = `
.fkpis { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 10px; margin: 8px 0 12px; }
.fk { background: var(--surf); border: 1px solid var(--line); border-radius: 14px; padding: 12px 14px; display: flex; flex-direction: column; gap: 2px; }
.fk small { color: var(--mut); font-size: 13px; } .fk b { font-size: 22px; } .fk span { color: var(--mut); font-size: 12px; }
.flimit { margin: 10px 0 18px; } .flimit small { color: var(--mut); } .flimit i { display: block; height: 8px; background: var(--line); border-radius: 99px; overflow: hidden; margin-top: 6px; } .flimit u { display: block; height: 100%; background: var(--acc); }
.fbars { display: grid; grid-template-columns: repeat(12, 1fr); gap: 6px; height: 160px; align-items: end; }
.fb { display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; } .fb small { color: var(--mut); font-size: 11px; }
.fcol { flex: 1; width: 100%; display: flex; gap: 2px; align-items: flex-end; justify-content: center; }
.fcol i { display: block; width: 40%; border-radius: 4px 4px 0 0; min-height: 1px; }
.fin { background: var(--acc); } .fout { background: var(--mut); opacity: 0.6; }
.flegend { color: var(--mut); font-size: 13px; } .flegend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; vertical-align: middle; }
td.num, th.num { text-align: right; white-space: nowrap; } tr.off td { opacity: 0.45; text-decoration: line-through; } tr.click { cursor: pointer; } tr.click:hover td { background: var(--surf); }
.fchat { display: flex; flex-direction: column; gap: 8px; margin: 12px 0; } .fm { max-width: 85%; padding: 9px 12px; border-radius: 14px; white-space: pre-wrap; line-height: 1.45; display: flex; flex-direction: column; gap: 3px; } .fm small { color: var(--mut); font-size: 11px; } .fm.c { align-self: flex-end; background: var(--acc); color: var(--dark-ink); } .fm.c small { color: rgba(0,0,0,.55); } .fm.v { align-self: flex-start; background: var(--surf); border: 1px solid var(--line); } pre.brief { white-space: pre-wrap; font: 14px var(--font); color: var(--mut); }
`;

const STATUS: R = { new: 'Новый', open: 'Ждёт менеджера', proposal: 'Предложение', won: 'Клиент', claimed: 'Ведёт менеджер', contacted: 'На связи', meeting: 'Был созвон', lost: 'Не состоялось', collab: 'Сотрудничество', gift: 'Подарок (ожидание)' };
const STAGE: R = { work: 'в работе', qa: 'проверка качества', review: 'у клиента на проверке', revisions: 'правки', delivered: 'сдано' };

/** FOP view extras: every active order (no chats, no contacts) and partner payouts. */
export function renderOrders(box: HTMLElement, orders: R[], payouts: R[], onOpen?: (id: number) => void) {
  box.replaceChildren(
    el('h3', {}, 'Клиенты и заказы'), el('p', { class: 'mut' }, 'Нажмите на клиента — откроется вся переписка с ним.'),
    orders.length ? el('div', { class: 'table' }, el('table', {}, el('thead', {}, el('tr', {}, el('th', {}, '№'), el('th', {}, 'Клиент'), el('th', {}, 'Что делаем'), el('th', {}, 'Статус'), el('th', {}, 'Готовность'), el('th', { class: 'num' }, 'Сумма сделки'), el('th', { class: 'num' }, 'Оплачено'))),
      el('tbody', {}, ...orders.map((o) => el('tr', { class: 'click', onclick: () => onOpen?.(o.id) }, el('td', {}, `#${o.id}`), el('td', {}, el('b', {}, o.client || '—'), o.contact ? el('div', { class: 'mut small' }, o.contact) : null), el('td', {}, o.service || o.interest || '—'),
        el('td', {}, (STATUS[o.status] || o.status) + (o.stage ? ` · ${STAGE[o.stage] || o.stage}` : '')),
        el('td', {}, o.progress != null ? `${o.progress}%${o.stage_due ? ` · до ${String(o.stage_due).slice(0, 10)}` : ''}` : '—'),
        el('td', { class: 'num' }, o.value_usd ? `$${o.value_usd}` : o.budget || '—'), el('td', { class: 'num' }, uah(o.paid_uah))))))) : el('p', { class: 'mut' }, 'Клиентов пока нет.'),
    el('h3', {}, 'Партнёрам (комиссии)'),
    payouts.length ? el('div', { class: 'table' }, el('table', {}, el('thead', {}, el('tr', {}, el('th', {}, 'Дата'), el('th', {}, 'Партнёр'), el('th', {}, 'Заказ'), el('th', {}, '%'), el('th', { class: 'num' }, 'Сумма'), el('th', {}, 'Статус'))),
      el('tbody', {}, ...payouts.map((p) => el('tr', {}, el('td', {}, String(p.created_at).slice(0, 10)), el('td', {}, p.partner || '—'), el('td', {}, `#${p.lead_id}`), el('td', {}, `${p.rate}%`), el('td', { class: 'num' }, `$${p.amount_usd}`), el('td', {}, p.status === 'paid' ? `выплачено ${String(p.paid_at || '').slice(0, 10)}` : p.status === 'due' ? 'к выплате' : 'отменено')))))) : el('p', { class: 'mut' }, 'Комиссий пока нет.'),
  );
}

/** One client's conversation, read-only (FOP view). */
export function renderChat(box: HTMLElement, d: R, onBack: () => void) {
  const l = d.lead;
  const who = (m: R) => m.sender === 'client' ? l.name : m.sender === 'ai' ? 'Vax (ИИ)' : m.sender === 'owner' ? 'Команда Vaxo' : m.partner_name ? `${m.partner_name} (менеджер)` : 'Система';
  box.replaceChildren(
    el('button', { class: 'ghost', type: 'button', onclick: onBack }, '← Ко всем клиентам'),
    el('h3', {}, `#${l.id} ${l.name}`),
    el('p', { class: 'mut' }, [l.contact, l.service || l.interest, STATUS[l.status] || l.status, l.progress != null ? `готовность ${l.progress}%` : '', l.value_usd ? `сделка $${l.value_usd}` : l.budget ? `бюджет ${l.budget}` : '', l.country].filter(Boolean).join(' · ')),
    l.brief ? el('details', {}, el('summary', {}, 'Что известно о задаче'), el('pre', { class: 'brief' }, l.brief)) : null,
    el('div', { class: 'fchat' }, ...(d.messages as R[]).filter((m) => !/^stage:/.test(m.text)).map((m) => el('div', { class: 'fm ' + (m.sender === 'client' ? 'c' : 'v') }, el('small', {}, `${who(m)} · ${String(m.at).slice(0, 16)}`), el('div', {}, m.text)))),
  );
  box.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
