import { describe, expect, test, vi } from 'vitest';
import { escapeHtml, handleLead, type LeadEnv } from '../../src/lib/lead';

const NOW = 1_800_000_000_000;
const lead = { mode: 'request', name: 'Anna', contact: 'anna@mail.com', interest: 'Growth', message: 'Hi', lang: 'ru', website: '', startedAt: NOW - 10_000 };
const fullEnv: LeadEnv = { TELEGRAM_BOT_TOKEN: 'T', TELEGRAM_CHAT_ID: '42', RESEND_API_KEY: 'K', LEAD_EMAIL_TO: 'to@axon.studio', LEAD_EMAIL_FROM: 'AXON <site@axon.studio>' };
const ok = async () => new Response('{}', { status: 200 });
const fail = async () => new Response('{}', { status: 500 });
const bodyOf = (f: ReturnType<typeof vi.fn>, urlPart: string) => {
  const call = (f.mock.calls as unknown[][]).find(([u]) => String(u).includes(urlPart));
  return call ? { url: String(call[0]), init: call[1] as RequestInit, json: JSON.parse(String((call[1] as RequestInit).body)) } : null;
};

describe('handleLead', () => {
  test('honeypot filled → silent success', async () => {
    const f = vi.fn(ok);
    expect(await handleLead({ ...lead, website: 'x' }, fullEnv, f, NOW)).toEqual({ status: 200, body: { ok: true } });
    expect(f).not.toHaveBeenCalled();
  });
  test('submitted too fast → silent success', async () => {
    const f = vi.fn(ok);
    expect((await handleLead({ ...lead, startedAt: NOW - 1500 }, fullEnv, f, NOW)).status).toBe(200);
    expect(f).not.toHaveBeenCalled();
  });
  test('invalid → 400 with errors', async () => {
    const r = await handleLead({ ...lead, contact: 'nope' }, fullEnv, vi.fn(ok), NOW);
    expect(r).toEqual({ status: 400, body: { ok: false, errors: { contact: true } } });
  });
  test('sends to Telegram and Resend', async () => {
    const f = vi.fn(ok);
    expect((await handleLead(lead, fullEnv, f, NOW)).status).toBe(200);
    expect(f).toHaveBeenCalledTimes(2);
    const tg = bodyOf(f, 'telegram')!;
    expect(tg.url).toBe('https://api.telegram.org/botT/sendMessage');
    expect(tg.json).toMatchObject({ chat_id: '42', parse_mode: 'HTML' });
    expect(tg.json.text).toContain('Growth');
    const em = bodyOf(f, 'resend')!;
    expect(em.url).toBe('https://api.resend.com/emails');
    expect((em.init.headers as Record<string, string>).Authorization).toBe('Bearer K');
    expect(em.json).toMatchObject({ from: 'AXON <site@axon.studio>', to: ['to@axon.studio'], reply_to: 'anna@mail.com' });
  });
  test('no reply_to for telegram handle', async () => {
    const f = vi.fn(ok);
    await handleLead({ ...lead, contact: '@anna_k' }, fullEnv, f, NOW);
    expect(bodyOf(f, 'resend')!.json.reply_to).toBeUndefined();
  });
  test('one channel failing still succeeds', async () => {
    const f = vi.fn((u: string) => (u.includes('telegram') ? fail() : ok()));
    expect((await handleLead(lead, fullEnv, f as never, NOW)).status).toBe(200);
  });
  test('all channels failing → 502', async () => {
    expect((await handleLead(lead, fullEnv, vi.fn(fail), NOW)).status).toBe(502);
    const thrower = vi.fn(() => Promise.reject(new Error('net')));
    expect((await handleLead(lead, fullEnv, thrower, NOW)).status).toBe(502);
  });
  test('only Telegram configured', async () => {
    const f = vi.fn(ok);
    expect((await handleLead(lead, { TELEGRAM_BOT_TOKEN: 'T', TELEGRAM_CHAT_ID: '42' }, f, NOW)).status).toBe(200);
    expect(f).toHaveBeenCalledTimes(1);
  });
  test('nothing configured → 500', async () => {
    expect((await handleLead(lead, {}, vi.fn(ok), NOW)).status).toBe(500);
  });
  test('escapes HTML in both channels', async () => {
    const f = vi.fn(ok);
    await handleLead({ ...lead, name: '<b>A&B</b>' }, fullEnv, f, NOW);
    const safe = '&lt;b&gt;A&amp;B&lt;/b&gt;';
    expect(bodyOf(f, 'telegram')!.json.text).toContain(safe);
    expect(bodyOf(f, 'resend')!.json.html).toContain(safe);
    expect(bodyOf(f, 'resend')!.json.html).not.toContain('<b>A&B');
  });
});

test('escapeHtml', () => expect(escapeHtml(`<a href="x">'&`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;'));

describe('api/lead', async () => {
  const { POST, GET } = await import('../../api/lead');
  test('rejects invalid JSON with 400', async () => {
    const res = await POST(new Request('http://x/api/lead', { method: 'POST', body: 'nope' }));
    expect(res.status).toBe(400);
  });
  test('GET is not allowed', () => expect(GET().status).toBe(405));
  test('valid body without channels → 500 JSON', async () => {
    const res = await POST(new Request('http://x/api/lead', { method: 'POST', body: JSON.stringify({ ...lead, startedAt: Date.now() - 10_000 }) }));
    expect(res.status).toBe(500);
    expect(res.headers.get('content-type')).toBe('application/json');
  });
});

test('api/lead trims env values before use', async () => {
  const { POST } = await import('../../api/lead');
  process.env.TELEGRAM_BOT_TOKEN = ' T \n';
  process.env.TELEGRAM_CHAT_ID = '42\n';
  const f = vi.fn(ok);
  vi.stubGlobal('fetch', f);
  try {
    const res = await POST(new Request('http://x/api/lead', { method: 'POST', body: JSON.stringify({ ...lead, startedAt: Date.now() - 10_000 }) }));
    expect(res.status).toBe(200);
    const tg = bodyOf(f, 'telegram')!;
    expect(tg.url).toBe('https://api.telegram.org/botT/sendMessage');
    expect(tg.json.chat_id).toBe('42');
  } finally {
    vi.unstubAllGlobals();
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
  }
});
