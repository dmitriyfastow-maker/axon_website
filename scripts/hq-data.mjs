// Collects the owner's HQ data from the project repo (tasks, decisions, episodes, links) into worker/hq.json.
// Runs before every build; the file is served only through the protected /api/admin.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const repo = new URL('../../', import.meta.url);
const read = (p) => (existsSync(new URL(p, repo)) ? readFileSync(new URL(p, repo), 'utf8') : '');

const waiting = read('WAITING.md').split('\n').filter((l) => /^\s*- \[ \]/.test(l)).map((l) => l.replace(/^\s*- \[ \]\s*/, ''));
const decisions = [...read('DECISIONS.md').matchAll(/(Решение \d+[^\n]*?) — (https:\/\/\S+)/g)].map((m) => ({ t: m[1].trim(), url: m[2] }));
const status = read('STATUS.md').split('\n## ').pop() ?? '';
let episodes = [];
try { episodes = JSON.parse(read('research/cartoon/episodes.json') || '[]'); } catch {}

const gh = 'https://github.com/dmitriyfastow-maker/vaxo-zavod/blob/main/';
const links = [
  { group: 'Сайт', items: [
    ['Главная (EN / UA / RU)', 'https://vaxogroup.com/'], ['Русская версия', 'https://vaxogroup.com/ru/'], ['Услуги и цены', 'https://vaxogroup.com/ru/#services'],
    ['Стартовые пакеты', 'https://vaxogroup.com/ru/start/'], ['Магазин наборов', 'https://vaxogroup.com/ru/shop/'], ['Бесплатные инструменты', 'https://vaxogroup.com/ru/tools/'],
    ['Примеры сайтов', 'https://vaxogroup.com/ru/examples/'], ['Страница для партнёров', 'https://vaxogroup.com/ru/partners/']] },
  { group: 'Кабинеты и роли', items: [
    ['Штаб владельца (это здесь)', 'https://vaxogroup.com/admin/'], ['Кабинет партнёра', 'https://vaxogroup.com/ru/partner/'],
    ['Кабинет партнёра → Клиенты агентства', 'https://vaxogroup.com/ru/partner/#deals']] },
  { group: 'Мультик и контент', items: [
    ['Проект во Flow (съёмка сцен)', 'https://flow.google.com/project/74a32244-54dd-4c1f-a72b-f02a49b6b996'], ['Оплата Google AI Pro', 'https://one.google.com/about/google-ai-plans/'],
    ['Режиссёрский гид', gh + 'research/cartoon/flow-directing-guide.md'], ['Как выбираем темы', gh + 'research/cartoon/topics-system.md'], ['Сценарий серии 3', gh + 'research/cartoon/ep03-vax.md']] },
  { group: 'Инфраструктура', items: [
    ['Cloudflare (хостинг сайта, база)', 'https://dash.cloudflare.com/939511076f702306710cfbf6174adc54/workers-and-pages'],
    ['GitHub: проект завода', 'https://github.com/dmitriyfastow-maker/vaxo-zavod'], ['GitHub: код сайта', 'https://github.com/dmitriyfastow-maker/axon_website']] },
  { group: 'Документы проекта', items: [
    ['Что ждёт вас (WAITING)', gh + 'WAITING.md'], ['Статус работы (STATUS)', gh + 'STATUS.md'], ['Вся история (HANDOFF)', gh + 'HANDOFF.md'], ['Список решений', gh + 'DECISIONS.md']] },
].map((g) => ({ group: g.group, items: g.items.map(([t, url]) => ({ t, url })) }));

writeFileSync(new URL('../worker/hq.json', import.meta.url), JSON.stringify({ generated: new Date().toISOString(), waiting, decisions, status, episodes, links }, null, 1));
console.log(`hq.json: ${waiting.length} tasks, ${decisions.length} decisions, ${episodes.length} episodes`);
