import { describe, expect, it } from 'vitest';
import { costUsd, EASY, FREE_CAP, isHard, monthPool, pickTier, POOL_SHARE, TIERS } from '../../worker/router';

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
  it('past the fair share: Haiku a little longer, then free models', () => {
    const share = TIERS.care.price * POOL_SHARE;
    expect(pickTier('care', false, true, paid(share), true)).toBe(EASY);
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
