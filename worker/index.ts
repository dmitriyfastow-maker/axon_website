// Cloudflare Worker: serves the static site from ./dist and handles the lead form.
import { handleLead, type LeadEnv, type LeadInput } from '../src/lib/lead.js';
import { handlePartnerApi, handleRedirect, type DB } from './partner.js';
import { handleAdminApi } from './admin.js';
import { handleChat, type AiBinding } from './chat.js';
import { draftBrief, logEvent, sweep, type Notify } from './deals.js';
import { bindReturningClient, handleRoomApi, newRoom } from './rooms.js';
import { aiFollowups, aiReply } from './aimanager.js';
import { configureTelegram, ensureWebhook, handleTelegram } from './telegram.js';
import { handleCollab } from './collab.js';
import { configureMail, handleEmail, type IncomingEmail } from './mail.js';
import { gradePending, maybeDigest, qcSweep, summarizeClients, trackEvent, trackView, triageLead } from './autopilot.js';

interface Env extends LeadEnv {
  ASSETS: { fetch(request: Request): Promise<Response> };
  LEADS?: DB;
  ADMIN_TOKEN?: string;
  AI?: AiBinding;
}

const ENV_KEYS = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'RESEND_API_KEY', 'LEAD_EMAIL_TO', 'LEAD_EMAIL_FROM'] as const;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export default {
  async fetch(request: Request, env: Env, ctx?: { waitUntil(p: Promise<unknown>): void }): Promise<Response> {
    const url = new URL(request.url);
    if (url.hostname === 'www.vaxogroup.com') {
      url.hostname = 'vaxogroup.com';
      return Response.redirect(url.toString(), 301);
    }
    // Ukrainian language law (art. 27): visitors from Ukraine get the Ukrainian version by default, unless they picked a language.
    const country = (request as Request & { cf?: { country?: string } }).cf?.country;
    if (url.pathname === '/' && request.method === 'GET' && country === 'UA' && !/(?:^|;\s*)vaxo_lang=/.test(request.headers.get('Cookie') || '')) {
      return Response.redirect(new URL('/ua/' + url.search, url).toString(), 302);
    }
    const waitUntil = (p: Promise<unknown>) => (ctx ? ctx.waitUntil(p) : void p);
    configureTelegram(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID);
    configureMail(env.RESEND_API_KEY, env.LEAD_EMAIL_FROM);
    if (env.LEADS && url.hostname === 'vaxogroup.com') waitUntil(ensureWebhook(env.LEADS, url.origin).catch(() => {}));
    const notify: Notify = async (text) => {
      const tok = env.TELEGRAM_BOT_TOKEN?.trim();
      const chat = env.TELEGRAM_CHAT_ID?.trim();
      if (!tok || !chat) return;
      await fetch(`https://api.telegram.org/bot${tok}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chat, text, disable_web_page_preview: true }),
      }).catch(() => {});
    };
    const r = url.pathname.match(/^\/r\/([^/]+)\/?$/);
    if (r) return env.LEADS ? handleRedirect(env.LEADS, request, r[1].toLowerCase()) : Response.redirect(new URL('/', url).toString(), 302);
    if (url.pathname.startsWith('/api/partner/')) {
      if (!env.LEADS) return json(503, { ok: false });
      const ppath = url.pathname.slice('/api/partner/'.length);
      const res = await handlePartnerApi(env.LEADS, request, ppath, notify, env.AI);
      // A new manager application is graded by AI right away.
      if (ppath === 'deals/apply' && res.ok) waitUntil(gradePending(env.LEADS, env.AI, notify));
      return res;
    }
    if (url.pathname === '/api/ev' && request.method === 'POST') {
      if (env.LEADS) await trackEvent(env.LEADS, request).catch(() => {});
      return new Response(null, { status: 204 });
    }
    if (url.pathname === '/api/admin' || url.pathname.startsWith('/api/admin/')) {
      if (!env.LEADS) return json(503, { ok: false });
      return handleAdminApi(env.LEADS, request, env.ADMIN_TOKEN, url.pathname.slice('/api/admin'.length).replace(/^\//, ''), notify, env.AI);
    }
    if (url.pathname === '/api/collab') {
      if (!env.LEADS) return json(503, { ok: false });
      return handleCollab(env.LEADS, request, notify, (id) => waitUntil(aiReply(env.LEADS!, env.AI, id, notify, { greet: true }).catch((e) => console.error('[ai collab]', e))));
    }
    if (url.pathname === '/api/tg') {
      if (!env.LEADS) return json(503, { ok: false });
      return handleTelegram(env.LEADS, request, notify, (id, greet) => waitUntil(aiReply(env.LEADS!, env.AI, id, notify, { greet }).catch((e) => console.error('[ai tg]', e))));
    }
    const room = url.pathname.match(/^\/api\/room\/([a-f0-9]{24})$/);
    if (room) return env.LEADS ? handleRoomApi(env.LEADS, request, room[1], notify, (id) => waitUntil(aiReply(env.LEADS!, env.AI, id, notify).catch((e) => console.error('[ai reply]', e)))) : json(503, { ok: false });
    if (url.pathname === '/api/chat') return handleChat(env, request, ctx ? (p) => ctx.waitUntil(p) : undefined);
    if (url.pathname === '/api/lead') {
      if (request.method !== 'POST') return json(405, { ok: false });
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return json(400, { ok: false });
      }
      const leadEnv: LeadEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, env[k]?.trim() || undefined]));
      const db = env.LEADS;
      const country = (request as { cf?: { country?: string } }).cf?.country ?? null;
      const page = request.headers.get('Referer');
      const roomToken = newRoom();
      const save = db
        ? async (l: LeadInput) => {
            const res = (await db
              .prepare('INSERT INTO leads (mode, name, contact, interest, message, lang, ref, country, page, room) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
              .bind(l.mode, l.name, l.contact, l.interest, l.message, l.lang, l.ref ?? null, country, page, roomToken)
              .run()) as { meta?: { last_row_id?: number } };
            const id = res?.meta?.last_row_id;
            // Background: an AI client profile for the closer and the first line of the lead's history.
            if (id) waitUntil((async () => {
              await logEvent(db, id, 'system', 'note', 'Request received from the site');
              await bindReturningClient(db, id, l.contact, notify);
              // Vax greets first (the client is looking at the chat right now), then the brief and triage.
              await aiReply(db, env.AI, id, notify, { greet: true });
              await draftBrief(db, env.AI, id);
              await triageLead(db, env.AI, id, notify);
            })().catch((e) => console.error('[lead bg]', e)));
          }
        : undefined;
      const { status, body: out } = await handleLead(body, leadEnv, fetch, Date.now(), save);
      // The client gets a link to their private project chat right away.
      return json(status, status === 200 && db ? { ...(out as object), room: roomToken } : out);
    }
    // Anonymous page-view analytics for public pages (no cookies, no IP).
    if (env.LEADS && request.method === 'GET' && !/^\/(admin|room|partner|ua\/partner|ru\/partner|demo)\b/.test(url.pathname) && (url.pathname.endsWith('/') || !url.pathname.includes('.'))) {
      waitUntil(trackView(env.LEADS, request, url).catch(() => {}));
    }
    return env.ASSETS.fetch(request);
  },
  // Hourly: overdue leads go back to the pool even when nobody opens the cabinet.
  async scheduled(_event: unknown, env: Env): Promise<void> {
    if (!env.LEADS) return;
    const tok = env.TELEGRAM_BOT_TOKEN?.trim();
    const chat = env.TELEGRAM_CHAT_ID?.trim();
    configureTelegram(tok, chat);
    configureMail(env.RESEND_API_KEY, env.LEAD_EMAIL_FROM);
    const notify: Notify = async (text) => {
      if (!tok || !chat) return;
      await fetch(`https://api.telegram.org/bot${tok}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text }),
      }).catch(() => {});
    };
    // The autopilot's hourly round: deadlines, AI grading, quality control, client summaries, the morning digest.
    for (const job of [() => sweep(env.LEADS!, notify), () => gradePending(env.LEADS!, env.AI, notify), () => qcSweep(env.LEADS!, env.AI, notify), () => summarizeClients(env.LEADS!, env.AI), () => maybeDigest(env.LEADS!, env.AI, notify), () => aiFollowups(env.LEADS!, env.AI, notify)]) {
      await job().catch((e) => console.error('[cron]', e));
    }
  },  // Letters to hello@vaxogroup.com (Cloudflare Email Routing → this worker) go into the client's project chat.
  async email(message: IncomingEmail, env: Env, ctx?: { waitUntil(p: Promise<unknown>): void }): Promise<void> {
    if (!env.LEADS) return;
    const tok = env.TELEGRAM_BOT_TOKEN?.trim();
    const chat = env.TELEGRAM_CHAT_ID?.trim();
    configureTelegram(tok, chat);
    configureMail(env.RESEND_API_KEY, env.LEAD_EMAIL_FROM);
    const notify: Notify = async (text) => {
      if (!tok || !chat) return;
      await fetch(`https://api.telegram.org/bot${tok}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text }),
      }).catch(() => {});
    };
    const jobs: Promise<unknown>[] = [];
    await handleEmail(env.LEADS, message, notify, (id, greet) => jobs.push(aiReply(env.LEADS!, env.AI, id, notify, { greet }).catch((e) => console.error('[ai mail]', e))));
    if (ctx) ctx.waitUntil(Promise.all(jobs)); else await Promise.all(jobs);
  },
};
