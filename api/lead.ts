// Vercel runs this file as a native ES module: relative imports need the .js extension.
import { handleLead, type LeadEnv } from '../src/lib/lead.js';

const ENV_KEYS = ['TELEGRAM_BOT_TOKEN', 'TELEGRAM_CHAT_ID', 'RESEND_API_KEY', 'LEAD_EMAIL_TO', 'LEAD_EMAIL_FROM'] as const;

// Values pasted into the Vercel dashboard often carry stray spaces or newlines.
function readEnv(): LeadEnv {
  return Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]?.trim() || undefined]));
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { ok: false });
  }
  const { status, body: out } = await handleLead(body, readEnv(), fetch);
  return json(status, out);
}

export function GET(): Response {
  return json(405, { ok: false });
}
