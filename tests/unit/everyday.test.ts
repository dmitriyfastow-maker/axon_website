import { describe, it, expect } from 'vitest';
import { shapeReply, everyday } from '../../worker/workspace';

// Decision 54: everyday questions are answered in the chat; documents still go to the Canvas.
describe('everyday answers stay in the chat', () => {
  it('tells an everyday question from work', () => {
    expect(everyday('Как быстро почистить чеснок?')).toBe(true);
    expect(everyday('Сколько варить яйцо всмятку?')).toBe(true);
    expect(everyday('Составь план продвижения кофейни')).toBe(false);
    expect(everyday('Собери сайт для барбершопа')).toBe(false);
  });
  it('unwraps a short document for an everyday question', () => {
    const r = shapeReply('Три способа.\n[[DOC: Чеснок]]\n## Способ 1\nРаздавите ножом.\n[[/DOC]]', 'short', 'Как быстро почистить чеснок?', 'ru');
    expect(r.doc).toBeNull();
    expect(r.reply).toContain('Раздавите ножом');
    expect(r.reply).not.toContain('##');
  });
  it('keeps the document for real work', () => {
    const r = shapeReply('Готово.\n[[DOC: План]]\n## Неделя 1\nПосты.\n[[/DOC]]', 'short', 'Составь план продвижения кофейни', 'ru');
    expect(r.doc?.title).toBe('План');
  });
});

import { streakOf, frameMax } from '../../worker/workspace';
describe('game: streak and frames (Decision 56)', () => {
  it('counts days in a row up to today or yesterday', () => {
    expect(streakOf(['2026-11-17', '2026-11-16', '2026-11-15', '2026-11-12'], '2026-11-17')).toBe(3);
    expect(streakOf(['2026-11-16', '2026-11-15'], '2026-11-17')).toBe(2);
    expect(streakOf(['2026-11-14'], '2026-11-17')).toBe(0);
  });
  it('opens frames with levels', () => {
    expect([1, 3, 5, 7, 9].map(frameMax)).toEqual([0, 1, 2, 3, 4]);
  });
});
