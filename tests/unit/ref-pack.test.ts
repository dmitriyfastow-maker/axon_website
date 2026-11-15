import { describe, it, expect } from 'vitest';
import { packRef, unpackRef } from '../../worker/modules';

describe('partner payout inside ref name', () => {
  it('keeps old plain names', () => { expect(unpackRef('Anna')).toEqual({ name: 'Anna', paid: 0 }); });
  it('round-trips the paid sum', () => { expect(unpackRef(packRef('Anna', 40.5))).toEqual({ name: 'Anna', paid: 40.5 }); });
  it('never goes below zero and drops the mark at zero', () => { expect(packRef('Anna', -5)).toBe('Anna'); });
  it('survives a broken tail', () => { expect(unpackRef('Anna\u2063{bad')).toEqual({ name: 'Anna', paid: 0 }); });
});
