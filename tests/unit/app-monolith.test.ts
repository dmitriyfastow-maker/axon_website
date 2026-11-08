import { describe, expect, it } from 'vitest';
import { WANTS_SITE, shapeReply, serveDoc } from '../../worker/workspace';
import { cleanSite, sitePreview } from '../../worker/modules';
import { sanitizeTool, evalFormula } from '../../worker/toolcore';
import { WANTS_TOOL } from '../../worker/tools';

// Decision 43: the three tasks the workspace must finish with a ready thing on the Canvas.
describe('scenario A: a landing page with a pre-order form', () => {
  it('sees a site wish in any of our languages, and not a question about a site', () => {
    for (const q of ['Собери мне посадочную страницу для кофейни с формой предзаказа', 'Сделай лендинг для барбершопа', 'Зроби сайт для пекарні', 'Build me a landing page for a coffee shop', 'I need a website for my bakery', 'Посадочная страница для кофейни с формой предзаказа', 'Лендинг для стоматологии', 'A landing page for a yoga studio'])
      expect(WANTS_SITE.test(q), q).toBe(true);
    for (const q of ['Как поднять сайт в поиске?', 'What should my website say?', 'Посчитай юнит-экономику', 'Сайт для кофейни нужен ли вообще?', 'Сколько стоит сайт для кофейни'])
      expect(WANTS_SITE.test(q), q).toBe(false);
  });
  it('draws the draft with its form and the hint the wish asked for, but runs no script', () => {
    const s = cleanSite({ title: 'Кофейня «Зерно»', sub: 'Кофе с собой без очереди', about: 'Варим каждый день.', services: ['Эспрессо', 'Капучино'], cta: 'Предзаказ', ask: 'Что и к какому времени приготовить?', tone: 'warm' }, 'ru');
    const html = sitePreview(s);
    expect(html).toContain('Кофейня');
    expect(html).toContain('Предзаказ');
    expect(html).toContain('Что и к какому времени приготовить?');
    expect(html).toContain('<form');
    expect(html).not.toMatch(/<script/i);
  });
  it('keeps markup out of a site written by the model', () => {
    const html = sitePreview(cleanSite({ title: '<img src=x onerror=alert(1)>', services: ['<b>x</b>'] }, 'en'));
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<b>x');
  });
});

describe('scenario B: a financial model as a live table', () => {
  it('asks for a tool, and a 12-field model with formulas passes', () => {
    expect(WANTS_TOOL.test('Рассчитай финмодель запуска онлайн-школы на $50k оборота с учетом рекламы, команды и налогов')).toBe(true);
    const spec = sanitizeTool({
      kind: 'calc', title: 'Финмодель онлайн-школы',
      fields: [{ id: 'rev', label: 'Оборот', unit: '$', value: 50000 }, { id: 'ads', label: 'Реклама', unit: '$', value: 15000 }, { id: 'team', label: 'Команда', unit: '$', value: 12000 }, { id: 'other', label: 'Прочее', unit: '$', value: 3000 }, { id: 'tax', label: 'Налог', unit: '%', value: 5 }],
      outputs: [{ label: 'Прибыль до налога', unit: '$', f: 'rev-ads-team-other' }, { label: 'Налог', unit: '$', f: 'rev*tax/100' }, { label: 'Чистая прибыль', unit: '$', f: 'rev-ads-team-other-rev*tax/100' }, { label: 'Маржа', unit: '%', f: 'round((rev-ads-team-other-rev*tax/100)/rev*100,1)' }],
    });
    expect(spec?.kind).toBe('calc');
    if (spec?.kind !== 'calc') return;
    const v = Object.fromEntries(spec.fields.map((f) => [f.id, f.value]));
    expect(evalFormula(spec.outputs[2].f, v)).toBe(17500);
    expect(evalFormula(spec.outputs[3].f, v)).toBe(35);
  });
  it('keeps the tool and the worked-out document together', () => {
    const r = shapeReply('Суть в трёх строках.\n[[DOC: Финмодель]]\n## Доходы\n| Статья | $ |\n|---|---|\n| Оборот | 50000 |\n[[/DOC]]', 'deep', 'финмодель', 'ru');
    expect(r.doc?.title).toBe('Финмодель');
    expect(r.reply).toBe('Суть в трёх строках.');
  });
});

describe('scenario C: a 30-day protocol with checkboxes', () => {
  it('asks for a tool, and keeps one item per day for all 30 days', () => {
    expect(WANTS_TOOL.test('Составь 30-дневный протокол тренировок и восстановления')).toBe(true);
    const spec = sanitizeTool({ kind: 'list', title: '30 дней', items: Array.from({ length: 30 }, (_, i) => `День ${i + 1}: тренировка или отдых`) });
    expect(spec?.kind === 'list' && spec.items.length).toBe(30);
  });
});

describe('a published Canvas document', () => {
  const db = (row: unknown) => ({ prepare: () => { const st = { bind: () => st, first: async () => row }; return st; } }) as never;
  it('is escaped Markdown with no scripts, and unknown links are 404', async () => {
    const r = await serveDoc(db({ title: 'План <x>', body: '## Шаг\n<script>alert(1)</script>' }), 'a1b2c3d4e5f6');
    const html = await r.text();
    expect(html).toContain('<h2>Шаг</h2>');
    expect(html).not.toContain('<script>alert');
    expect(r.headers.get('Content-Security-Policy')).toContain("default-src 'none'");
    expect((await serveDoc(db(null), 'a1b2c3d4e5f6')).status).toBe(404);
  });
});

describe('a checklist the model wrote by hand', () => {
  it('becomes a real checklist on the Canvas, and the made-up tag goes away', async () => {
    const { pullChecklist } = await import('../../worker/tools');
    const r = pullChecklist('План готов.\n<canvas id="x" type="checklist" title="30 дней">\n- [ ] Неделя 1: адаптация\n- [ ] Неделя 2: нагрузка\n- [ ] Неделя 3: пик\n</canvas>', 'протокол');
    expect(r.tool?.kind === 'list' && r.tool.items).toEqual(['Неделя 1: адаптация', 'Неделя 2: нагрузка', 'Неделя 3: пик']);
    expect(r.tool?.title).toBe('30 дней');
    expect(r.reply).toBe('План готов.');
  });
});

describe('the tool filter in Russian', () => {
  it('hears "план" and day programs, money models, but not small talk', () => {
    for (const q of ['Составь 14-дневный план подготовки к собеседованию', 'Бизнес-план автомойки с окупаемостью', 'Сделай план', 'Посчитай рентабельность'])
      expect(WANTS_TOOL.test(q), q).toBe(true);
    for (const q of ['Привет, что ты умеешь?', 'Планета Земля', 'Напиши пост про кофе'])
      expect(WANTS_TOOL.test(q), q).toBe(false);
  });
});
