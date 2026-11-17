// Reviews of a client's business (17.11, public ecosystem): /s/<slug>/reviews — a page in the business's own site style
// with real reviews left by its customers, and a form to leave one. Nothing is invented: a review shows only after the
// owner approves it in the workspace («Reviews» tab). Only the first name is public; the stars average and the
// schema.org rating are built from approved reviews only.
import type { DB } from './partner.js';
import { STYLES, styleOf } from './sitekit.js';

const esc = (s: string) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
export type Review = { id: number; name: string; stars: number; text: string; status: string; at: string };

export async function ensureReviews(db: DB): Promise<void> {
  await db.prepare("CREATE TABLE IF NOT EXISTS biz_reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, biz_id INTEGER NOT NULL, name TEXT NOT NULL, stars INTEGER NOT NULL, text TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'new', at TEXT NOT NULL DEFAULT (datetime('now')))").run().catch(() => {});
}

export async function listReviews(db: DB, bizId: number, all = false): Promise<Review[]> {
  return ((await db.prepare(`SELECT id, name, stars, text, status, at FROM biz_reviews WHERE biz_id = ? ${all ? "AND status != 'del'" : "AND status = 'ok'"} ORDER BY id DESC LIMIT 200`).bind(bizId).all<Review>().catch(() => ({ results: [] }))).results || []);
}

export async function setReview(db: DB, bizId: number, id: number, status: string): Promise<boolean> {
  if (!['ok', 'hidden', 'del'].includes(status)) return false;
  const r = await db.prepare('UPDATE biz_reviews SET status = ? WHERE id = ? AND biz_id = ?').bind(status, id, bizId).run().catch(() => null);
  return !!r;
}

const RT: Record<string, Record<string, string>> = {
  ru: { title: 'Отзывы', kick: 'Отзывы клиентов', h: 'Что говорят о нас', none: 'Отзывов пока нет. Будьте первым — расскажите, как всё прошло.', of: 'из 5', n: 'отзывов', leave: 'Оставить отзыв', name: 'Ваше имя', text: 'Как всё прошло?', stars: 'Оценка', send: 'Отправить отзыв', note: 'Отзыв появится после проверки. Публикуется только имя.', thanks: 'Спасибо! Отзыв отправлен и появится после проверки.', back: 'На сайт', err: 'Напишите имя и пару слов об опыте (от 10 символов).' },
  ua: { title: 'Відгуки', kick: 'Відгуки клієнтів', h: 'Що кажуть про нас', none: 'Відгуків поки немає. Будьте першим — розкажіть, як усе пройшло.', of: 'з 5', n: 'відгуків', leave: 'Залишити відгук', name: "Ваше ім'я", text: 'Як усе пройшло?', stars: 'Оцінка', send: 'Надіслати відгук', note: "Відгук з'явиться після перевірки. Публікується лише ім'я.", thanks: "Дякуємо! Відгук надіслано, він з'явиться після перевірки.", back: 'На сайт', err: "Напишіть ім'я і кілька слів про досвід (від 10 символів)." },
  en: { title: 'Reviews', kick: 'Customer reviews', h: 'What people say about us', none: 'No reviews yet. Be the first to tell how it went.', of: 'of 5', n: 'reviews', leave: 'Leave a review', name: 'Your name', text: 'How did it go?', stars: 'Rating', send: 'Send the review', note: 'The review appears after a check. Only your first name is shown.', thanks: 'Thank you! Your review is sent and will appear after a check.', back: 'Back to the site', err: 'Write your name and a few words about your experience (10+ characters).' },
};

export async function serveReviews(db: DB, slug: string, request: Request, origin: string): Promise<Response> {
  const b = (await db.prepare('SELECT b.id, b.name, p.data FROM biz_pages p JOIN biz b ON b.id = p.biz_id WHERE p.slug = ?').bind(slug).first<{ id: number; name: string; data: string | null }>().catch(() => null))
    ?? (await db.prepare('SELECT b.id, b.name, s.data FROM ws_sites s JOIN biz b ON b.id = s.biz_id WHERE s.slug = ?').bind(slug).first<{ id: number; name: string; data: string | null }>().catch(() => null));
  if (!b) return new Response('Not found', { status: 404 });
  await ensureReviews(db);
  let site: { lang?: string; style?: string; accent?: string; imgs?: string[]; img?: string; title?: string } = {}; try { site = JSON.parse(b.data || '{}'); } catch {}
  const lang = site.lang && RT[site.lang] ? site.lang : 'en', t = RT[lang];
  let sent = false;
  if (request.method === 'POST') {
    const f = await request.formData().catch(() => null);
    if (String(f?.get('web') || '')) return Response.redirect(`${origin}/s/${slug}/reviews?sent=1`, 303); // honeypot
    const name = String(f?.get('name') || '').replace(/\s+/g, ' ').trim().slice(0, 40), text = String(f?.get('text') || '').trim().slice(0, 1000);
    const stars = Math.max(1, Math.min(5, Math.round(Number(f?.get('stars')) || 5)));
    if (!name || text.length < 10) return new Response(t.err, { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    const n = await db.prepare("SELECT COUNT(*) AS n FROM biz_reviews WHERE biz_id = ? AND status = 'new'").bind(b.id).first<{ n: number }>().catch(() => null);
    if ((n?.n ?? 0) >= 200) return new Response('Limit', { status: 429 });
    await db.prepare('INSERT INTO biz_reviews (biz_id, name, stars, text) VALUES (?, ?, ?, ?)').bind(b.id, name, stars, text).run();
    // The owner notices it among the requests and approves it in the «Reviews» tab.
    await db.prepare("INSERT INTO biz_leads (biz_id, name, contact, message, source) VALUES (?, ?, '', ?, 'review')").bind(b.id, name, `★${stars} · ${text.slice(0, 300)}`).run().catch(() => {});
    return Response.redirect(`${origin}/s/${slug}/reviews?sent=1`, 303);
  }
  sent = new URL(request.url).searchParams.get('sent') === '1';
  const list = await listReviews(db, b.id);
  const avg = list.length ? Math.round((list.reduce((s, r) => s + r.stars, 0) / list.length) * 10) / 10 : 0;
  const st = STYLES[styleOf(site.style)], acc = /^#[0-9a-f]{6}$/i.test(String(site.accent || '')) ? String(site.accent) : st.acc;
  const ph = [site.imgs?.[0], site.img].find((x) => x && /^[a-f0-9]{24}$/.test(x));
  const star = (n: number) => '★★★★★'.slice(0, n) + '<span class="o">' + '★★★★★'.slice(0, 5 - n) + '</span>';
  const ld = list.length ? `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'LocalBusiness', name: b.name, url: `${origin}/s/${slug}`, aggregateRating: { '@type': 'AggregateRating', ratingValue: avg, reviewCount: list.length, bestRating: 5 }, review: list.slice(0, 20).map((r) => ({ '@type': 'Review', author: { '@type': 'Person', name: r.name }, reviewRating: { '@type': 'Rating', ratingValue: r.stars, bestRating: 5 }, reviewBody: r.text, datePublished: String(r.at).slice(0, 10) })) }).replace(/</g, '\\u003c')}</script>` : '';
  const html = `<!doctype html><html lang="${lang === 'ua' ? 'uk' : lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(t.title)} · ${esc(b.name)}</title>
<meta name="description" content="${esc(t.kick)} · ${esc(b.name)}${list.length ? ` · ${avg} ${esc(t.of)}` : ''}"><link rel="canonical" href="${origin}/s/${esc(slug)}/reviews">
<meta property="og:title" content="${esc(t.title)} · ${esc(b.name)}">${ph ? `<meta property="og:image" content="${origin}/i/${ph}.jpg">` : ''}${ld}
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${st.fonts}&display=swap"><style>:root{--bg:${st.bg};--card:${st.card};--ink:${st.ink};--mut:${st.mut};--line:${st.line};--acc:${acc};--accInk:${st.accInk};--r:${st.radius}px}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.6 ${st.body}}.w{max-width:880px;margin:0 auto;padding:0 20px}h1,h2{font-family:${st.head};letter-spacing:-.015em;line-height:1.1;margin:0}
.hero{position:relative;color:#fff;background:${ph ? `#111 url(/i/${ph}.jpg) center/cover` : `linear-gradient(135deg,${acc},#111)`};padding:110px 0 46px}.hero:before{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.25),rgba(0,0,0,.8))}.hero .w{position:relative}
.k{text-transform:uppercase;letter-spacing:.18em;font-size:12.5px;font-weight:600;opacity:.9;margin:0 0 12px}.hero h1{font-size:clamp(34px,6vw,60px)}.sum{display:flex;align-items:center;gap:14px;margin-top:22px}.sum b{font:700 44px/1 ${st.head}}.stars{color:var(--acc);letter-spacing:2px}.stars .o{opacity:.25}
.list{display:grid;gap:16px;padding:40px 0}.rv{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:22px}.rv p{margin:10px 0 0;white-space:pre-line}.rv small{color:var(--mut)}.mut{color:var(--mut)}
form{background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:24px;display:grid;gap:12px;margin-bottom:40px}input[type=text],textarea{padding:14px;border:1px solid var(--line);border-radius:12px;background:var(--bg);color:var(--ink);font:inherit;width:100%}textarea{min-height:120px;resize:vertical}
.pick{display:flex;flex-direction:row-reverse;justify-content:flex-end;gap:4px}.pick input{position:absolute;opacity:0;width:1px}.pick label{font-size:34px;color:var(--line);cursor:pointer;line-height:1}.pick input:checked~label,.pick label:hover,.pick label:hover~label{color:var(--acc)}.pick input:focus-visible+label{outline:2px solid var(--acc)}
button{min-height:48px;border:0;border-radius:999px;background:var(--acc);color:var(--accInk);font:inherit;font-weight:700;cursor:pointer}.ok{background:color-mix(in srgb,var(--acc) 14%,var(--card));border-radius:var(--r);padding:16px;margin-top:24px}.hp{position:absolute;left:-9999px}footer{padding:10px 0 50px;color:var(--mut);font-size:14px}a{color:var(--acc)}</style></head><body>
<header class="hero"><div class="w"><p class="k">${esc(t.kick)} · ${esc(b.name)}</p><h1>${esc(t.h)}</h1>${list.length ? `<div class="sum"><b>${avg}</b><div><div class="stars">${star(Math.round(avg))}</div><small>${esc(t.of)} · ${list.length} ${esc(t.n)}</small></div></div>` : ''}</div></header>
<main class="w">${sent ? `<p class="ok" role="status">${esc(t.thanks)}</p>` : ''}
<div class="list">${list.length ? list.map((r) => `<article class="rv"><div class="stars" aria-label="${r.stars} ${esc(t.of)}">${star(r.stars)}</div><p>${esc(r.text)}</p><small>${esc(r.name)} · ${esc(String(r.at).slice(0, 10))}</small></article>`).join('') : `<p class="mut">${esc(t.none)}</p>`}</div>
<h2 style="font-size:30px;margin-bottom:16px" id="leave">${esc(t.leave)}</h2>
<form method="post"><input class="hp" type="text" name="web" tabindex="-1" autocomplete="off" aria-hidden="true"><fieldset style="border:0;padding:0;margin:0"><legend class="mut" style="margin-bottom:4px">${esc(t.stars)}</legend><div class="pick">${[5, 4, 3, 2, 1].map((n) => `<input type="radio" name="stars" id="s${n}" value="${n}"${n === 5 ? ' checked' : ''}><label for="s${n}" title="${n}">★</label>`).join('')}</div></fieldset>
<input type="text" name="name" required maxlength="40" placeholder="${esc(t.name)}" autocomplete="given-name"><textarea name="text" required minlength="10" maxlength="1000" placeholder="${esc(t.text)}"></textarea><button>${esc(t.send)}</button><small class="mut">${esc(t.note)}</small></form></main>
<footer><div class="w"><a href="${origin}/s/${esc(slug)}">← ${esc(t.back)}: ${esc(b.name)}</a></div></footer></body></html>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'X-Frame-Options': 'DENY' } });
}
