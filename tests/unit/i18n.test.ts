import { describe, expect, test } from 'vitest';
import { getDict, LANGS, type Lang } from '../../src/i18n';
import { SVC_PRICES } from '../../src/data/services';
import { CASE_META } from '../../src/data/cases';

const shape = (v: unknown): unknown =>
  Array.isArray(v) ? v.map(shape) : v && typeof v === 'object'
    ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)).map(([k, x]) => [k, shape(x)]))
    : typeof v;

describe('dictionaries', () => {
  test('all dictionaries share the en shape', () => {
    for (const l of ['ua', 'ru'] as Lang[]) expect(shape(getDict(l))).toEqual(shape(getDict('en')));
  });
  test('counts match design', () => {
    const t = getDict('en');
    expect([t.cases.length, t.tiers.length, t.cat.items.length, t.faq.length, t.ref.why.length]).toEqual([8, 3, 8, 9, 4]);
    expect(CASE_META).toHaveLength(8);
  });
  test('service rows align with prices', () => {
    getDict('en').cat.items.forEach((it, i) => expect(SVC_PRICES[i].length).toBeGreaterThanOrEqual(it.rows.length));
  });
  test('new strings exist', () => {
    LANGS.forEach((l) => {
      expect(getDict(l).form.sending).toBeTruthy();
      expect(getDict(l).form.error).toBeTruthy();
    });
  });
  test('case images resolve to keys', () => {
    expect(CASE_META[0].img).toBe('tricho-cover');
    expect(CASE_META[1].gallery?.map((g) => g.src)).toEqual(['aipro-logo', 'aipro-laptop']);
  });
});
