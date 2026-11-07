// Cloudflare Worker: serves the static site from ./dist and handles the lead form.
import { handleWorkspace } from './workspace.js';
import { servePage } from './modules.js';
import { checkDomains, serveOwnDomain, TARGET } from './domains.js';
import { handleLead, type LeadEnv, type LeadInput } from '../src/lib/lead.js';
import { handlePartnerApi, handleRedirect, type DB } from './partner.js';
import { handleAdminApi, handleFactorySync } from './admin.js';
import { handleChat, type AiBinding } from './chat.js';
import { draftBrief, logEvent, sweep, type Notify } from './deals.js';
import { bindReturningClient, handleRoomApi, newRoom } from './rooms.js';
import { aiFollowups, aiReply, decideOffer, learnFromChats, rescueUnanswered } from './aimanager.js';
import { configureTelegram, ensureWebhook, handleTelegram } from './telegram.js';
import { handleCollab } from './collab.js';
import { configureRouter } from './router.js';
import { configureMail, handleEmail, type IncomingEmail } from './mail.js';
import { handleStt } from './stt.js';
import { handleFileUpload, servePreview, serveFile, type KV } from './files.js';
import { handleCabinet, type CabinetEnv } from './cabinet.js';
import { handleInvoicePublic } from './invoices.js';
import { handleStaffLogin } from './staff.js';
import { handleLevel } from './level.js';
import { handleBiz, handleCollect, snippet } from './biz.js';
import { handleDemoAi } from './demoai.js';
import { monoCheck, monoPay, monoReceiptSweep, monoWebhook } from './mono.js';
import { handleFinancePublic } from './finance.js';
import { handleIntake } from './intake.js';
import { attributeLead, clientRedirect, matureReferrals, SLUG_C } from './referrals.js';
import { monthlyBilling } from './billing.js';
import { handleLab, handleLabManage, labSweep } from './lab.js';
import { handleShopBuy, handleShopDownload } from './shop.js';
import { buyerRef } from './buyers.js';
import { notifyOwnerChat } from './ownerchat.js';
import { gradePending, pruneBots, maybeDigest, qcSweep, summarizeClients, trackEvent, trackUx, trackView, triageLead } from './autopilot.js';

interface Env extends LeadEnv, CabinetEnv {
  ASSETS: { fetch(request: Request): Promise<Response> };
  LEADS?: DB;
  ADMIN_TOKEN?: string;
  AI?: AiBinding;
  FILES?: KV;
  MONO_ACQ_TOKEN?: string;
  ANTHROPIC_API_KEY?: string;
  CF_SAAS_TOKEN?: string;
}

const ENV_KEYS = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'RESEND_API_KEY', 'LEAD_EMAIL_TO', 'LEAD_EMAIL_FROM'] as const;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export default {
  async fetch(request: Request, env: Env, ctx?: { waitUntil(p: Promise<unknown>): void }): Promise<Response> {
    const url = new URL(request.url);
    // Decision 42: the zone-wide route also brings clients' own domains and any other name on the zone. Our two names
    // go on as usual; a client's domain gets its page; anything else passes straight through to where it pointed before.
    const own = url.hostname === 'vaxogroup.com' || url.hostname === 'www.vaxogroup.com' || url.hostname === 'localhost' || url.hostname === '127.0.0.1' || url.hostname.endsWith('.workers.dev');
    if (!own) {
      if (url.hostname === TARGET) return new Response('Vaxo sites. Point a CNAME here from your domain: https://vaxogroup.com/me/#modules\n', { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
      const page = env.LEADS && !url.hostname.endsWith('.vaxogroup.com') ? await serveOwnDomain(env.LEADS, url) : null;
      if (page === null) return fetch(request);
      if (page !== 'pass') return page;
    }
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
    configureRouter(env.ANTHROPIC_API_KEY);
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
    if (r && env.LEADS && SLUG_C.test(r[1].toLowerCase())) return clientRedirect(env.LEADS, request, r[1].toLowerCase());
    if (r) return env.LEADS ? handleRedirect(env.LEADS, request, r[1].toLowerCase()) : Response.redirect(new URL('/', url).toString(), 302);
    if (url.pathname.startsWith('/api/partner/')) {
      if (!env.LEADS) return json(503, { ok: false });
      const ppath = url.pathname.slice('/api/partner/'.length);
      const res = await handlePartnerApi(env.LEADS, request, ppath, notify, env.AI);
      // A new manager application is graded by AI right away.
      if (ppath === 'deals/apply' && res.ok) waitUntil(gradePending(env.LEADS, env.AI, notify));
      return res;
    }
    if (url.pathname === '/api/ux' && request.method === 'POST') {
      if (env.LEADS) await trackUx(env.LEADS, request).catch(() => {});
      return new Response(null, { status: 204 });
    }
    if (url.pathname === '/api/ev' && request.method === 'POST') {
      if (env.LEADS) await trackEvent(env.LEADS, request).catch(() => {});
      return new Response(null, { status: 204 });
    }
    if (url.pathname === '/api/admin' || url.pathname.startsWith('/api/admin/')) {
      if (!env.LEADS) return json(503, { ok: false });
      return handleAdminApi(env.LEADS, request, env.ADMIN_TOKEN, url.pathname.slice('/api/admin'.length).replace(/^\//, ''), notify, env.AI, !!env.MONO_ACQ_TOKEN);
    }
    if (url.pathname === '/api/collab') {
      if (!env.LEADS) return json(503, { ok: false });
      return handleCollab(env.LEADS, request, notify, (id) => waitUntil(aiReply(env.LEADS!, env.AI, id, notify, { greet: true }).catch((e) => console.error('[ai collab]', e))));
    }
    if (url.pathname === '/api/tg') {
      if (!env.LEADS) return json(503, { ok: false });
      return handleTelegram(env.LEADS, request, notify, (id, greet) => waitUntil(aiReply(env.LEADS!, env.AI, id, notify, { greet }).catch((e) => console.error('[ai tg]', e))), (id, choice) => decideOffer(env.LEADS!, env.AI, id, choice, notify));
    }
    const room = url.pathname.match(/^\/api\/room\/([a-f0-9]{24})$/);
    if (room) return env.LEADS ? handleRoomApi(env.LEADS, request, room[1], notify, (id) => waitUntil(aiReply(env.LEADS!, env.AI, id, notify).catch((e) => console.error('[ai reply]', e)))) : json(503, { ok: false });
    if (url.pathname === '/api/intake') return env.LEADS ? handleIntake(env.LEADS, request, notify, (id) => waitUntil(aiReply(env.LEADS!, env.AI, id, notify).catch((e) => console.error('[ai intake]', e)))) : json(503, { ok: false });
    if (url.pathname === '/api/fin') return env.LEADS ? handleFinancePublic(env.LEADS, request, env.AI, notify) : json(503, { ok: false });
    if (url.pathname === '/api/demo/ai') return handleDemoAi(env.AI, request);
    if (url.pathname === '/api/staff/code' || url.pathname === '/api/staff/login') return env.LEADS ? handleStaffLogin(env.LEADS, request, url.pathname.slice('/api/staff/'.length), notify) : json(503, { ok: false });
    // Owner app (Decision 29): one line of code on the client's site + their business in /me/.
    if (url.pathname === '/w.js') {
      const k = url.searchParams.get('k') || '';
      if (!/^[a-f0-9]{24}$/.test(k)) return new Response('', { status: 400 });
      // The AI chat bubble is added only when the owner filled in "About the business" — it needs facts to answer.
      const chatName = env.LEADS ? ((await env.LEADS.prepare("SELECT name FROM biz WHERE key = ? AND about IS NOT NULL AND about != ''").bind(k).first<{ name: string }>().catch(() => null))?.name ?? '') : '';
      return new Response(snippet(k, url.origin, chatName), { headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=600', 'Access-Control-Allow-Origin': '*' } });
    }
    if (url.pathname === '/api/factory-sync') return env.LEADS ? handleFactorySync(env.LEADS, request) : json(503, { ok: false });
    if (url.pathname === '/api/w') return env.LEADS ? handleCollect(env.LEADS, request, env.AI, waitUntil) : json(503, { ok: false });
    if (url.pathname === '/api/biz' || url.pathname.startsWith('/api/biz/')) return env.LEADS ? handleBiz(env.LEADS, request, url.pathname.slice('/api/biz'.length).replace(/^\//, ''), env.AI, notify, url.origin) : json(503, { ok: false });
    if (url.pathname === '/api/ws' || url.pathname.startsWith('/api/ws/')) return env.LEADS ? handleWorkspace(env.LEADS, env.AI, request, url.pathname.slice('/api/ws'.length).replace(/^\//, ''), notify, waitUntil, { token: env.CF_SAAS_TOKEN }) : json(503, { ok: false });
    const hosted = url.pathname.match(/^\/s\/([a-z0-9-]{3,60})(\/manifest\.webmanifest)?\/?$/);
    if (hosted) return env.LEADS ? servePage(env.LEADS, hosted[1], !!hosted[2]) : json(503, { ok: false });
    if (url.pathname === '/api/me' || url.pathname.startsWith('/api/me/')) return env.LEADS ? handleCabinet(env.LEADS, env, request, url.pathname.slice('/api/me'.length).replace(/^\//, ''), notify, env.AI) : json(503, { ok: false });
    const invm = url.pathname.match(/^\/api\/invoice\/([a-f0-9]{32})$/);
    if (invm) return env.LEADS ? handleInvoicePublic(env.LEADS, invm[1], !!env.MONO_ACQ_TOKEN) : json(503, { ok: false });
    const invp = url.pathname.match(/^\/api\/invoice\/([a-f0-9]{32})\/(pay|check)$/);
    if (invp && env.LEADS) {
      if (invp[2] === 'pay' && request.method === 'POST') return monoPay(env.LEADS, env.MONO_ACQ_TOKEN, invp[1], url.origin);
      if (invp[2] === 'check') return monoCheck(env.LEADS, env.MONO_ACQ_TOKEN, env.AI, notify, invp[1], request.url);
    }
    if (url.pathname === '/api/shop/buy') return env.LEADS ? handleShopBuy(env.LEADS, request, env.MONO_ACQ_TOKEN, notify, url.origin) : json(503, { ok: false });
    if (url.pathname === '/api/shop/dl') return env.LEADS ? handleShopDownload(env.LEADS, env.FILES, request) : json(503, { ok: false });
    if (url.pathname === '/api/level') return env.LEADS ? handleLevel(env.LEADS, request, env.AI).catch(() => json(503, { ok: false, error: 'soon' })) : json(503, { ok: false });
    if (url.pathname === '/api/lab/manage') return env.LEADS ? handleLabManage(env.LEADS, request, env.MONO_ACQ_TOKEN, notify, url.origin) : json(503, { ok: false });
    if (url.pathname === '/api/lab') return env.LEADS ? handleLab(env.LEADS, request, env.MONO_ACQ_TOKEN, notify, url.origin) : json(503, { ok: false });
    if (url.pathname === '/api/mono/webhook') return env.LEADS ? monoWebhook(env.LEADS, env.MONO_ACQ_TOKEN, env.AI, notify, request) : json(503, { ok: false });
    if (url.pathname === '/api/file') return env.LEADS ? handleFileUpload(env.FILES, env.LEADS, request, env.AI, waitUntil) : json(503, { ok: false });
    // Short tracked links for bios (vaxogroup.com/go/<name>): count the click, then send the person on.
    const go = url.pathname.match(/^\/go\/([a-z0-9-]{2,30})(?:\/([A-Za-z0-9_-]{1,40}))?\/?$/);
    if (go) {
      const GO: Record<string, string> = {
        vaxo: '/?utm_source=instagram_dmitriy&utm_content=linktree',
        insiders: 'https://discord.com/invite/aUgWVKhzSM',
        lab: '/lab/?utm_source=discord',
        'vaxo-yt': '/?utm_source=youtube_dmitriy',
        'vaxo-tt': '/?utm_source=tiktok_dmitriy',
        'vaxo-discord': '/?utm_source=discord&utm_content=insiders',
      };
      // Vaxo brand accounts: /go/<network>[/<video>] -> every click is tagged source_vaxo / social / network / content.
      const NET = ['ig', 'tt', 'yt', 'th', 'x', 'li', 'fb', 'dc', 'tg', 'pin'];
      if (NET.includes(go[1])) GO[go[1]] = '/?utm_source=' + go[1] + '_vaxo&utm_medium=social&utm_campaign=' + go[1] + '&utm_content=' + (go[2] || 'bio');
      const to = GO[go[1]];
      if (!to) return Response.redirect(url.origin + '/', 302);
      if (env.LEADS && !/bot|crawl|spider|preview|facebookexternalhit|curl|wget/i.test(request.headers.get('User-Agent') || ''))
        waitUntil(env.LEADS.prepare('INSERT INTO events (kind, path, country) VALUES (?, ?, ?)').bind('go', '/go/' + go[1] + (go[2] ? '/' + go[2] : ''), (request as { cf?: { country?: string } }).cf?.country ?? null).run().catch(() => {}));
      return Response.redirect(to.startsWith('http') ? to : url.origin + to, 302);
    }
    const file = url.pathname.match(/^\/f\/([a-f0-9]{20})(?:\/|$)/);
    if (file) return serveFile(env.FILES, file[1]);
    const prev = url.pathname.match(/^\/p\/([a-f0-9]{20})\/?$/);
    if (prev) return servePreview(env.FILES, prev[1]);
    if (url.pathname === '/api/stt') return handleStt(env.AI, request, url.searchParams.get('lang') || '');
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
              .prepare('INSERT INTO leads (mode, name, contact, interest, message, lang, ref, country, page, room, promo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
              .bind(l.mode, l.name, l.contact, l.interest, l.message, l.lang, l.ref ?? null, country, page, roomToken, l.promo ?? null)
              .run()) as { meta?: { last_row_id?: number } };
            const id = res?.meta?.last_row_id;
            // A plan button on the site writes "[PLAN care] ...": remember the chosen plan (the free first month starts).
            const pm = /^\[PLAN (personal|care|growth|pro)\]/.exec(l.message || '');
            if (id && pm) await db.prepare('UPDATE leads SET plan = ? WHERE id = ?').bind(pm[1], id).run().catch(() => {});
            // Lifetime partner attribution by e-mail: a returning buyer keeps the partner they first came by.
            if (id) {
              const lr = await buyerRef(db, l.contact, l.ref ?? null);
              if (lr && lr !== (l.ref ?? null)) { l.ref = lr; await db.prepare('UPDATE leads SET ref = ? WHERE id = ?').bind(lr, id).run(); }
            }
            // Where the visitor first came from (scripts/track.ts sends it in a header).
            const src = (request.headers.get('X-Vx-Src') || '').slice(0, 80);
            if (id && src) await db.prepare('UPDATE leads SET source = ? WHERE id = ?').bind(src, id).run();
            // A client from a partner's "for friends" link gets the friends mode.
            // Who invited them (client or partner link): first link wins, the friend gets 2 free months.
            if (id && l.ref) await attributeLead(db, id, l.ref, request.headers.get('CF-Connecting-IP'), notify);
            if (id && l.ref && !l.promo) {
              const fl = await db.prepare('SELECT friend FROM links WHERE slug = ?').bind(l.ref).first<{ friend: number }>();
              if (fl?.friend) await db.prepare(`UPDATE leads SET promo = 'FRIEND' WHERE id = ?`).bind(id).run();
            }
            // Background: an AI client profile for the closer and the first line of the lead's history.
            if (id) waitUntil((async () => {
              await logEvent(db, id, 'system', 'note', 'Request received from the site');
              await bindReturningClient(db, id, l.contact, notify);
              // Vax greets first (the client is looking at the chat right now), then the brief and triage.
              // Gift waitlist: Vax talks to them, but it is not a sales lead for managers.
              if (l.interest?.startsWith('gift-') && l.interest !== 'gift-business') {
                await db.prepare(`UPDATE leads SET status = 'gift' WHERE id = ?`).bind(id).run();
                await aiReply(db, env.AI, id, notify, { greet: true });
                return;
              }
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
    // Only pages that exist count: scanners probing /wordpress/, /cms/ and the like got 404 and inflated the numbers (01.11).
    // Language by browser (Accept-Language) on a first visit to an unprefixed page; any other language gets clean EN.
    // Skipped when the person came from our own site (they chose a language) or when it is not a plain page request.
    if (request.method === 'GET' && ['/', '/app/', '/me/', '/examples/', '/how/', '/partners/', '/shop/', '/start/', '/about/'].includes(url.pathname)) {
      const al = (request.headers.get('Accept-Language') || '').toLowerCase();
      const first = al.split(',')[0].trim().slice(0, 2);
      const ours = (request.headers.get('Referer') || '').includes(url.host);
      const target = first === 'uk' ? '/ua' : first === 'ru' ? '/ru' : '';
      if (target && !ours && !/bot|crawl|spider|preview/i.test(request.headers.get('User-Agent') || ''))
        return Response.redirect(url.origin + target + url.pathname + url.search, 302);
    }
    const page = await env.ASSETS.fetch(request);
    if (page.status === 200 && env.LEADS && request.method === 'GET' && !/^\/(admin|room|partner|ua\/partner|ru\/partner|demo)\b/.test(url.pathname) && (url.pathname.endsWith('/') || !url.pathname.includes('.'))) {
      waitUntil(trackView(env.LEADS, request, url).catch(() => {}));
    }
    return page;
  },
  // Hourly: overdue leads go back to the pool even when nobody opens the cabinet.
  async scheduled(_event: unknown, env: Env): Promise<void> {
    if (!env.LEADS) return;
    const tok = env.TELEGRAM_BOT_TOKEN?.trim();
    const chat = env.TELEGRAM_CHAT_ID?.trim();
    configureTelegram(tok, chat);
    configureMail(env.RESEND_API_KEY, env.LEAD_EMAIL_FROM);
    configureRouter(env.ANTHROPIC_API_KEY);
    const notify: Notify = async (text) => {
      if (!tok || !chat) return;
      await fetch(`https://api.telegram.org/bot${tok}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: chat, text }),
      }).catch(() => {});
    };
    // The autopilot's hourly round: deadlines, AI grading, quality control, client summaries, the morning digest.
    for (const job of [() => checkDomains(env.LEADS!, { token: env.CF_SAAS_TOKEN }, notify), () => sweep(env.LEADS!, notify), () => gradePending(env.LEADS!, env.AI, notify), () => qcSweep(env.LEADS!, env.AI, notify), () => summarizeClients(env.LEADS!, env.AI), () => maybeDigest(env.LEADS!, env.AI, notify), () => aiFollowups(env.LEADS!, env.AI, notify), () => learnFromChats(env.LEADS!, env.AI), () => notifyOwnerChat(env.LEADS!, notify), () => monoReceiptSweep(env.LEADS!, env.MONO_ACQ_TOKEN, notify), () => labSweep(env.LEADS!, env.MONO_ACQ_TOKEN, notify), () => matureReferrals(env.LEADS!, notify), () => rescueUnanswered(env.LEADS!, env.AI, notify), () => monthlyBilling(env.LEADS!, notify), () => pruneBots(env.LEADS!)]) {
      await job().catch((e) => console.error('[cron]', e));
    }
  },  // Letters to hello@vaxogroup.com (Cloudflare Email Routing → this worker) go into the client's project chat.
  async email(message: IncomingEmail, env: Env, ctx?: { waitUntil(p: Promise<unknown>): void }): Promise<void> {
    if (!env.LEADS) return;
    const tok = env.TELEGRAM_BOT_TOKEN?.trim();
    const chat = env.TELEGRAM_CHAT_ID?.trim();
    configureTelegram(tok, chat);
    configureMail(env.RESEND_API_KEY, env.LEAD_EMAIL_FROM);
    configureRouter(env.ANTHROPIC_API_KEY);
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
