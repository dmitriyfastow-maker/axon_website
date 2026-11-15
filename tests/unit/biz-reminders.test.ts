import { describe, it, expect } from 'vitest';
import { bizReminders, packNote } from '../../worker/biz';

// A tiny fake D1: answers the three queries bizReminders makes.
function fakeDb(leads: any[]) {
  return {
    prepare(sql: string) {
      const st = {
        args: [] as unknown[],
        bind(...a: unknown[]) { st.args = a; return st; },
        async all() {
          if (sql.includes('FROM biz_leads')) return { results: leads };
          if (sql.includes('FROM biz_members')) return { results: [{ email: 'm@x.com' }] };
          return { results: [] };
        },
        async first() { return { name: 'Йога', email: 'o@x.com', lang: 'ru' }; },
        async run() { return {}; },
      };
      return st;
    },
  } as any;
}

describe('bizReminders', () => {
  const at9 = new Date('2026-11-16T07:30:00Z'); // 9:30 in Kyiv (winter, UTC+2)
  const leads = [
    { id: 1, biz_id: 7, at: '2026-11-10 10:00:00', name: 'Анна', contact: '', status: 'work', note: packNote('перезвонить', null, '2026-11-15'), assignee: 'm@x.com' },
    { id: 2, biz_id: 7, at: '2026-11-16 07:00:00', name: 'Свежая', contact: '', status: 'new', note: null, assignee: null },
    { id: 3, biz_id: 7, at: '2026-11-14 07:00:00', name: 'Старая', contact: '', status: 'new', note: null, assignee: 'other@x.com' },
  ];
  it('sends the owner everything due and the manager only theirs, at 9 Kyiv time only', async () => {
    const sent: [string, string, string][] = [];
    await bizReminders(fakeDb(leads), async (to, s, t) => { sent.push([to, s, t]); }, at9);
    expect(sent.map((x) => x[0])).toEqual(['o@x.com', 'm@x.com']);
    expect(sent[0][2]).toContain('🔴 Анна');
    expect(sent[0][2]).toContain('Старая');
    expect(sent[0][2]).not.toContain('Свежая');
    expect(sent[1][2]).toContain('Анна');
    expect(sent[1][2]).not.toContain('Старая');
    const none: unknown[] = [];
    await bizReminders(fakeDb(leads), async (...a) => { none.push(a); }, new Date('2026-11-16T12:00:00Z'));
    expect(none.length).toBe(0);
  });
});
