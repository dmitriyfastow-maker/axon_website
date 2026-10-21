// Voice input fallback: a short recorded clip → text (Workers AI Whisper, free allocation). Browsers that recognise
// speech themselves (Chrome, Safari, Edge) never call this.
import type { AiBinding } from './chat.js';

const MAX_BYTES = 3_000_000; // ~1 minute of compressed audio
const LANG: Record<string, string> = { en: 'en', ru: 'ru', ua: 'uk', uk: 'uk' };

export async function handleStt(ai: AiBinding | undefined, request: Request, lang: string): Promise<Response> {
  const out = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  if (request.method !== 'POST') return out(405, { ok: false });
  if (!ai) return out(503, { ok: false });
  const buf = new Uint8Array(await request.arrayBuffer());
  if (!buf.length || buf.length > MAX_BYTES) return out(413, { ok: false });
  let b64 = '';
  for (let i = 0; i < buf.length; i += 0x8000) b64 += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  b64 = btoa(b64);
  try {
    const r = (await ai.run('@cf/openai/whisper-large-v3-turbo', { audio: b64, ...(LANG[lang] ? { language: LANG[lang] } : {}) })) as { text?: string };
    return out(200, { ok: true, text: (r?.text || '').trim().slice(0, 2000) });
  } catch (err) {
    console.error('[stt]', err);
    try {
      const r = (await ai.run('@cf/openai/whisper', { audio: [...buf] })) as { text?: string };
      return out(200, { ok: true, text: (r?.text || '').trim().slice(0, 2000) });
    } catch (e) {
      console.error('[stt fallback]', e);
      return out(502, { ok: false });
    }
  }
}
