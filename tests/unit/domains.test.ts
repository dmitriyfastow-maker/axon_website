import { describe, expect, it } from 'vitest';
import { cleanHost, recordFor } from '../../worker/domains';

describe('own domains', () => {
  it('turns what people type into a bare host', () => {
    expect(cleanHost('https://WWW.MyShop.com/about?x=1')).toBe('www.myshop.com');
    expect(cleanHost(' myshop.com. ')).toBe('myshop.com');
    expect(cleanHost('shop.example.com.ua:443')).toBe('shop.example.com.ua');
    expect(cleanHost('магазин.укр')).toBe('xn--80aairftm.xn--j1amh');
  });
  it('refuses what cannot be connected', () => {
    for (const bad of ['', 'localhost', 'myshop', '1.2.3.4', 'my_shop.com', '-a.com', 'a.c', 'vaxogroup.com', 'x.vaxogroup.com', 'x.workers.dev', 'a'.repeat(64) + '.com', 42])
      expect(cleanHost(bad)).toBe('');
  });
  it('shows the DNS name the registrar expects', () => {
    expect(recordFor('www.myshop.com')).toEqual({ name: 'www', apex: false });
    expect(recordFor('myshop.com')).toEqual({ name: '@', apex: true });
    expect(recordFor('shop.myshop.com.ua')).toEqual({ name: 'shop', apex: false });
    expect(recordFor('myshop.com.ua')).toEqual({ name: '@', apex: true });
    expect(recordFor('a.b.myshop.co.uk')).toEqual({ name: 'a.b', apex: false });
  });
});
