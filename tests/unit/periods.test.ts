import { describe, expect, it } from 'vitest';
import { PERIODS, periodPrice } from '../../worker/billing';
import { isSubscription, saveCardExtra } from '../../worker/autopay';

describe('subscription periods', () => {
  it('gives 10%, 15% and 20% off for 3, 6 and 12 months', () => {
    expect(PERIODS).toEqual({ 1: 0, 3: 0.1, 6: 0.15, 12: 0.2 });
    expect(periodPrice(39, 1)).toBe(39);
    expect(periodPrice(39, 3)).toBe(105);
    expect(periodPrice(39, 12)).toBe(374);
    expect(periodPrice(299, 12)).toBe(2870);
  });
});
describe('autopay', () => {
  const inv = { id: 1, number: 'VX-2026-0001', token: 't', amount: 39, currency: 'USD', description: 'Vaxo Pro subscription, 2026-11', status: 'open', lead_id: 7, lang: 'ru' };
  it('saves the card only for a subscription the client agreed to', () => {
    expect(isSubscription(inv.description)).toBe(true);
    expect(isSubscription('Website, part 1')).toBe(false);
    expect(saveCardExtra(inv, true)).toEqual({ saveCardData: { saveCard: true, walletId: 'sub-7' } });
    expect(saveCardExtra(inv, false)).toEqual({});
    expect(saveCardExtra({ ...inv, description: 'Logo design' }, true)).toEqual({});
  });
});
import { firstShare } from '../../worker/payouts';
describe('partner share on a multi-month payment', () => {
  it('pays 50% of the first month and 30% of the rest', () => {
    expect(firstShare(39, 1, 50, 'referral')).toBeCloseTo(19.5);
    expect(firstShare(374, 12, 50, 'referral')).toBeCloseTo(374 / 12 * 0.5 + (374 - 374 / 12) * 0.3);
    expect(firstShare(374, 12, 10, 'team')).toBeCloseTo(37.4);
  });
});
