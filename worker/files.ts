// Files in every chat: a photo, a PDF, a voice note, a brief. The file goes to KV (free, up to 25 MB each) and the chat
// gets a link (/f/<id>/<name>), so Vax, the HQ, Telegram and email all see it without special handling.
import type { DB } from './partner.js';
import type { AiBinding } from './chat.js';

export interface KV {
  put(key: string, value: ArrayBuffer, opts?: { expirationTtl?: number; metadata?: unknown }): Promise<void>;
  getWithMetadata<M>(key: string, type: 'stream'): Promise<{ value: ReadableStream | null; metadata: M | null }>;
}

const MAX_BYTES = 25 * 1024 * 1024;
const PER_HOUR = 60; // per visitor
const KEEP = 60 * 60 * 24 * 365 * 2; // two years
const SAFE_INLINE = /^(image\/(png|jpe?g|gif|webp|avif|heic|heif)|application\/pdf|audio\/|video\/|text\/plain)/;

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const cleanName = (n: string) =>
  (n.normalize('NFC').replace(/[\\/:*?"<>|#%\u0000-\u001f]+/g, '_').replace(/\s+/g, '_').slice(-80) || 'file');

/** POST /api/file?name=<file name> with the raw file as the body. */
export async function handleFileUpload(kv: KV | undefined, db: DB, request: Request, ai?: AiBinding, waitUntil?: (p: Promise<unknown>) => void): Promise<Response> {
  if (request.method !== 'POST') return json(405, { ok: false });
  if (!kv) return json(503, { ok: false });
  const ip = request.headers.get('CF-Connecting-IP') || 'local';
  const recent = await db.prepare(`SELECT COUNT(*) AS n FROM files WHERE ip = ? AND at > datetime('now', '-1 hour')`).bind(ip).first<{ n: number }>();
  if ((recent?.n ?? 0) >= PER_HOUR) return json(429, { ok: false, error: 'too_many' });
  const len = Number(request.headers.get('Content-Length') || 0);
  if (len > MAX_BYTES) return json(413, { ok: false, error: 'too_big' });
  const buf = await request.arrayBuffer();
  if (!buf.byteLength) return json(400, { ok: false });
  if (buf.byteLength > MAX_BYTES) return json(413, { ok: false, error: 'too_big' });
  const name = cleanName(new URL(request.url).searchParams.get('name') || 'file');
  const type = (request.headers.get('Content-Type') || 'application/octet-stream').split(';')[0].slice(0, 100);
  const id = Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => b.toString(16).padStart(2, '0')).join('');
  await kv.put(id, buf, { expirationTtl: KEEP, metadata: { name, type } });
  await db.prepare('INSERT INTO files (id, ip, name, type, size) VALUES (?, ?, ?, ?, ?)').bind(id, ip, name, type, buf.byteLength).run();
  if (ai && waitUntil && /^image\/(png|jpe?g|webp|gif)$/.test(type) && buf.byteLength < 4_000_000) {
    waitUntil(describeImage(ai, buf, type).then((d) => d && db.prepare('UPDATE files SET descr = ? WHERE id = ?').bind(d, id).run()).catch((e) => console.error('[file describe]', e)));
  }
  return json(200, { ok: true, url: `${new URL(request.url).origin}/f/${id}/${encodeURIComponent(name)}`, name, type, size: buf.byteLength });
}

/** GET /f/<id>/<name>: images, PDFs, audio and video open in the browser; everything else downloads. */
export async function serveFile(kv: KV | undefined, id: string): Promise<Response> {
  if (!kv || !/^[a-f0-9]{20}$/.test(id)) return new Response('Not found', { status: 404 });
  const { value, metadata } = await kv.getWithMetadata<{ name: string; type: string }>(id, 'stream');
  if (!value) return new Response('Not found', { status: 404 });
  const type = metadata?.type || 'application/octet-stream';
  const inline = SAFE_INLINE.test(type);
  return new Response(value, {
    headers: {
      'Content-Type': inline ? type : 'application/octet-stream',
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(metadata?.name || 'file')}`,
      'Cache-Control': 'private, max-age=86400',
      'X-Robots-Tag': 'noindex',
      // Chrome's PDF viewer does not run inside a sandboxed page; other files get a locked-down page.
      ...(type === 'application/pdf' ? {} : { 'Content-Security-Policy': "default-src 'none'; img-src 'self'; media-src 'self'; style-src 'unsafe-inline'; sandbox" }),
    },
  });
}

/** One or two sentences about an image (a logo, a screenshot of a site, a photo of a shop), for Vax. */
async function describeImage(ai: AiBinding, buf: ArrayBuffer, type: string): Promise<string | null> {
  const bytes = new Uint8Array(buf);
  let b64 = '';
  for (let i = 0; i < bytes.length; i += 0x8000) b64 += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  const r = (await ai.run('@cf/google/gemma-4-26b-a4b-it', {
    messages: [{ role: 'user', content: [
      { type: 'text', text: 'A client sent this image to a digital studio (websites, apps, ads, design). Describe in 1-3 short English sentences what it shows and any readable text, brand names or problems visible. No preamble.' },
      { type: 'image_url', image_url: { url: `data:${type};base64,${btoa(b64)}` } },
    ] }],
    max_tokens: 200, temperature: 0.2, chat_template_kwargs: { enable_thinking: false },
  })) as Record<string, any>;
  const t = (typeof r?.response === 'string' ? r.response : r?.choices?.[0]?.message?.content || '').trim();
  return t ? t.slice(0, 600) : null;
}

/** Replace our file links in a chat text with what the AI should know: the name and, for images, what is on them. */
export async function filesForAi(db: DB, text: string): Promise<string> {
  const ids = [...text.matchAll(/\/f\/([a-f0-9]{20})\//g)].map((m) => m[1]);
  if (!ids.length) return text;
  const { results } = await db.prepare(`SELECT id, name, type, descr FROM files WHERE id IN (${ids.map(() => '?').join(',')})`).bind(...ids).all<{ id: string; name: string; type: string; descr: string | null }>();
  const by = new Map(results.map((f) => [f.id, f]));
  return text.replace(/📎 \S+ https?:\/\/\S+\/f\/([a-f0-9]{20})\/\S+/g, (m, id) => {
    const f = by.get(id);
    return f ? `[client attached file "${f.name}" (${f.type})${f.descr ? `: ${f.descr}` : ''}]` : m;
  });
}
