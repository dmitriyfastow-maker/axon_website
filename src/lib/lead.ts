import { validateLead, type LeadErrors, type LeadInput } from './validate.js';
export type { LeadInput };

export type LeadEnv = Partial<
  Record<'TELEGRAM_BOT_TOKEN' | 'TELEGRAM_CHAT_ID' | 'RESEND_API_KEY' | 'LEAD_EMAIL_TO' | 'LEAD_EMAIL_FROM', string>
>;
export interface LeadResult {
  status: number;
  body: { ok: boolean; errors?: LeadErrors };
}

/** Forms submitted faster than this are treated as bots. */
const MIN_FILL_MS = 2000;
const INTEREST_LABEL: Record<string, string> = { single: 'Single service', any: 'Not sure yet' };

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function fields(l: LeadInput) {
  return {
    kind: l.mode === 'request' ? 'Request' : 'Question',
    interest: INTEREST_LABEL[l.interest] ?? (l.interest || '—'),
    lang: l.lang.toUpperCase(),
    message: l.message || '—',
  };
}

async function sendTelegram(l: LeadInput, env: LeadEnv, fetchFn: typeof fetch) {
  const f = fields(l);
  const e = escapeHtml;
  const text = [
    `🟡 <b>${f.kind}</b> · ${e(f.interest)} · ${f.lang}`,
    `👤 ${e(l.name)}`,
    `📞 ${e(l.contact)}`,
    `💬 ${e(f.message)}`,
    ...(l.ref ? [`🤝 partner: ${e(l.ref)}`] : []),
  ].join('\n');
  const res = await fetchFn(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  });
  if (!res.ok) throw new Error(`Telegram ${res.status}: ${await res.text()}`);
}

async function sendEmail(l: LeadInput, env: LeadEnv, fetchFn: typeof fetch) {
  const f = fields(l);
  const rows: [string, string][] = [
    ['Type', f.kind], ['Interest', f.interest], ['Language', f.lang], ['Name', l.name], ['Contact', l.contact], ['Message', f.message],
  ];
  const html = `<table cellpadding="6" style="font-family:sans-serif;font-size:15px">${rows
    .map(([k, v]) => `<tr><td style="color:#5F5A50;vertical-align:top">${k}</td><td style="white-space:pre-wrap">${escapeHtml(v)}</td></tr>`)
    .join('')}</table>`;
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(l.contact);
  const res = await fetchFn('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.RESEND_API_KEY}` },
    body: JSON.stringify({
      from: env.LEAD_EMAIL_FROM,
      to: [env.LEAD_EMAIL_TO],
      subject: `Vaxo — new ${f.kind.toLowerCase()}: ${l.name}`,
      text: rows.map(([k, v]) => `${k}: ${v}`).join('\n'),
      html,
      ...(isEmail ? { reply_to: l.contact } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

/** Optional permanent storage (Cloudflare D1): a stored lead is never lost, even if Telegram/email fail. */
export type SaveLead = (lead: LeadInput) => Promise<void>;

export async function handleLead(body: unknown, env: LeadEnv, fetchFn: typeof fetch, now = Date.now(), save?: SaveLead): Promise<LeadResult> {
  const o = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const startedAt = Number(o.startedAt);
  if (o.website || !Number.isFinite(startedAt) || now - startedAt < MIN_FILL_MS) return { status: 200, body: { ok: true } };

  const v = validateLead(o);
  // `in` narrows even under Vercel's non-strict compile of this file.
  if ('errors' in v) return { status: 400, body: { ok: false, errors: v.errors } };
  const lead = v.value;

  let saved = false;
  if (save) {
    try {
      await save(lead);
      saved = true;
    } catch (err) {
      console.error('[lead] save failed:', err);
    }
  }

  const channels: [string, () => Promise<void>][] = [];
  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) channels.push(['telegram', () => sendTelegram(lead, env, fetchFn)]);
  if (env.RESEND_API_KEY && env.LEAD_EMAIL_TO && env.LEAD_EMAIL_FROM) channels.push(['email', () => sendEmail(lead, env, fetchFn)]);
  if (!channels.length) {
    if (saved) return { status: 200, body: { ok: true } };
    console.error('[lead] no delivery channel configured');
    return { status: 500, body: { ok: false } };
  }

  const results = await Promise.allSettled(channels.map(([, send]) => send()));
  results.forEach((r, i) => r.status === 'rejected' && console.error(`[lead] ${channels[i][0]} failed:`, r.reason));
  return saved || results.some((r) => r.status === 'fulfilled') ? { status: 200, body: { ok: true } } : { status: 502, body: { ok: false } };
}
