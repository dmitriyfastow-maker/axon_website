import { describe, expect, it } from 'vitest';
import { costUsd, MONTH_CAP, pickTier, TIERS } from '../../worker/router';

describe('pickTier', () => {
  it('keeps guests, the free plan and trials on free models', () => {
    expect(pickTier('start', false, 0, 0, true)).toBeNull();
    expect(pickTier('personal', false, 0, 0, true)).toBeNull();
    expect(pickTier('care', true, 0, 0, true)).toBeNull();
  });
  it('does nothing without a key', () => expect(pickTier('pro', false, 0, 0, false)).toBeNull());
  it('gives paying clients Claude', () => {
    expect(pickTier('care', false, 0, 0, true)?.model).toBe('claude-sonnet-5-5');
    expect(pickTier('pro', false, 0, 0, true)?.model).toBe('claude-opus-5-5');
  });
  it('stops at the client budget and at the monthly cap', () => {
    expect(pickTier('care', false, TIERS.care.budget, 0, true)).toBeNull();
    expect(pickTier('growth', false, 0, MONTH_CAP, true)).toBeNull();
  });
  it('never lets a budget reach the plan price', () => {
    expect(TIERS.care.budget).toBeLessThan(39);
    expect(TIERS.growth.budget).toBeLessThan(129);
    expect(TIERS.pro.budget).toBeLessThan(299);
  });
});

describe('costUsd', () => {
  it('counts input, output and cache', () => {
    expect(costUsd('claude-sonnet-5-5', { input_tokens: 1e6, output_tokens: 1e6 })).toBe(12);
    expect(costUsd('claude-opus-5-5', { cache_read_input_tokens: 1e6 })).toBeCloseTo(0.2);
    expect(costUsd('unknown', { input_tokens: 1e6 })).toBe(0);
  });
});
