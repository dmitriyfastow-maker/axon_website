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
    const r = (await ai.run('@cf/openai/whisper-large-v3-turbo', { audio: b64, ...(LANG[lang] ? { language: LANG[lang] } : {}), initial_prompt: 'VAXO, Ваксо, Vax — ИИ-помощник. Привет, VAXO.', vad_filter: true })) as { text?: string };
    return out(200, { ok: true, text: clean(r?.text) });
  } catch (err) {
    console.error('[stt]', err);
    try {
      const r = (await ai.run('@cf/openai/whisper', { audio: [...buf] })) as { text?: string };
      return out(200, { ok: true, text: clean(r?.text) });
    } catch (e) {
      console.error('[stt fallback]', e);
      return out(502, { ok: false });
    }
  }
}

/** Whisper invents credits and sign-offs on silence or noise («Редактор субтитров…», «Продолжение следует…»): drop them. */
const FAKE = /(редактор|корректор)\s+субтитров|субтитры (сделал|делал|создавал)|продолжение следует|спасибо за просмотр|подписывайтесь на канал|amara\.org|thanks for watching|subtitles by|DimaTorzok/i;
function clean(t?: string): string {
  const x = (t || '').trim();
  if (!x || FAKE.test(x) || x.replace(/[^\p{L}]/gu, '').length < 2) return '';
  return x.slice(0, 2000);
}
