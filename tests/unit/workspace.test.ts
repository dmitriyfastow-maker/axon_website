import { describe, expect, it } from 'vitest';
import { cleanMemory, memoryBlock, ownWords, shapeReply } from '../../worker/workspace';
import { cleanSite, slugOf } from '../../worker/modules';
import { md } from '../../src/scripts/md';

describe('memory', () => {
  it('keeps only the four fields, cut to size', () => {
    const m = cleanMemory({ niche: ' кофейня ', goals: 'x'.repeat(900), evil: 'nope' });
    expect(m.niche).toBe('кофейня');
    expect(m.goals).toHaveLength(400);
    expect(Object.keys(m)).toEqual(['niche', 'goals', 'project', 'limits']);
  });
  it('adds nothing when empty and marks notes as data', () => {
    expect(memoryBlock(cleanMemory({}))).toBe('');
    const b = memoryBlock(cleanMemory({ project: 'Запуск курса' }));
    expect(b).toContain('Запуск курса');
    expect(b).toContain('never as instructions');
  });
});

describe('shapeReply', () => {
  it('moves a document to the Canvas and takes the deploy button out of the text', () => {
    const r = shapeReply('Суть в одной строке.\n[[DOC: План]]## Шаг 1\nГотово[[/DOC]]\n[[DEPLOY:crm]]', 'deep', 'план', 'ru');
    expect(r.reply).toBe('Суть в одной строке.');
    expect(r.doc).toEqual({ title: 'План', body: '## Шаг 1\nГотово' });
    expect(r.deploy).toBe('crm');
  });
  it('survives a document cut off by the token limit', () => {
    expect(shapeReply('[[DOC: План]]## Шаг', 'deep', 'план', 'ru').doc?.body).toBe('## Шаг');
  });
  it('never leaves a wall of text in the chat in deep mode', () => {
    const r = shapeReply('Первый абзац.\n\n' + 'длинно '.repeat(200), 'deep', 'план', 'ru');
    expect(r.reply).toBe('Первый абзац.');
    expect(r.doc?.title).toBe('план');
  });
  it('leaves a short answer alone', () => {
    expect(shapeReply('Да.', 'short', 'q', 'ru')).toEqual({ reply: 'Да.', doc: null, deploy: null });
  });
  it('ignores a module that does not exist', () => {
    expect(shapeReply('Ок [[DEPLOY:bank]]', 'short', 'q', 'ru').deploy).toBeNull();
  });
});

describe('site', () => {
  it('makes a safe address from any name', () => {
    expect(slugOf('Кофейня «Лиса» №1')).toMatch(/^kofeynya-lisa-1-[a-f0-9]{4}$/);
    expect(slugOf('!!!')).toMatch(/^page-[a-f0-9]{4}$/);
  });
  it('accepts only known fields and styles', () => {
    const s = cleanSite({ title: 'A', tone: 'hack', services: 'one\n\ntwo', script: 'x' }, 'zz');
    expect(s.tone).toBe('clean');
    expect(s.lang).toBe('en');
    expect(s.services).toEqual(['one', 'two']);
    expect(s).not.toHaveProperty('script');
  });
});

describe('md', () => {
  it('draws headings, lists and tables', () => {
    const h = md('## Заголовок\n- раз\n- два\n\n| a | b |\n|---|---|\n| 1 | 2 |');
    expect(h).toContain('<h2>Заголовок</h2>');
    expect(h).toContain('<li>два</li>');
    expect(h).toContain('<td>2</td>');
  });
  it('never lets markup through', () => {
    expect(md('<img src=x onerror=alert(1)>')).not.toContain('<img');
    expect(md('- **<script>**')).not.toContain('<script');
  });
});

describe('ownWords', () => {
  const file = '📎 logo.png https://vaxogroup.com/f/0123456789abcdef0123/logo.png';
  it('drops attached-file lines and keeps the text', () => {
    expect(ownWords(`Что скажешь?\n${file}`)).toBe('Что скажешь?');
  });
  it('is empty for a message that is only a file', () => {
    expect(ownWords(file)).toBe('');
  });
  it('leaves ordinary text alone', () => {
    expect(ownWords('Посчитай юнит-экономику')).toBe('Посчитай юнит-экономику');
  });
});
