// Cloudflare Worker: serves the static site from ./dist and handles the lead form.
import { handleLead, type LeadEnv, type LeadInput } from '../src/lib/lead.js';
import { handlePartnerApi, handleRedirect, type DB } from './partner.js';
import { handleAdminApi } from './admin.js';
import { handleChat, type AiBinding } from './chat.js';
import { draftBrief, logEvent, sweep, type Notify } from './deals.js';

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
      return handlePartnerApi(env.LEADS, request, url.pathname.slice('/api/partner/'.length), notify);
    }
    if (url.pathname === '/api/admin' || url.pathname.startsWith('/api/admin/')) {
      if (!env.LEADS) return json(503, { ok: false });
      return handleAdminApi(env.LEADS, request, env.ADMIN_TOKEN, url.pathname.slice('/api/admin'.length).replace(/^\//, ''), notify);
    }
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
      const save = db
        ? async (l: LeadInput) => {
            const res = (await db
              .prepare('INSERT INTO leads (mode, name, contact, interest, message, lang, ref, country, page) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
              .bind(l.mode, l.name, l.contact, l.interest, l.message, l.lang, l.ref ?? null, country, page)
              .run()) as { meta?: { last_row_id?: number } };
            const id = res?.meta?.last_row_id;
            // Background: an AI client profile for the closer and the first line of the lead's history.
            if (id) waitUntil(Promise.all([logEvent(db, id, 'system', 'note', 'Request received from the site'), draftBrief(db, env.AI, id)]));
          }
        : undefined;
      const { status, body: out } = await handleLead(body, leadEnv, fetch, Date.now(), save);
      return json(status, out);
    }
    return env.ASSETS.fetch(request);
  },
  // Hourly: overdue leads go back to the pool even when nobody opens the cabinet.
  async scheduled(_event: unknown, env: Env): Promise<void> {
    if (!env.LEADS) return;
    const tok = env.TELEGRAM_BOT_TOKEN?.trim();
    const chat = env.TELEGRAM_CHAT_ID?.trim();
    await sweep(env.LEADS, async (text) => {
      if (!tok || !chat) return;
      await fetch(`https://api.telegram.org/bot${tok}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text }),
      }).catch(() => {});
    });
  },
};
