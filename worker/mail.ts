// Omnichannel, step 2: clients write to hello@vaxogroup.com (Cloudflare Email Routing → this worker's email()).
// The letter lands in the client's project chat, Vax answers there, and — once the owner turns on
// "email_replies" in the HQ — every client-visible reply also goes back to the client by email (Resend).
import PostalMime from 'postal-mime';
import type { DB } from './partner.js';
import { logEvent, type Notify } from './deals.js';
import { addMessage, newRoom } from './rooms.js';
import { settings } from './autopilot.js';

export interface IncomingEmail {
  from: string;
  to: string;
  raw: ReadableStream;
  headers: Headers;
  setReject(reason: string): void;
}

let resendKey = '';
let fromAddr = '';

export function configureMail(key?: string, from?: string) {
  resendKey = key?.trim() || '';
  fromAddr = from?.trim() || '';
}

/** Drop the quoted history and signatures-of-replies so only the new text reaches the chat. */
export function freshText(body: string): string {
  const out: string[] = [];
  for (const line of body.replace(/\r\n/g, '\n').split('\n')) {
    if (/^\s*>/.test(line)) continue;
    if (/^On .{4,200} wrote:\s*$/.test(line) || /^-{2,}\s*Original Message/i.test(line) || /^(From|От|Від):\s/.test(line)) break;
    if (/^\d{1,2}[./]\d{1,2}[./]\d{2,4}.{0,80}(wrote|пишет|написал|пише|написав):\s*$/i.test(line)) break;
    out.push(line);
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

const AUTO = /^(mailer-daemon|postmaster|no-?reply|do-?not-?reply|bounce)/i;

/** email() handler: one incoming letter → the client's project chat. onClient(leadId, greet) asks Vax to answer. */
export async function handleEmail(db: DB, message: IncomingEmail, notify: Notify, onClient: (leadId: number, greet: boolean) => void) {
  const h = (k: string) => message.headers.get(k) || '';
  const from = message.from.trim().toLowerCase();
  // Bounces, auto-replies and mailing lists never become leads (no reply loops).
  if (!from || AUTO.test(from) || /auto-(replied|generated)/i.test(h('Auto-Submitted')) || h('List-Id') || /bulk|junk|list/i.test(h('Precedence'))) return;
  const mail = await PostalMime.parse(message.raw);
  const text = freshText(mail.text || (mail.html || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ')).slice(0, 4000);
  const subject = (mail.subject || '').trim().slice(0, 200);
  const body = [subject && !/^(re|fwd?|aw):/i.test(subject) ? subject : '', text].filter(Boolean).join('\n\n');
  // A letter is attached to an existing project only when the sender's domain vouched for it (SPF/DKIM pass).
  const trusted = /\b(spf|dkim)=pass\b/i.test(h('Authentication-Results') + ' ' + h('ARC-Authentication-Results'));

  type Lead = { id: number; name: string; ai: string };
  let lead = trusted
    ? await db
        .prepare(`SELECT id, name, ai FROM leads WHERE email_addr = ? OR lower(trim(contact)) = ? ORDER BY (email_addr = ?) DESC, id DESC LIMIT 1`)
        .bind(from, from, from)
        .first<Lead>()
    : null;
  if (lead) {
    await db.prepare(`UPDATE leads SET email_addr = ?, updated_at = datetime('now') WHERE id = ? AND email_addr IS NULL`).bind(from, lead.id).run();
  } else {
    const name = (mail.from?.name || from.split('@')[0]).slice(0, 100);
    const res = (await db
      .prepare('INSERT INTO leads (mode, name, contact, interest, message, lang, room, email_addr) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind('email', name, from, null, body.slice(0, 2000) || null, null, newRoom(), trusted ? from : null)
      .run()) as { meta?: { last_row_id?: number } };
    const id = res?.meta?.last_row_id;
    if (!id) return;
    lead = { id, name, ai: 'on' };
    await logEvent(db, id, 'system', 'note', `Request received by email${trusted ? '' : ' (sender not verified — replies stay in the HQ)'}`);
    await notify(`🆕 #${id} ${name} (${from}) написал на почту: ${body.slice(0, 300)}`);
  }
  if (!body) return;
  const recent = await db
    .prepare(`SELECT COUNT(*) AS n FROM messages WHERE lead_id = ? AND sender = 'client' AND at > datetime('now', '-1 hour')`)
    .bind(lead.id)
    .first<{ n: number }>();
  if ((recent?.n ?? 0) >= 40) return;
  const att = mail.attachments?.length ? `\n\n[${mail.attachments.length} attachment(s) in the email — ask the client to send a link]` : '';
  await addMessage(db, lead.id, 'client', 'text', body + att);
  if (lead.ai === 'on') onClient(lead.id, false);
  else await notify(`💬 #${lead.id} ${lead.name} (почта): ${body.slice(0, 300)}`);
}

/** Called for every new message in a project chat: client-visible replies go to the client's email (when enabled). */
export async function relayEmail(db: DB, leadId: number, sender: string, text: string) {
  if (!resendKey || !fromAddr || sender === 'client' || sender === 'system') return;
  const l = await db.prepare('SELECT email_addr, room FROM leads WHERE id = ?').bind(leadId).first<{ email_addr: string | null; room: string | null }>();
  if (!l?.email_addr) return;
  if ((await settings(db)).email_replies !== '1') return;
  const link = l.room ? `\n\n—\nYour project chat: https://vaxogroup.com/room/?t=${l.room}` : '';
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
    body: JSON.stringify({ from: fromAddr, to: [l.email_addr], subject: `Your Vaxo project #${leadId}`, text: text.slice(0, 8000) + link, html: brandHtml(text.slice(0, 8000) + link) }),
  }).catch(() => null);
}

/** Any letter from hello@vaxogroup.com (sign-in codes, notices). False when Resend is not connected yet. */
const escHtml = (t: string) => t.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
/** Letters get the Vax avatar header and the brand look; the plain text is always sent along. */
export function brandHtml(text: string): string {
  return `<div style="background:#f6f2ea;padding:24px 12px;font-family:Arial,Helvetica,sans-serif"><div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e8e1d3">` +
    `<div style="background:#e4a93f;padding:20px;text-align:center"><img src="https://vaxogroup.com/mascot/vax-avatar.png" width="88" height="88" alt="Vax" style="border-radius:50%;display:block;margin:0 auto 8px;border:4px solid #fff"><div style="font-size:22px;font-weight:800;color:#17150f">Vaxo<span style="color:#fff">.</span></div></div>` +
    `<div style="padding:24px;font-size:16px;line-height:1.6;color:#17150f">${escHtml(text).replace(/\n/g, '<br>')}</div>` +
    `<div style="padding:14px 24px;background:#faf7f1;color:#8a8372;font-size:12px;text-align:center">Vaxo · <a href="https://vaxogroup.com" style="color:#8a8372">vaxogroup.com</a></div></div></div>`;
}

export async function sendMail(to: string, subject: string, text: string, html?: string): Promise<boolean> {
  if (!resendKey || !fromAddr) return false;
  html = html ?? brandHtml(text);
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendKey}` },
    body: JSON.stringify({ from: fromAddr, to: [to], subject, text, html }),
  }).catch(() => null);
  return !!r?.ok;
}

export const mailReady = () => !!resendKey && !!fromAddr;
