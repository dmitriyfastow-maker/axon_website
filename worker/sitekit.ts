// Site kit (Decision 45): the public page of a site Vax builds, at the level of the concept sites on /examples/.
// Five styles matched to the niche, each with its own fonts and palette; up to three photos; rich but honest text
// (no invented prices, reviews, addresses or numbers). Everything a model wrote is escaped; the page has one fixed form,
// or, for businesses people visit at a time, the online booking block (worker/booking.ts).
import { bookBlock, type Book } from './booking.js';

export type Offer = { t: string; d: string };
export type Faq = { q: string; a: string };
export type Kit = {
  lang: string; style: string; title: string; accent?: string; kicker?: string; sub: string; about: string;
  services: string[]; details?: string[]; steps?: string[]; faq?: Faq[]; cta: string; ask?: string; imgs?: string[]; promise?: string; book?: Book;
};

type Style = { bg: string; ink: string; mut: string; card: string; acc: string; accInk: string; line: string; head: string; body: string; fonts: string; caps: boolean; radius: number; dark: boolean };
export const STYLES: Record<string, Style> = {
  // Restaurants, coffee, beauty, premium services.
  editorial: { bg: '#0e0c0a', ink: '#f3ead9', mut: '#b9ab92', card: '#17130f', acc: '#c9a25d', accInk: '#1a140c', line: 'rgba(243,234,217,.14)', head: "'Cormorant Garamond',serif", body: 'Manrope,system-ui,sans-serif', fonts: 'Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Manrope:wght@400;500;700', caps: true, radius: 2, dark: true },
  // Clinics, dentists, law, finance, consulting.
  clinic: { bg: '#f5f8fb', ink: '#0f1d2b', mut: '#5b6b7c', card: '#ffffff', acc: '#0e7c86', accInk: '#ffffff', line: 'rgba(15,29,43,.1)', head: 'Manrope,system-ui,sans-serif', body: 'Manrope,system-ui,sans-serif', fonts: 'Manrope:wght@400;500;600;700;800', caps: false, radius: 18, dark: false },
  // Barbers, fitness, tech, auto, events.
  bold: { bg: '#0b0b0c', ink: '#f5f5f2', mut: '#a1a1a6', card: '#151517', acc: '#d4ff3a', accInk: '#0b0b0c', line: 'rgba(245,245,242,.12)', head: 'Unbounded,system-ui,sans-serif', body: 'Inter,system-ui,sans-serif', fonts: 'Unbounded:wght@500;700;800&family=Inter:wght@400;500;700', caps: false, radius: 14, dark: true },
  // Bakeries, kids, family services, crafts, florists.
  soft: { bg: '#faf5ee', ink: '#2b1f17', mut: '#7a6656', card: '#ffffff', acc: '#c2532d', accInk: '#ffffff', line: 'rgba(43,31,23,.1)', head: "'Playfair Display',serif", body: 'Nunito,system-ui,sans-serif', fonts: 'Playfair+Display:ital,wght@0,600;0,700;1,600&family=Nunito:wght@400;600;700', caps: false, radius: 22, dark: false },
  // Landscaping, cleaning, eco, farms, wellness.
  nature: { bg: '#f2f4ee', ink: '#1d2a1f', mut: '#5f6f60', card: '#ffffff', acc: '#2f6b3a', accInk: '#ffffff', line: 'rgba(29,42,31,.1)', head: 'Lora,serif', body: 'Manrope,system-ui,sans-serif', fonts: 'Lora:ital,wght@0,600;0,700;1,600&family=Manrope:wght@400;500;700', caps: false, radius: 16, dark: false },
};
const OLD: Record<string, string> = { clean: 'clinic', dark: 'editorial', warm: 'soft' };
export const styleOf = (s: string | undefined) => (s && STYLES[s] ? s : OLD[s ?? ''] ?? 'clinic');

const T: Record<string, Record<string, string>> = {
  en: { offer: 'What we offer', about: 'About us', how: 'How it works', faq: 'Questions', name: 'Your name', contact: 'Phone or email', msg: 'What do you need?', send: 'Send', done: 'Thank you! Your request has been sent. We will get back to you soon.', made: 'Made on Vaxo', more: 'Learn more', s1: 'Leave a request', s2: 'We get back to you and agree the details', s3: 'You get the result', reply: 'We reply to every request' },
  ru: { offer: 'Что мы предлагаем', about: 'О нас', how: 'Как это работает', faq: 'Вопросы', name: 'Ваше имя', contact: 'Телефон или email', msg: 'Что вам нужно?', send: 'Отправить', done: 'Спасибо! Заявка отправлена. Скоро с вами свяжемся.', made: 'Сделано на Vaxo', more: 'Подробнее', s1: 'Оставьте заявку', s2: 'Мы свяжемся и уточним детали', s3: 'Вы получаете результат', reply: 'Отвечаем на каждую заявку' },
  ua: { offer: 'Що ми пропонуємо', about: 'Про нас', how: 'Як це працює', faq: 'Питання', name: "Ваше ім'я", contact: 'Телефон або email', msg: 'Що вам потрібно?', send: 'Надіслати', done: 'Дякуємо! Заявку надіслано. Незабаром звʼяжемося з вами.', made: 'Зроблено на Vaxo', more: 'Детальніше', s1: 'Залиште заявку', s2: 'Ми звʼяжемося й уточнимо деталі', s3: 'Ви отримуєте результат', reply: 'Відповідаємо на кожну заявку' },
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const pic = (id?: string) => (id && /^[a-f0-9]{24}$/.test(id) ? `/i/${id}.jpg` : '');

/** The title with its accent word set apart (italic gold in editorial, colour elsewhere). */
function headline(title: string, accent?: string) {
  const t = esc(title), a = accent ? esc(accent) : '';
  return a && t.includes(a) ? t.replace(a, `<em>${a}</em>`) : t;
}

export function renderSite(s: Kit, o: { key: string; slug: string; index: boolean; name: string; edit?: boolean; url?: string }): string {
  // In the Canvas every text carries its field name (data-k) and every photo its number (data-img), for editing in place.
  const E = o.edit, dk = (k: string) => (E ? ` data-k="${k}"` : ''), di = (i: number) => (E ? ` data-img="${i}"` : '');
  const w = T[s.lang] ?? T.en, st = STYLES[styleOf(s.style)], cap = st.caps;
  const title = s.title || o.name, cta = s.cta || w.s1;
  const [h1, h2, h3] = [pic(s.imgs?.[0]), pic(s.imgs?.[1]), pic(s.imgs?.[2])];
  const offers = s.services.map((t, i) => ({ t, d: s.details?.[i] ?? '' }));
  const steps = s.steps?.length === 3 ? s.steps : [w.s1, w.s2, w.s3];
  const btn = (href: string, text: string, solid = true) => `<a class="btn${solid ? ' solid' : ''}" href="${href}">${esc(text)}</a>`;
  const nav = [offers.length && ['#offer', w.offer], s.about && ['#about', w.about], s.faq?.length && ['#faq', w.faq]].filter(Boolean) as [string, string][];
  const r = st.radius;
  // SEO for every site: canonical address, link previews, photo descriptions and schema.org data built only from
  // what the owner wrote (no invented address, hours, prices or ratings).
  const url = o.url || `https://vaxogroup.com/s/${o.slug}`, desc = s.sub || title;
  const alt = (x?: string) => ` alt="${esc((x || title).slice(0, 120))}"`, lazy = ' loading="lazy" decoding="async"';
  const ld = JSON.stringify({ '@context': 'https://schema.org', '@type': 'LocalBusiness', name: title, description: desc, url, ...(h1 ? { image: 'https://vaxogroup.com' + h1 } : {}),
    ...(offers.length ? { makesOffer: offers.map((x) => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: x.t, ...(x.d ? { description: x.d } : {}) } })) } : {}) }).replace(/</g, '\\u003c');
  const ldFaq = s.faq?.length ? JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: s.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) }).replace(/</g, '\\u003c') : '';
  return `<!doctype html><html lang="${s.lang === 'ua' ? 'uk' : s.lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title><meta name="description" content="${esc(s.sub || title)}">${o.index ? '' : '<meta name="robots" content="noindex">'}
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:type" content="website"><meta name="twitter:card" content="${h1 ? 'summary_large_image' : 'summary'}">${h1 ? `<meta property="og:image" content="https://vaxogroup.com${h1}">` : ''}
${E ? '' : `<link rel="canonical" href="${esc(url)}"><meta property="og:url" content="${esc(url)}"><link rel="icon" href="/icon-192.png"><script type="application/ld+json">${ld}</script>${ldFaq ? `<script type="application/ld+json">${ldFaq}</script>` : ''}`}
<link rel="manifest" href="/s/${o.slug}/manifest.webmanifest"><meta name="theme-color" content="${st.bg}">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=${st.fonts}&display=swap" rel="stylesheet">
<style>:root{--bg:${st.bg};--ink:${st.ink};--mut:${st.mut};--card:${st.card};--acc:${st.acc};--accink:${st.accInk};--line:${st.line};--r:${r}px}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--ink);font:17px/1.65 ${st.body};-webkit-font-smoothing:antialiased}img{display:block;max-width:100%}a{color:inherit}
.w{max-width:1180px;margin:0 auto;padding:0 22px}
header{position:absolute;left:0;right:0;top:0;z-index:5}.nav{display:flex;align-items:center;justify-content:space-between;gap:16px;height:82px}
.logo{font:700 ${cap ? '24px' : '20px'} ${st.head};letter-spacing:${cap ? '.06em' : '-.01em'};text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:46vw;color:${h1 ? '#fff' : 'var(--ink)'}}
.links{display:flex;gap:28px;font-size:13px;letter-spacing:${cap ? '.16em' : '.02em'};${cap ? 'text-transform:uppercase;' : ''}}.links a{text-decoration:none;opacity:.85;color:${h1 ? '#fff' : 'var(--ink)'}}
.btn{display:inline-block;text-decoration:none;font-weight:700;font-size:${cap ? '13px' : '15px'};letter-spacing:${cap ? '.14em' : '0'};${cap ? 'text-transform:uppercase;' : ''}padding:15px 26px;border-radius:${Math.min(r, 999)}px;border:1.5px solid var(--acc);color:inherit;background:transparent;cursor:pointer;font-family:inherit;white-space:nowrap}
.btn.solid{background:var(--acc);color:var(--accink)}.nav .btn{padding:11px 18px}
.hero{position:relative;min-height:${h1 ? '94vh' : '70vh'};display:flex;align-items:flex-end;padding:130px 0 84px;${h1 ? 'color:#fff;background:#111' : ''}}
.hero>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.hero:after{content:'';position:absolute;inset:0;${h1 ? `background:linear-gradient(180deg,rgba(0,0,0,.5) 0%,rgba(0,0,0,.12) 38%,rgba(0,0,0,.78) 100%)` : `background:radial-gradient(900px 480px at 15% 0%,color-mix(in srgb,var(--acc) 20%,transparent),transparent)`}}
.hero .w{position:relative;z-index:2;width:100%}${h1 ? '.hero .w{text-shadow:0 2px 24px rgba(0,0,0,.45)}.hero .kicker{color:#fff;opacity:.92}.hero h1 em{color:color-mix(in srgb,var(--acc) 62%,#fff)}' : ''}.kicker{color:var(--acc);font-weight:700;letter-spacing:.24em;text-transform:uppercase;font-size:12.5px;margin:0}
h1{font:${cap ? 500 : 700} clamp(44px,8.4vw,${cap ? 116 : 92}px)/.98 ${st.head};letter-spacing:${cap ? '0' : '-.035em'};margin:18px 0 22px;max-width:13ch}h1 em{font-style:${cap ? 'italic' : 'normal'};color:var(--acc)}
.hero p.sub{max-width:540px;font-size:clamp(18px,2.4vw,21px);opacity:.88;margin:0 0 32px}.acts{display:flex;gap:12px;flex-wrap:wrap}.hero .btn:not(.solid){border-color:currentColor}
section{padding:clamp(64px,9vw,104px) 0}h2{font:${cap ? 500 : 700} clamp(34px,4.8vw,${cap ? 62 : 50}px)/1.06 ${st.head};letter-spacing:${cap ? '0' : '-.025em'};margin:12px 0 20px}
.lead{color:var(--mut);font-size:clamp(17px,2vw,19px);max-width:560px;margin:0}
.intro{display:grid;grid-template-columns:1.05fr .95fr;gap:clamp(28px,6vw,72px);align-items:center}.ph{border-radius:var(--r);overflow:hidden;aspect-ratio:4/5;background:var(--card)}.ph img{width:100%;height:100%;object-fit:cover}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(${cap ? 340 : 250}px,1fr));column-gap:${cap ? '48px' : '14px'};gap:${cap ? '0' : '14px'};margin-top:34px;${cap ? 'border-top:1px solid var(--line)' : ''}}
.off{${cap ? 'padding:28px 0 30px;border-bottom:1px solid var(--line);display:grid;grid-template-columns:56px 1fr;gap:6px 18px' : 'background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:26px;display:grid;gap:10px;align-content:start'}}
.off i{font:${cap ? 'italic 500 22px' : '800 15px'} ${cap ? st.head : st.body};font-style:${cap ? 'italic' : 'normal'};color:var(--acc);${cap ? 'grid-row:span 2' : 'width:38px;height:38px;border-radius:50%;display:grid;place-items:center;background:color-mix(in srgb,var(--acc) 14%,transparent)'}}
.off b{font:${cap ? '500 26px' : '700 19px'}/1.25 ${st.head}}.off p{margin:0;color:var(--mut);font-size:16px}
.band{position:relative;min-height:58vh;display:flex;align-items:flex-end;color:#fff;background:#111;padding:0}.band img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.band:after{content:'';position:absolute;inset:0;background:linear-gradient(180deg,transparent 30%,rgba(0,0,0,.75))}
.band .w{position:relative;z-index:2;padding-bottom:56px}.band p{font:${cap ? 'italic 500' : '700'} clamp(28px,4.2vw,48px)/1.12 ${st.head};max-width:20ch;margin:0}
.steps{list-style:none;margin:34px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px}.steps li{border-top:2px solid var(--acc);padding:22px 4px 0;font-weight:600;font-size:18px}.steps span{display:block;color:var(--acc);font:700 13px ${st.body};letter-spacing:.2em;margin-bottom:10px}
details{border-bottom:1px solid var(--line);padding:20px 0}summary{cursor:pointer;font:600 19px ${st.body};list-style:none;display:flex;justify-content:space-between;gap:16px}summary:after{content:'+';color:var(--acc);font-size:24px;line-height:1}details[open] summary:after{content:'–'}details p{color:var(--mut);margin:12px 0 0}
.book{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr);gap:clamp(28px,5vw,56px);background:var(--card);border:1px solid var(--line);border-radius:var(--r);padding:clamp(26px,5vw,56px)}
#form{scroll-margin-top:24px}form{display:grid;grid-template-columns:1fr 1fr;gap:12px;align-content:start}form .full{grid-column:1/-1}
input,textarea{font:16px ${st.body};width:100%;padding:15px 16px;border-radius:${Math.min(r, 14)}px;border:1px solid var(--line);background:${st.dark ? 'rgba(255,255,255,.03)' : 'var(--bg)'};color:inherit}input::placeholder,textarea::placeholder{color:var(--mut)}input:focus,textarea:focus{outline:2px solid var(--acc);outline-offset:1px}
form .btn{padding:17px;font-size:15px}.ok{grid-column:1/-1;font:600 22px/1.35 ${st.head};margin:0}.note{color:var(--mut);font-size:14px;margin:14px 0 0}
footer{padding:40px 0 48px;color:var(--mut);font-size:14px;border-top:1px solid var(--line)}footer .w{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap}
@media(max-width:860px){.links{display:none}.intro,.book{grid-template-columns:1fr}.ph{aspect-ratio:4/3}form{grid-template-columns:1fr}.hero{min-height:${h1 ? '86vh' : '64vh'}}}</style></head><body>
<header><div class="w nav"><a class="logo" href="#">${esc(title)}</a><nav class="links">${nav.map(([h, t]) => `<a href="${h}">${esc(t)}</a>`).join('')}</nav>${btn('#form', cta)}</div></header>
<section class="hero">${h1 ? `<img src="${h1}"${alt(s.kicker)} fetchpriority="high"${di(0)}>` : ''}<div class="w">${s.kicker || E ? `<p class="kicker"${dk('kicker')}>${esc(s.kicker || '')}</p>` : ''}<h1${dk('title')}>${headline(title, s.accent)}</h1>${s.sub || E ? `<p class="sub"${dk('sub')}>${esc(s.sub)}</p>` : ''}<div class="acts">${btn('#form', cta)}${offers.length ? btn('#offer', w.more, false) : ''}</div></div></section>
${s.about ? `<section id="about"><div class="w intro"><div><p class="kicker">${esc(w.about)}</p><h2>${esc(s.kicker || title)}</h2><p class="lead"${dk('about')}>${esc(s.about)}</p></div>${h2 ? `<div class="ph"><img src="${h2}"${alt(title)}${lazy}${di(1)}></div>` : ''}</div></section>` : ''}
${offers.length ? `<section id="offer" style="padding-top:0"><div class="w"><p class="kicker">${esc(w.offer)}</p><h2>${esc(s.sub && s.sub.length <= 60 ? s.sub : w.offer)}</h2><div class="grid">${offers.map((x, i) => `<div class="off"><i>${cap ? 'No. ' : ''}${String(i + 1).padStart(2, '0')}</i><b${dk('services.' + i)}>${esc(x.t)}</b>${x.d || E ? `<p${dk('details.' + i)}>${esc(x.d)}</p>` : ''}</div>`).join('')}</div></div></section>` : ''}
${h3 ? `<section class="band"><img src="${h3}"${alt(s.promise)}${lazy}${di(2)}><div class="w"><p${dk('promise')}>${esc(s.promise || w.reply)}</p></div></section>` : ''}
<section><div class="w"><p class="kicker">${esc(w.how)}</p><h2>${esc(w.how)}</h2><ol class="steps">${steps.map((x, i) => `<li><span>0${i + 1}</span><em${dk('steps.' + i)} style="font-style:normal">${esc(x)}</em></li>`).join('')}</ol></div></section>
${s.faq?.length ? `<section id="faq" style="padding-top:0"><div class="w" style="max-width:860px"><p class="kicker">${esc(w.faq)}</p><h2>${esc(w.faq)}</h2>${s.faq.map((f, i) => `<details${E ? ' open' : ''}><summary${dk('faq.' + i + '.q')}>${esc(f.q)}</summary><p${dk('faq.' + i + '.a')}>${esc(f.a)}</p></details>`).join('')}</div></section>` : ''}
${s.book?.on ? bookBlock({ lang: s.lang, key: o.key, slug: o.slug, cta, services: s.services, book: s.book, edit: E, esc, dk }) : `<section id="form" style="padding-top:0"><div class="w book"><div><p class="kicker">${esc(cta)}</p><h2${dk('cta')}>${esc(cta)}</h2><p class="lead"${dk('ask')}>${esc(s.ask || w.reply)}</p><p class="note">${esc(w.reply)}</p></div>
<form id="f"><input name="name" maxlength="80" aria-label="${esc(w.name)}" placeholder="${esc(w.name)}" autocomplete="name"><input name="contact" maxlength="120" aria-label="${esc(w.contact)}" placeholder="${esc(w.contact)}" required><textarea class="full" name="message" rows="4" maxlength="1500" aria-label="${esc(w.msg)}" placeholder="${esc(s.ask || w.msg)}"></textarea><button class="btn solid full">${esc(w.send)}</button></form></div></section>`}
<footer><div class="w"><span>© ${new Date().getFullYear()} ${esc(title)}</span>${o.index ? '' : `<a href="https://vaxogroup.com/">${esc(w.made)}</a>`}</div></footer>
<script src="/w.js?k=${o.key}&p=${o.slug}" async></script><script>var vf=document.getElementById('f');if(vf)vf.onsubmit=function(e){e.preventDefault();var p=document.createElement('p');p.className='ok';p.textContent=${JSON.stringify(w.done).replace(/</g, '\\u003c')};this.replaceChildren(p)}</script></body></html>`;
}

/** The editing layer of the Canvas preview. The frame is sandboxed (scripts, no access to our page); it only sends
 *  messages: a changed text, "change this with Vax", "replace this photo". Labels come from the workspace language. */
export function editLayer(L: { ai: string; photo: string; hint: string }): string {
  return `<style>[data-k]{outline:1.5px dashed transparent;outline-offset:4px;border-radius:4px;cursor:text;transition:outline-color .15s}[data-k]:hover{outline-color:rgba(232,176,74,.8)}[data-k][contenteditable=true]{outline:2px solid #e8b04a;background:rgba(232,176,74,.08)}[data-img]{cursor:pointer}[data-img]:hover{filter:brightness(.92)}#vxbar{position:fixed;z-index:99;display:none;gap:6px;background:#111;color:#fff;border-radius:999px;padding:5px;box-shadow:0 10px 30px rgba(0,0,0,.35);font:600 13px system-ui,sans-serif}#vxbar button{border:0;border-radius:999px;background:#e8b04a;color:#111;padding:8px 14px;font:inherit;cursor:pointer}#vxhint{position:fixed;left:50%;bottom:14px;transform:translateX(-50%);z-index:99;background:#111;color:#fff;border-radius:999px;padding:8px 14px;font:500 13px system-ui,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,.3);opacity:.92}</style>
<div id="vxbar"></div><div id="vxhint">${L.hint.replace(/[<>&"]/g, '')}</div>
<script>(function(){var bar=document.getElementById('vxbar'),cur=null,send=function(m){parent.postMessage(Object.assign({vx:1},m),'*')};
function place(el){var r=el.getBoundingClientRect();bar.style.display='flex';bar.style.top=Math.max(8,r.top-46)+'px';bar.style.left=Math.max(8,Math.min(r.left,innerWidth-260))+'px'}
function tool(label,fn){bar.innerHTML='';var b=document.createElement('button');b.textContent=label;b.onmousedown=function(e){e.preventDefault()};b.onclick=fn;bar.appendChild(b)}
document.addEventListener('click',function(e){var a=e.target.closest('a,button:not(#vxbar button)');if(a&&!e.target.closest('#vxbar'))e.preventDefault();
var im=e.target.closest('[data-img]');if(im){cur=null;tool(${JSON.stringify(L.photo)},function(){bar.style.display='none';send({t:'img',i:+im.dataset.img})});place(im);return}
var el=e.target.closest('[data-k]');if(!el){if(!e.target.closest('#vxbar'))bar.style.display='none';return}
if(cur!==el){if(cur)cur.removeAttribute('contenteditable');cur=el;el.setAttribute('contenteditable','true');el.focus();
tool(${JSON.stringify(L.ai)},function(){send({t:'ai',k:el.dataset.k,v:el.innerText.trim()})});place(el)}},true);
document.addEventListener('input',function(e){var el=e.target.closest&&e.target.closest('[data-k]');if(el)send({t:'edit',k:el.dataset.k,v:el.innerText.trim()})});
document.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey&&cur&&cur.dataset.k.indexOf('about')<0){e.preventDefault();cur.blur()}});
document.addEventListener('submit',function(e){e.preventDefault()},true);addEventListener('scroll',function(){if(cur)place(cur)},{passive:true});
setTimeout(function(){var h=document.getElementById('vxhint');if(h)h.remove()},6000)})();</script>`;
}
