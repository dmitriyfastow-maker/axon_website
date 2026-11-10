// HQ → 💰 Деньги и партнёры → 📊 Экономика. Data: GET /api/admin/economics (worker/economics.ts).
// Live numbers, editable costs, the worst-case unit table and a 12-month forecast calculator (all client-side).
type R = Record<string, any>;
type Api = (path: string, body?: unknown) => Promise<R>;

const NAMES: R = { personal: 'Plus', care: 'Pro', growth: 'Max', pro: 'Ultra' };
const PLANS = ['personal', 'care', 'growth', 'pro'];
const usd = (n: number) => `${n < 0 ? '−' : ''}$${Math.abs(Number(n) || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
const usd0 = (n: number) => `${n < 0 ? '−' : ''}$${Math.round(Math.abs(Number(n) || 0)).toLocaleString('en-US')}`;
const REF_ST: R = { attributed: 'ждёт оплаты', pending: '14 дней', credited: 'начислен', applied: 'вычтен из счёта', cancelled: 'отменён', review: 'на проверке', rejected: 'отклонён' };

function el(tag: string, attrs: R = {}, ...kids: (Node | string | number | null | undefined | false)[]) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v; else if (k.startsWith('on')) (e as any)[k] = v; else if (v != null && v !== false) e.setAttribute(k, String(v));
  }
  for (const k of kids) if (k != null && k !== false) e.append(typeof k === 'number' ? String(k) : k);
  return e;
}
const kpi = (label: string, value: string, sub?: Node | string) => el('div', { class: 'kpi' }, el('small', {}, label), el('b', {}, value), sub ? el('span', {}, sub) : null);
const arrow = (now: number, before: number, goodUp: boolean) => {
  const d = now - before;
  if (!d) return el('span', { class: 'ec-ar' }, `= как в прошлом (${before})`);
  const good = goodUp ? d > 0 : d < 0;
  return el('span', { class: 'ec-ar ' + (good ? 'ok' : 'bad') }, `${d > 0 ? '▲' : '▼'} ${Math.abs(d)} к прошлому (${before})`);
};
const table = (head: string[], rows: (Node | string)[][], cls = '') =>
  el('div', { class: 'table' }, el('table', { class: cls }, el('thead', {}, el('tr', {}, ...head.map((h) => el('th', {}, h)))), el('tbody', {}, ...rows.map((r) => el('tr', {}, ...r.map((c) => el('td', {}, c)))))));
const money = (n: number) => el('span', { class: n < 0 ? 'ec-neg' : '' }, usd(n));

export function renderEcon(box: HTMLElement, d: R, api: Api, reload: () => void) {
  const st = d.settings || { cost: {}, fee: 4, churn: 5 };
  const parts: Node[] = [];
  parts.push(el('p', { class: 'hint' }, 'Экономика подписок простыми словами: сколько платящих клиентов, сколько денег каждый месяц (MRR), сколько уходит партнёрам и на сервисы, сколько остаётся. Себестоимость и комиссию можно поменять ниже — всё пересчитается.'));

  // Alerts
  const alerts = (d.alerts || []) as R[];
  if (alerts.length) parts.push(el('div', { class: 'ec-alerts' }, ...alerts.map((a) => el('div', { class: `ec-alert ${a.level}` }, a.level === 'r' ? '🔴 ' : a.level === 'y' ? '🟡 ' : '🟢 ', a.text))));

  // Live KPIs
  const f = d.flow || {};
  parts.push(el('div', { class: 'kpis' },
    kpi('Платящих клиентов', String(d.paying || 0), PLANS.map((p) => `${NAMES[p]} ${(d.plans || []).find((x: R) => x.plan === p)?.clients || 0}`).join(' · ')),
    kpi('MRR (в месяц)', usd0(d.mrr || 0), 'годовые считаются как 1/12'),
    kpi('ARPU (средний чек)', usd(d.arpu || 0), 'MRR ÷ платящие'),
    kpi('Новые в этом месяце', String(f.newThis || 0), arrow(f.newThis || 0, f.newLast || 0, true)),
    kpi('Ушли в этом месяце', String(f.churnThis || 0), arrow(f.churnThis || 0, f.churnLast || 0, false)),
    kpi('Отток в месяц', `${d.churn ?? st.churn}%`, d.realChurn == null ? 'из настроек (мало данных)' : 'по реальным данным'),
  ));
  const o = d.owed || {};
  const rs = d.referrals?.sum || {};
  parts.push(el('div', { class: 'kpis' },
    kpi('Должны партнёрам', usd0(o.total || 0), `50% первые ${usd0(o.first || 0)} · 30% дальше ${usd0(o.later || 0)} · 10% команда ${usd0(o.team || 0)}${o.manager ? ` · менеджеры ${usd0(o.manager)}` : ''}`),
    kpi('Бесплатные месяцы клиентам', `${rs.credited || 0} начислено`, `${usd0(rs.credited_usd || 0)} · ещё ${rs.pending || 0} ждут 14 дней (${usd0(rs.pending_usd || 0)})`),
    kpi('Пришли по приглашениям', String((rs.client || 0) + (rs.partner || 0)), `от клиентов ${rs.client || 0} · от партнёров ${rs.partner || 0}`),
  ));

  // Decisions with reasons (rule-based on the live ledger) and the dated trail
  const advice = (d.advice || []) as R[];
  if (advice.length) {
    parts.push(el('h3', {}, 'Что я решил и почему'));
    parts.push(el('p', { class: 'hint' }, 'Каждое решение: зачем, что делаю дальше и работает ли оно само. Хотите изменить или уточнить — напишите во вкладке «🧠 Claude», я отвечу с цифрами.'));
    parts.push(el('div', { class: 'ec-alerts' }, ...advice.map((a) => el('div', { class: `ec-alert ${a.level}` },
      el('b', {}, (a.level === 'r' ? '🔴 ' : a.level === 'y' ? '🟡 ' : '🟢 ') + a.title),
      el('div', {}, el('i', {}, 'Почему: '), a.why),
      el('div', {}, el('i', {}, 'Решение: '), a.decision),
      el('div', {}, el('i', {}, 'Дальше: '), a.next, a.auto ? ' ⚙️ работает само' : ' 👤 нужен вы')))));
  }
  const trail = (d.log || []) as R[];
  if (trail.length) {
    parts.push(el('h3', {}, 'Журнал решений'));
    parts.push(table(['Дата', 'Решение', 'Что решено', 'Почему'], trail.map((x) => [x.at, x.title, x.decision, x.why])));
  }

  // Margin per plan
  parts.push(el('h3', {}, 'Маржа и LTV по тарифам'));
  parts.push(table(['Тариф', 'Цена', 'Клиентов', 'MRR', 'Себестоимость', 'Комиссия оплаты', 'Маржа $', 'Маржа %', 'LTV без партнёра', 'LTV через партнёра'],
    ((d.plans || []) as R[]).map((p) => [NAMES[p.plan], usd(p.price), String(p.clients), usd0(p.mrr), usd(p.cost), usd(p.fee), money(p.margin), el('span', { class: p.marginPct < 40 ? 'ec-neg' : 'ec-pos' }, `${p.marginPct}%`), p.ltv == null ? '—' : usd0(p.ltv), p.ltvPartner == null ? '—' : usd0(p.ltvPartner)])));
  parts.push(el('p', { class: 'mut small' }, `LTV = сколько денег клиент приносит за всё время: маржа ÷ отток (${d.churn ?? st.churn}% в месяц → в среднем ${d.churn > 0 ? Math.round(100 / d.churn) : '∞'} мес.). Через партнёра — минус 50% в первый платный месяц, 30% дальше и 10% команде.`));

  // Settings
  const inp = (name: string, value: number, step = '0.5') => el('input', { type: 'number', name, value, step, min: '0' }) as HTMLInputElement;
  const msg = el('small', { class: 'mut' }, '');
  const form = el('form', { class: 'card ec-set' }, el('b', {}, '⚙️ Себестоимость одного клиента в месяц (сервисы, ИИ, хостинг)'),
    el('div', { class: 'ec-grid' }, ...PLANS.map((p) => el('label', {}, NAMES[p], inp(`cost_${p}`, st.cost?.[p] ?? 0))),
      el('label', {}, 'Комиссия оплаты, %', inp('fee', st.fee, '0.1')), el('label', {}, 'Отток по умолчанию, %/мес', inp('churn', st.churn, '0.5'))),
    el('div', { class: 'row' }, el('button', { class: 'cta' }, 'Сохранить'), el('button', { type: 'button', class: 'ghost', onclick: () => { for (const p of PLANS) (form.elements.namedItem(`cost_${p}`) as HTMLInputElement).value = String(d.defaults?.cost?.[p] ?? 0); (form.elements.namedItem('fee') as HTMLInputElement).value = String(d.defaults?.fee ?? 4); (form.elements.namedItem('churn') as HTMLInputElement).value = String(d.defaults?.churn ?? 5); } }, 'Вернуть по умолчанию'), msg)) as HTMLFormElement;
  form.onsubmit = async (e) => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(form)) as R;
    const r = await api('/economics', { cost: Object.fromEntries(PLANS.map((p) => [p, Number(v[`cost_${p}`])])), fee: Number(v.fee), churn: Number(v.churn) }).catch(() => null);
    msg.textContent = r?.ok ? 'Сохранено — пересчитываю.' : 'Не сохранилось (нужен доступ на запись).';
    if (r?.ok) reload();
  };
  parts.push(form);

  // Worst-case unit table
  parts.push(el('h3', {}, 'Худший случай: прибыль с одного клиента'));
  parts.push(el('p', { class: 'mut small' }, `Каждый клиент пришёл через партнёра, у которого есть наставник (50% первой оплаты + 10% команде, дальше 30% + 10%), или по приглашению клиента (пригласившему — бесплатный месяц до цены тарифа). «Месяц 1» — первый ПЛАТНЫЙ месяц; бесплатные месяцы друга (${d.friendMonths || 2}) стоят нам только себестоимость.`));
  parts.push(table(['Тариф', 'Цена', 'Себест.', 'Комиссия', 'Партнёр 50% (1-й)', 'Партнёр 30% (дальше)', 'Команда 10%', 'Бонус клиенту', `${d.friendMonths || 2} бесплатных мес.`, 'Мес. 1 через партнёра', 'Мес. 2+ через партнёра', 'Мес. 1 по приглашению клиента', 'Мес. 2+ без партнёра'],
    ((d.units || []) as R[]).map((u) => [NAMES[u.plan], usd(u.price), usd(u.cost), usd(u.fee), usd(u.partnerFirst), usd(u.partnerLater), usd(u.team), usd(u.credit), money(-u.freeCost), money(u.m1Partner), money(u.m2Partner), money(u.m1Client), money(u.m2Direct)]), 'ec-units'));

  // Referrals under review
  const rev = (d.referrals?.review || []) as R[];
  if (rev.length) {
    parts.push(el('h3', {}, '🔎 Приглашения на проверке'));
    parts.push(table(['Когда', 'Друг', 'Пригласил', 'Причина', 'Тариф', 'Бонус', ''], rev.map((r) => [String(r.at || '').slice(0, 10), `#${r.lead_id} ${r.friend || ''}`, r.inviter || `клиент #${r.referrer_client_id}`, r.reason || '', r.plan ? NAMES[r.plan] || r.plan : '?', r.credit_usd ? usd(r.credit_usd) : '—',
      el('span', { class: 'row' },
        el('button', { type: 'button', class: 'cta sm', onclick: async () => { await api(`/economics/referral/${r.id}`, { approve: true }); reload(); } }, '✓ Засчитать'),
        el('button', { type: 'button', class: 'ghost sm', onclick: async () => { if (confirm('Отклонить бонус за это приглашение?')) { await api(`/economics/referral/${r.id}`, { approve: false }); reload(); } } }, 'Отклонить'))])));
  }
  const recent = (d.referrals?.recent || []) as R[];
  if (recent.length) {
    parts.push(el('details', { class: 'card' }, el('summary', {}, `Последние приглашения (${recent.length})`),
      table(['Когда', 'Откуда', 'Друг', 'Статус', 'Тариф', 'Бонус', 'Причина'], recent.map((r) => [String(r.at || '').slice(0, 10), r.kind === 'client' ? 'клиент' : 'партнёр', `#${r.lead_id} ${r.friend || ''}`, REF_ST[r.status] || r.status, r.plan ? NAMES[r.plan] || r.plan : '—', r.credit_usd ? usd(r.credit_usd) : '—', r.reason || '']))));
  }

  // Forecast calculator
  parts.push(el('h3', {}, '🔮 Прогноз на 12 месяцев'));
  const fin = (name: string, value: number, label: string, step = '1') => el('label', {}, label, el('input', { type: 'number', name, value, step, min: '0' }));
  const fc = el('form', { class: 'card ec-set' },
    el('b', {}, 'Новых клиентов в месяц и откуда они'),
    el('div', { class: 'ec-grid' }, fin('n_personal', 3, 'Plus'), fin('n_care', 5, 'Pro'), fin('n_growth', 3, 'Max'), fin('n_pro', 1, 'Ultra'),
      fin('viaPartner', 50, '% через партнёров'), fin('viaClient', 15, '% по приглашению клиентов'), fin('churn', d.churn ?? st.churn ?? 5, 'Отток, %/мес', '0.5'), fin('growth', 0, 'Рост новых, %/мес', '1')),
    el('small', { class: 'mut' }, `Остальные — пришли сами (1 месяц бесплатно). Через партнёра и клиента — ${d.friendMonths || 2} месяца бесплатно. У партнёров считаем наставника (10%) всегда — худший случай.`)) as HTMLFormElement;
  const out = el('div', {});
  const calc = () => {
    const v = Object.fromEntries(new FormData(fc)) as R;
    out.replaceChildren(forecastView(d, st, v));
  };
  fc.oninput = calc;
  fc.onsubmit = (e) => { e.preventDefault(); calc(); };
  parts.push(fc, out);
  box.replaceChildren(...parts);
  calc();
}

/** Month-by-month cohort simulation. */
function forecastView(d: R, st: R, v: R): Node {
  const prices: R = d.prices || { personal: 19, care: 39, growth: 129, pro: 299 };
  const rates: R = d.rates || { agencyOwn: 50, agencyRenewal: 30, team: 10 };
  const free = { own: 1, ref: d.friendMonths || 2 };
  const pP = Math.min(100, Number(v.viaPartner) || 0) / 100, pC = Math.min(1 - pP, (Number(v.viaClient) || 0) / 100), pO = Math.max(0, 1 - pP - pC);
  const churn = Math.min(100, Number(v.churn) || 0) / 100, grow = (Number(v.growth) || 0) / 100;
  const fee = (Number(st.fee) || 0) / 100;
  // cohorts: plan, source, start month, count
  const cohorts: { plan: string; src: 'p' | 'c' | 'o'; start: number; n: number }[] = [];
  const rows: R[] = [];
  let cum = 0;
  for (let m = 0; m < 12; m++) {
    for (const p of PLANS) {
      const n = (Number(v[`n_${p}`]) || 0) * Math.pow(1 + grow, m);
      if (n > 0) for (const [src, share] of [['p', pP], ['c', pC], ['o', pO]] as const) if (share > 0) cohorts.push({ plan: p, src, start: m, n: n * share });
    }
    let rev = 0, pay = 0, cost = 0, credit = 0, clients = 0, paying = 0;
    for (const c of cohorts) {
      const age = m - c.start;
      if (age < 0) continue;
      const alive = c.n * Math.pow(1 - churn, age);
      const price = prices[c.plan], fm = c.src === 'o' ? free.own : free.ref;
      clients += alive;
      cost += alive * (Number(st.cost?.[c.plan]) || 0);
      if (age < fm) continue;
      paying += alive;
      rev += alive * price;
      if (c.src === 'p') pay += alive * price * ((age === fm ? rates.agencyOwn : rates.agencyRenewal) + rates.team) / 100;
      if (c.src === 'c' && age === fm) credit += alive * price; // worst case: the inviter's free month = full price
    }
    const fees = rev * fee;
    const profit = rev - pay - credit - cost - fees;
    cum += profit;
    rows.push({ m: m + 1, clients, paying, rev, pay, credit, cost: cost + fees, profit, cum });
  }
  const tot = rows.reduce((a, r) => ({ rev: a.rev + r.rev, pay: a.pay + r.pay, credit: a.credit + r.credit, cost: a.cost + r.cost, profit: a.profit + r.profit }), { rev: 0, pay: 0, credit: 0, cost: 0, profit: 0 });
  const wrap = el('div', {});
  wrap.append(el('div', { class: 'kpis' },
    kpi('Выручка за 12 мес.', usd0(tot.rev)), kpi('Партнёрам', usd0(tot.pay)), kpi('Бесплатные месяцы клиентам', usd0(tot.credit)), kpi('Себестоимость + комиссии', usd0(tot.cost)),
    kpi('Прибыль за 12 мес.', usd0(tot.profit)), kpi('MRR на 12-й месяц', usd0(rows[11].rev), `${Math.round(rows[11].paying)} платящих`)));
  wrap.append(chart(rows));
  wrap.append(table(['Мес.', 'Клиентов', 'Платящих', 'Выручка', 'Партнёрам', 'Бонусы клиентам', 'Расходы', 'Прибыль', 'Накопительно'],
    rows.map((r) => [String(r.m), String(Math.round(r.clients)), String(Math.round(r.paying)), usd0(r.rev), usd0(r.pay), usd0(r.credit), usd0(r.cost), money(Math.round(r.profit)), money(Math.round(r.cum))])));
  return wrap;
}

function chart(rows: R[]): Node {
  const W = 720, H = 220, P = 36;
  const series: [string, string, string][] = [['rev', 'Выручка', 'var(--ec-c1)'], ['pay', 'Партнёрам', 'var(--ec-c2)'], ['profit', 'Прибыль', 'var(--ec-c3)'], ['cum', 'Накопительно', 'var(--ec-c4)']];
  const vals = rows.flatMap((r) => series.map(([k]) => r[k] as number));
  const max = Math.max(1, ...vals), min = Math.min(0, ...vals);
  const x = (i: number) => P + (i * (W - P * 2)) / Math.max(1, rows.length - 1);
  const y = (n: number) => H - P - ((n - min) / (max - min || 1)) * (H - P * 2);
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'ec-chart'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Прогноз: выручка, выплаты, прибыль по месяцам');
  const add = (tag: string, a: R, text?: string) => { const e = document.createElementNS(ns, tag); for (const [k, v] of Object.entries(a)) e.setAttribute(k, String(v)); if (text) e.textContent = text; svg.append(e); return e; };
  add('line', { x1: P, x2: W - P, y1: y(0), y2: y(0), stroke: 'var(--line)', 'stroke-width': 1 });
  add('text', { x: 4, y: y(max) + 4, class: 'ec-ax' }, usd0(max));
  if (min < 0) add('text', { x: 4, y: y(min) + 4, class: 'ec-ax' }, usd0(min));
  add('text', { x: 4, y: y(0) + 4, class: 'ec-ax' }, '$0');
  rows.forEach((r, i) => add('text', { x: x(i), y: H - 10, 'text-anchor': 'middle', class: 'ec-ax' }, String(r.m)));
  for (const [k, , c] of series) add('polyline', { points: rows.map((r, i) => `${x(i)},${y(r[k])}`).join(' '), fill: 'none', stroke: c, 'stroke-width': 2.5, 'stroke-linejoin': 'round' });
  const legend = el('div', { class: 'ec-leg' }, ...series.map(([, n, c]) => el('span', {}, el('i', { style: `background:${c}` }), n)));
  return el('div', { class: 'card' }, legend, svg);
}

export const ECON_CSS = `
.adm { --ec-c1: #2563eb; --ec-c2: #d97706; --ec-c3: #059669; --ec-c4: #7c3aed; }
[data-theme="dark"] .adm { --ec-c1: #60a5fa; --ec-c2: #fbbf24; --ec-c3: #34d399; --ec-c4: #a78bfa; }
.adm .ec-alerts { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.adm .ec-alert { border: 1px solid var(--line); border-radius: 12px; padding: 10px 14px; background: var(--surf); }
.adm .ec-alert.r { border-left: 4px solid #dc2626; } .adm .ec-alert.y { border-left: 4px solid #d97706; } .adm .ec-alert.g { border-left: 4px solid #059669; }
.adm .ec-ar.ok { color: #059669; } .adm .ec-ar.bad { color: #dc2626; }
.adm .ec-neg { color: #dc2626; font-weight: 600; } .adm .ec-pos { color: #059669; font-weight: 600; }
.adm .ec-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 8px; }
.adm .ec-grid label { display: flex; flex-direction: column; gap: 4px; font-size: 13px; color: var(--mut); }
.adm .ec-grid input { padding: 8px 10px; border: 1px solid var(--line); border-radius: 10px; background: var(--bg); color: var(--ink); font: inherit; min-width: 0; }
.adm .ec-set .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.adm .ec-units td, .adm .ec-units th { white-space: nowrap; }
.adm .ec-chart { width: 100%; height: auto; display: block; }
.adm .ec-ax { font-size: 11px; fill: var(--mut); }
.adm .ec-leg { display: flex; gap: 14px; flex-wrap: wrap; font-size: 13px; }
.adm .ec-leg i { display: inline-block; width: 12px; height: 12px; border-radius: 3px; margin-right: 6px; vertical-align: -1px; }
.adm [data-econ] h3 { margin: 18px 0 8px; }
`;
