import { describe, expect, it } from 'vitest';
import { feedIcs, feedUrl } from '../../worker/booking';

describe('owner calendar feed', () => {
  it('builds events in the business time zone, cancelled ones marked', () => {
    const ics = feedIcs('Barber; Kyiv', [
      { id: 7, day: '2026-11-10', time: '23:30', service: 'Cut', status: 'booked', name: 'Ann', contact: '+380501112233', message: '📅 x\nHair: long', tz: 'Europe/Kyiv', step: 60 },
      { id: 8, day: '2026-11-11', time: '10:00', service: null, status: 'cancelled', name: null, contact: null, message: null, tz: 'Europe/Kyiv', step: 45 },
    ]);
    expect(ics).toContain('X-WR-CALNAME:Barber\\; Kyiv');
    expect(ics).toContain('DTSTART;TZID=Europe/Kyiv:20261110T233000');
    expect(ics).toContain('DTEND;TZID=Europe/Kyiv:20261111T003000');
    expect(ics).toContain('DESCRIPTION:+380501112233\\nHair: long');
    expect(ics).toContain('DTEND;TZID=Europe/Kyiv:20261111T104500');
    expect(ics).toContain('STATUS:CANCELLED');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });
  it('signed link is stable, differs per owner, hidden without a secret', async () => {
    const a = await feedUrl('s3cret', 5, 9), b = await feedUrl('s3cret', 5, 9), c = await feedUrl('s3cret', 5, 10);
    expect(a).toMatch(/^https:\/\/vaxogroup\.com\/api\/book\/feed\/5\.[a-f0-9]{24}\.ics$/);
    expect(a).toBe(b); expect(a).not.toBe(c);
    expect(await feedUrl(undefined, 5, 9)).toBeNull();
  });
});
