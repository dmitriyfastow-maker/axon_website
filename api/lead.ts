import { handleLead } from '../src/lib/lead';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { ok: false });
  }
  const { status, body: out } = await handleLead(body, process.env, fetch);
  return json(status, out);
}

export function GET(): Response {
  return json(405, { ok: false });
}
