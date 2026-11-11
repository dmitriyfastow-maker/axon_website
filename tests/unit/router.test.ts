import { describe, expect, it } from 'vitest';
import { costUsd, EASY, FREE_CAP, isHard, monthPool, pickModel, pickTier, taskLevel, POOL_SHARE, TIERS } from '../../worker/router';

const POOL = 1000;
const paid = (lead = 0, all = 0, pool = POOL) => ({ lead, all, pool });
describe('pickTier', () => {
  it('does nothing without a key', () => expect(pickTier('pro', false, true, paid(), false)).toBeNull());
  it('free accounts get Haiku under the caps, nothing past any cap', () => {
    expect(pickTier('start', false, true, { ...paid(), user: 0, ip: 0, free: 0 }, true)).toBe(EASY);
    expect(pickTier('start', false, false, { ...paid(), user: FREE_CAP.user }, true)).toBeNull();
    expect(pickTier('start', false, false, { ...paid(), ip: FREE_CAP.ip }, true)).toBeNull();
    expect(pickTier('care', true, true, { ...paid(), free: FREE_CAP.all }, true)).toBeNull();
  });
  it('paid: easy → Haiku, hard → the plan model', () => {
    expect(pickTier('care', false, false, paid(), true)).toBe(EASY);
    expect(pickTier('care', false, true, paid(), true)?.model).toBe('claude-sonnet-5-5');
    expect(pickTier('pro', false, true, paid(), true)?.model).toBe('claude-opus-5-5');
    expect(pickTier('personal', false, true, paid(), true)?.model).toBe('claude-sonnet-5-5');
  });
  it('safety net: the pool falls back to Haiku, half the price stops Claude', () => {
    expect(pickTier('care', false, true, paid(TIERS.care.price * 0.5), true)).toBeNull();
    expect(pickTier('growth', false, true, paid(0, POOL), true)).toBe(EASY);
  });
});
describe('isHard', () => {
  it('spots real work', () => {
    expect(isHard('Привет, как дела?')).toBe(false);
    expect(isHard('Сделай сайт для кофейни')).toBe(true);
    expect(isHard('x', true)).toBe(true);
    expect(isHard('a'.repeat(401))).toBe(true);
  });
});
describe('monthPool', () => {
  it('adds POOL_SHARE of every paying plan', () => {
    expect(monthPool(['care', 'growth'])).toBeCloseTo(168 * POOL_SHARE);
    expect(monthPool(['start'])).toBe(0);
  });
});
describe('costUsd', () => {
  it('uses the price list', () => {
    expect(costUsd('claude-sonnet-5-5', { input_tokens: 1e6, output_tokens: 1e6 })).toBe(12);
    expect(costUsd('claude-haiku-5-5', { input_tokens: 1e6, output_tokens: 1e6 })).toBeCloseTo(0.6);
    expect(costUsd('unknown', { input_tokens: 1e6 })).toBe(0);
  });
});

describe('pickModel', () => {
  const p = { lead: 0, all: 0, pool: 1000 };
  it('auto on every paid plan: Haiku for easy, Sonnet for ordinary work, Opus for hard', () => {
    for (const plan of ['personal', 'care', 'growth', 'pro']) {
      expect(pickModel(plan, false, 0, 'auto', p, true)).toBe(EASY);
      expect(pickModel(plan, false, 1, 'auto', p, true)?.model).toBe('claude-sonnet-5-5');
      expect(pickModel(plan, false, 2, 'auto', p, true)?.model).toBe('claude-opus-5-5');
    }
  });
  it('a paid client may choose an exact model; a free one gets Haiku whatever they pick', () => {
    expect(pickModel('personal', false, 0, 'opus-5-5', p, true)?.model).toBe('claude-opus-5-5');
    expect(pickModel('care', false, 2, 'haiku-5-5', p, true)).toBe(EASY);
    expect(pickModel('care', false, 2, 'sonnet-5', p, true)?.model).toBe('claude-sonnet-5');
    expect(pickModel('care', false, 2, 'max', p, true)?.model).toBe('claude-opus-5-5');
    expect(pickModel('start', false, 2, 'opus-5-5', { ...p, user: 0, ip: 0, free: 0 }, true)).toBe(EASY);
  });
  it('sorts tasks into three levels', () => {
    expect(taskLevel('Привет')).toBe(0);
    expect(taskLevel('Напиши письмо арендодателю')).toBe(1);
    expect(taskLevel('Сделай сайт для кофейни')).toBe(2);
  });
});
