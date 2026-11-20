// Live voices for «Привет, VAXO» (Decision 69, 20.11): text → natural speech with Google Gemini TTS.
// The key is pasted once in the HQ (settings gemini_key, sealed with ADMIN_TOKEN). Without a key the endpoint answers
// 501 and the browser falls back to its own voice. Only signed-in people; short pieces (the client sends sentence by sentence).
import type { DB } from './partner.js';
import { open as openSealed } from './sitepay.js';

export const VOICES: Record<string, string> = { warm: 'Sulafat', calm: 'Charon', bright: 'Puck', soft: 'Achernar', bold: 'Fenrir' };
const MODELS = ['gemini-2.5-flash-preview-tts', 'gemini-2.5-flash-tts'];
let cached: { key: string; at: number } | null = null;

export async function geminiKey(db: DB, adminToken?: string, envKey?: string): Promise<string | null> {
  if (envKey) return envKey;
  if (cached && Date.now() - cached.at < 300_000) return cached.key || null;
  const v = (await db.prepare("SELECT value FROM settings WHERE key = 'gemini_key'").first<{ value: string }>().catch(() => null))?.value;
  const key = v && adminToken ? await openSealed(adminToken, v).catch(() => '') : '';
  cached = { key: key || '', at: Date.now() };
  return key || null;
}
export function forgetGeminiKey() { cached = null; }

/** 16-bit mono PCM → a WAV file the browser can play. */
function wav(pcm: Uint8Array, rate = 24000): Uint8Array {
  const h = new DataView(new ArrayBuffer(44));
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) h.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); h.setUint32(4, 36 + pcm.length, true); w(8, 'WAVE'); w(12, 'fmt '); h.setUint32(16, 16, true); h.setUint16(20, 1, true);
  h.setUint16(22, 1, true); h.setUint32(24, rate, true); h.setUint32(28, rate * 2, true); h.setUint16(32, 2, true); h.setUint16(34, 16, true);
  w(36, 'data'); h.setUint32(40, pcm.length, true);
  const out = new Uint8Array(44 + pcm.length); out.set(new Uint8Array(h.buffer), 0); out.set(pcm, 44); return out;
}

export async function speakText(key: string, text: string, voice: string, style: string): Promise<Uint8Array | null> {
  const prompt = `${style}: ${text}`;
  for (const model of MODELS) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } } }),
    }).catch(() => null);
    if (!r) continue;
    if (r.status === 404) continue;
    if (!r.ok) return null;
    const d = (await r.json().catch(() => null)) as { candidates?: { content?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] } }[] } | null;
    const part = d?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
    if (!part?.data) return null;
    const rate = Number(/rate=(\d+)/.exec(part.mimeType || '')?.[1]) || 24000;
    const bin = Uint8Array.from(atob(part.data), (c) => c.charCodeAt(0));
    return wav(bin, rate);
  }
  return null;
}

export async function handleTts(db: DB, request: Request, adminToken: string | undefined, signedIn: boolean, envKey?: string): Promise<Response> {
  if (request.method !== 'POST') return new Response(null, { status: 405 });
  if (!signedIn) return new Response(null, { status: 401 });
  const key = await geminiKey(db, adminToken, envKey);
  if (!key) return new Response(null, { status: 501 });
  const b = (await request.json().catch(() => ({}))) as { text?: string; voice?: string; lang?: string };
  const text = String(b.text || '').replace(/\s+/g, ' ').trim().slice(0, 700);
  if (!text) return new Response(null, { status: 400 });
  const voice = VOICES[String(b.voice || 'warm')] || VOICES.warm;
  const tl = /[іїєґ]/i.test(text) ? 'ua' : /[а-яё]/i.test(text) ? 'ru' : 'en';
  const style = ({ ru: 'Скажи тепло, живо и по-дружески, как настоящий человек', ua: 'Скажи тепло, жваво й по-дружньому, як справжня людина', en: 'Say it warmly and naturally, like a real person' } as Record<string, string>)[tl] || 'Say it warmly and naturally';
  const audio = await speakText(key, text, voice, style);
  if (!audio) return new Response(null, { status: 502 });
  return new Response(audio, { headers: { 'Content-Type': 'audio/wav', 'Cache-Control': 'private, max-age=600' } });
}
