// Cloudflare Worker: serves the static site from ./dist and handles the lead form.
import { handleLead, type LeadEnv, type LeadInput } from '../src/lib/lead.js';

interface D1 {
  prepare(sql: string): { bind(...values: unknown[]): { run(): Promise<unknown> } };
}

interface Env extends LeadEnv {
  ASSETS: { fetch(request: Request): Promise<Response> };
  LEADS?: D1;
}

const ENV_KEYS = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'RESEND_API_KEY', 'LEAD_EMAIL_TO', 'LEAD_EMAIL_FROM'] as const;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.hostname === 'www.vaxogroup.com') {
      url.hostname = 'vaxogroup.com';
      return Response.redirect(url.toString(), 301);
    }
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
            await db
              .prepare('INSERT INTO leads (mode, name, contact, interest, message, lang, ref, country, page) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
              .bind(l.mode, l.name, l.contact, l.interest, l.message, l.lang, l.ref ?? null, country, page)
              .run();
          }
        : undefined;
      const { status, body: out } = await handleLead(body, leadEnv, fetch, Date.now(), save);
      return json(status, out);
    }
    return env.ASSETS.fetch(request);
  },
};
