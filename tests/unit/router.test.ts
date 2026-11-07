import { describe, expect, it } from 'vitest';
import { costUsd, monthPool, pickTier, POOL_SHARE, TIERS } from '../../worker/router';

const POOL = 100;

describe('pickTier', () => {
  it('keeps guests, the free plan and trials on free models', () => {
    expect(pickTier('start', false, 0, 0, POOL, true)).toBeNull();
    expect(pickTier('personal', false, 0, 0, POOL, true)).toBeNull();
    expect(pickTier('care', true, 0, 0, POOL, true)).toBeNull();
  });
  it('does nothing without a key', () => expect(pickTier('pro', false, 0, 0, POOL, false)).toBeNull());
  it('gives paying clients Claude', () => {
    expect(pickTier('care', false, 0, 0, POOL, true)?.model).toBe('claude-sonnet-5-5');
    expect(pickTier('pro', false, 0, 0, POOL, true)?.model).toBe('claude-opus-5-5');
  });
  it('lets an active client go past their own share while the pool has room', () => {
    expect(pickTier('care', false, 30, 30, POOL, true)).not.toBeNull();
  });
  it('stops at the plan price and at the end of the pool', () => {
    expect(pickTier('care', false, TIERS.care.price, 0, POOL, true)).toBeNull();
    expect(pickTier('growth', false, 0, POOL, POOL, true)).toBeNull();
    expect(pickTier('care', false, 0, 0, 0, true)).toBeNull();
  });
});

describe('monthPool', () => {
  it('sums the share of every paying client', () => {
    expect(monthPool(['care', 'growth'])).toBeCloseTo(168 * POOL_SHARE);
    expect(monthPool(['start'])).toBe(0);
  });
  it('fits into the worst month: partner 50%, acquiring 2%, tax 5%', () => {
    expect(POOL_SHARE).toBeLessThanOrEqual(1 - 0.5 - 0.02 - 0.05);
  });
});

describe('costUsd', () => {
  it('counts input, output and cache', () => {
    expect(costUsd('claude-sonnet-5-5', { input_tokens: 1e6, output_tokens: 1e6 })).toBe(12);
    expect(costUsd('claude-opus-5-5', { cache_read_input_tokens: 1e6 })).toBeCloseTo(0.2);
    expect(costUsd('unknown', { input_tokens: 1e6 })).toBe(0);
  });
});
