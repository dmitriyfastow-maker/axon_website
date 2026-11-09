import { describe, expect, it } from 'vitest';
import { cleanCfg, hmacMd5, liqSign, publicCfg, refBiz } from '../../worker/sitepay';

describe('site payments', () => {
  it('HMAC-MD5 matches the reference vector', () => {
    expect(hmacMd5('key', 'The quick brown fox jumps over the lazy dog')).toBe('80070713463e7749b90c2dc24911e275');
    expect(hmacMd5('', '')).toBe('74e6f7298a9c2d168935f58c001bad88');
  });
  it('LiqPay signature is base64(sha1(private+data+private))', async () => {
    expect(await liqSign('p', 'd')).toBe('/4LmJVEbyY9wflwJLwxS5Nmv1IU=');
  });
  it('cleans the config and never shows the keys', () => {
    expect(cleanCfg({ prov: 'x' })).toBe('prov');
    expect(cleanCfg({ prov: 'wfp', k1: 'shop' })).toBe('keys');
    expect(cleanCfg({ prov: 'stripe', k1: 'pk_live_abc' })).toBe('keys');
    const c = cleanCfg({ prov: 'mono', k1: 'uAbcdefgh123456', dep: '200', cur: 'USD' });
    expect(typeof c).toBe('object');
    if (typeof c === 'object') { expect(c.cur).toBe('UAH'); expect(c.dep).toBe(200); expect(JSON.stringify(publicCfg(c))).not.toContain('Abcdefgh'); }
  });
  it('reads the business from a payment reference', () => {
    expect(refBiz('12_0123456789abcdef')).toBe(12);
    expect(refBiz('12_x')).toBe(0);
  });
});
