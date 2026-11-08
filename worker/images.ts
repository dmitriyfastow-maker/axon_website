// Free pictures in the chat (Decision 39): Flux Schnell on Workers AI, no paid API. Five a day per visitor.
// A small model first screens the wish and turns it into an English prompt; anything unsafe is refused.
import type { AiBinding } from './chat.js';
import type { DB } from './partner.js';

const SCREEN = '@cf/google/gemma-4-26b-a4b-it';
const IMAGE = '@cf/black-forest-labs/flux-1-schnell';
export const DAILY = 5;

export const WANTS_IMAGE = /нарисуй|намалюй|сгенерируй\s+(картинк|изображ|фото|логотип)|згенеруй\s+(картинк|зображ|фото|логотип)|(создай|сделай|зроби|створи)\s+(картинк|изображен|зображен|иллюстрац|ілюстрац)|\bdraw\b|\bpaint\s+(me\s+)?(a|an)\b|\b(generate|create|make)\s+(me\s+)?(a|an|the)?\s*(image|picture|illustration|drawing)\b/i;

const RULE = `Turn the wish into one short English image prompt. Reply with the prompt only.
If the wish involves nudity or sex, any child in a sexual or harmful way, real named people, gore, hate, weapons instructions, fake documents or logos of real brands, reply exactly: BLOCK`;

const WORDS: Record<string, [string, string, string]> = {
  en: ['Here is your picture.', 'I cannot draw that.', 'That is all the free pictures for today. More tomorrow.'],
  ru: ['Вот ваша картинка.', 'Такое я не рисую.', 'Бесплатные картинки на сегодня закончились. Завтра будут новые.'],
  ua: ['Ось ваша картинка.', 'Таке я не малюю.', 'Безкоштовні картинки на сьогодні закінчились. Завтра будуть нові.'],
};

async function ipKey(ip: string) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('vaxo-img:' + ip));
  return Array.from(new Uint8Array(h).slice(0, 8), (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function drawImage(ai: AiBinding, db: DB | undefined, wish: string, lang: string, ip: string): Promise<{ reply: string; image?: string } | null> {
  const [ok, no, over] = WORDS[lang] ?? WORDS.en;
  if (!db) return null;
  const who = await ipKey(ip);
  const used = (await db.prepare(`SELECT COUNT(*) AS n FROM events WHERE kind = 'img' AND path = ? AND at >= date('now')`).bind(who).first<{ n: number }>())?.n ?? 0;
  if (used >= DAILY) return { reply: over };
  const s = (await ai.run(SCREEN, { messages: [{ role: 'system', content: RULE }, { role: 'user', content: wish.slice(0, 400) }], max_tokens: 120, temperature: 0, chat_template_kwargs: { enable_thinking: false } })) as Record<string, any>;
  const prompt = String(typeof s?.response === 'string' ? s.response : s?.choices?.[0]?.message?.content || '').trim();
  if (!prompt) return null;
  if (/^BLOCK\b/i.test(prompt)) return { reply: no };
  const r = (await ai.run(IMAGE, { prompt: prompt.slice(0, 500), steps: 4 })) as { image?: string };
  if (!r?.image) return null;
  await db.prepare(`INSERT INTO events (kind, path) VALUES ('img', ?)`).bind(who).run().catch(() => {});
  return { reply: ok, image: `data:image/jpeg;base64,${r.image}` };
}

/* Decision 43d: every site Vax builds gets its own hero picture. The model writes a photo prompt from the business
   (and may refuse), Flux draws it, the picture is kept in D1 and served at /i/<id>.jpg. At most 20 a day per person. */
const HERO_RULE = `Write ONE short English prompt for a realistic photograph used as the hero banner of this business's website. Show the place, the product or the work itself, in natural light, editorial style, wide shot. No text, no letters, no logos, no faces looking at the camera. Reply with the prompt only.
If the business involves sex, drugs, weapons, gambling, hate or anything illegal, reply exactly: BLOCK`;

export async function heroImage(ai: AiBinding | undefined, db: DB, who: string, about: string): Promise<string | null> {
  if (!ai || !about.trim()) return null;
  const key = await ipKey('hero:' + who);
  const used = (await db.prepare(`SELECT COUNT(*) AS n FROM events WHERE kind = 'heroimg' AND path = ? AND at >= date('now')`).bind(key).first<{ n: number }>().catch(() => null))?.n ?? 0;
  if (used >= 20) return null;
  try {
    const s = (await ai.run(SCREEN, { messages: [{ role: 'system', content: HERO_RULE }, { role: 'user', content: about.slice(0, 500) }], max_tokens: 120, temperature: 0.3, chat_template_kwargs: { enable_thinking: false } })) as Record<string, any>;
    const prompt = String(typeof s?.response === 'string' ? s.response : s?.choices?.[0]?.message?.content || '').trim();
    if (!prompt || /^BLOCK\b/i.test(prompt)) return null;
    const r = (await ai.run(IMAGE, { prompt: (prompt + ', high detail, no text').slice(0, 500), steps: 6 })) as { image?: string };
    if (!r?.image) return null;
    const id = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('');
    await db.prepare('INSERT INTO site_images (id, data, who) VALUES (?, ?, ?)').bind(id, r.image, key).run();
    await db.prepare(`INSERT INTO events (kind, path) VALUES ('heroimg', ?)`).bind(key).run().catch(() => {});
    return id;
  } catch (e) { console.error('[hero]', e); return null; }
}

export async function serveImage(db: DB, id: string): Promise<Response> {
  const r = await db.prepare('SELECT data FROM site_images WHERE id = ?').bind(id).first<{ data: string }>().catch(() => null);
  if (!r) return new Response('Not found', { status: 404 });
  const bin = atob(r.data), buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return new Response(buf, { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' } });
}

/** Three photos for a site at once (the prompts come from the site writer). Each counts toward the same daily limit. */
export async function sitePhotos(ai: AiBinding | undefined, db: DB, who: string, prompts: string[]): Promise<string[]> {
  if (!ai || !prompts.length) return [];
  const key = await ipKey('hero:' + who);
  const used = (await db.prepare(`SELECT COUNT(*) AS n FROM events WHERE kind = 'heroimg' AND path = ? AND at >= date('now')`).bind(key).first<{ n: number }>().catch(() => null))?.n ?? 0;
  const room = Math.max(0, 30 - used);
  const ids = await Promise.all(prompts.slice(0, Math.min(3, room)).map(async (p) => {
    try {
      const r = (await ai.run(IMAGE, { prompt: `${p}, photorealistic, editorial photography, natural light, high detail, no text, no logos`.slice(0, 500), steps: 6 })) as { image?: string };
      if (!r?.image) return null;
      const id = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('');
      await db.prepare('INSERT INTO site_images (id, data, who) VALUES (?, ?, ?)').bind(id, r.image, key).run();
      await db.prepare(`INSERT INTO events (kind, path) VALUES ('heroimg', ?)`).bind(key).run().catch(() => {});
      return id;
    } catch (e) { console.error('[photo]', e); return null; }
  }));
  return ids.filter((x): x is string => !!x);
}
