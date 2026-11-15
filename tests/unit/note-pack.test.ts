import { describe, it, expect } from 'vitest';
import { packNote, unpackNote } from '../../worker/biz';

describe('CRM note extras', () => {
  it('keeps plain notes plain', () => {
    expect(packNote('call back', null, '')).toBe('call back');
    expect(unpackNote('old note')).toEqual({ note: 'old note', amount: null, next: null });
    expect(unpackNote(null)).toEqual({ note: '', amount: null, next: null });
  });
  it('round-trips amount and next date', () => {
    const p = packNote('agreed', 1200.5, '2026-11-20')!;
    expect(unpackNote(p)).toEqual({ note: 'agreed', amount: 1200.5, next: '2026-11-20' });
  });
  it('drops bad values', () => {
    expect(packNote('x', -5, 'tomorrow')).toBe('x');
    expect(unpackNote(packNote('', 'abc', '2026-01-02'))).toEqual({ note: '', amount: null, next: '2026-01-02' });
  });
});
