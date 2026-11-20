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
    // 20.11 (tested live): on silence or room noise Whisper invents whole phrases («Вакс, ты меня слышишь? Приём», an echo
    // of the hint words). Each piece carries how sure it is that there was speech at all — keep only the confident ones.
    const r = (await ai.run('@cf/openai/whisper-large-v3-turbo', { audio: b64, ...(LANG[lang] ? { language: LANG[lang] } : {}), initial_prompt: 'Ваксо, VAXO.', vad_filter: true })) as { text?: string; segments?: { text?: string; no_speech_prob?: number; avg_logprob?: number; compression_ratio?: number }[] };
    const segs = Array.isArray(r?.segments) ? r.segments : null;
    const text = segs ? segs.filter((g) => (g.no_speech_prob ?? 0) < 0.5 && (g.avg_logprob ?? 0) > -1 && (g.compression_ratio ?? 1) < 2.4).map((g) => String(g.text || '').trim()).join(' ') : r?.text;
    return out(200, { ok: true, text: clean(text), raw: String(r?.text || '').slice(0, 300), segs: segs ? segs.map((g) => [Math.round((g.no_speech_prob ?? 0) * 100) / 100, Math.round((g.avg_logprob ?? 0) * 100) / 100]) : null });
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
const FAKE = /ии-помощник|^(\s*(ваксо|vaxo|вакс|vax)[\s,.!?]*){2,}$|(редактор|корректор)\s+субтитров|субтитры (сделал|делал|создавал)|продолжение следует|спасибо за просмотр|подписывайтесь на канал|amara\.org|thanks for watching|subtitles by|DimaTorzok/i;
function clean(t?: string): string {
  const x = (t || '').trim();
  if (!x || FAKE.test(x) || x.replace(/[^\p{L}]/gu, '').length < 2) return '';
  return x.slice(0, 2000);
}
