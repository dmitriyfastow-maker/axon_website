import { describe, expect, it } from 'vitest';
import { serveOwnDomain } from '../../worker/domains';

// A tiny stand-in for D1: answers by what the SQL asks for.
function fakeDb(o: { known: boolean; access: boolean }) {
  const site = JSON.stringify({ lang: 'ru', tone: 'clean', title: 'Кейтеринг Одесса', sub: 'Еда на события', about: '', services: [], cta: '' });
  const answer = (sql: string) => {
    if (sql.includes('FROM biz_domains d JOIN biz_pages')) return o.known ? { status: 'active', slug: 'keytering-ab12', owner_id: 9 } : null;
    if (sql.includes("l.plan IN ('care', 'growth', 'pro')")) return o.access ? { 1: 1 } : null;
    if (sql.includes('FROM biz_pages p JOIN biz b')) return { id: 1, name: 'Кейтеринг', key: 'a'.repeat(24), owner_id: 9, kind: 'site', data: site };
    if (sql.includes("i.status = 'paid'")) return { 1: 1 };
    return null;
  };
  return { prepare: (sql: string) => { const st = { bind: () => st, first: async () => answer(sql), all: async () => ({ results: [] }), run: async () => ({}) }; return st; } } as never;
}
const at = (path: string) => new URL(`https://www.myshop.com${path}`);

describe('a client site on its own domain', () => {
  it('shows the page at the root, without the Vaxo line once paid', async () => {
    const r = await serveOwnDomain(fakeDb({ known: true, access: true }), at('/'));
    expect(r).toBeInstanceOf(Response);
    const html = await (r as Response).text();
    expect(html).toContain('Кейтеринг Одесса');
    expect(html).not.toContain('Сделано на Vaxo');
  });
  it('lets the form script and its endpoint through, sends other paths home', async () => {
    const db = fakeDb({ known: true, access: true });
    expect(await serveOwnDomain(db, at('/w.js'))).toBe('pass');
    expect(await serveOwnDomain(db, at('/api/w'))).toBe('pass');
    const r = (await serveOwnDomain(db, at('/admin/'))) as Response;
    expect(r.status).toBe(302);
    expect(r.headers.get('Location')).toBe('https://www.myshop.com/');
  });
  it('sends a lapsed plan to the free address, and leaves unknown names alone', async () => {
    const r = (await serveOwnDomain(fakeDb({ known: true, access: false }), at('/'))) as Response;
    expect(r.headers.get('Location')).toBe('https://vaxogroup.com/s/keytering-ab12');
    expect(await serveOwnDomain(fakeDb({ known: false, access: true }), at('/'))).toBeNull();
  });
});
