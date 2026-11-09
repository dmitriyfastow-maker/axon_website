// Online booking (Decision 47): for businesses where people come at a time (barbers, beauty, clinics, studios, consultations)
// the site shows the free windows instead of "leave a request and we will agree". The visitor picks a service, a day and a
// time, answers up to three short tap-questions, may mark a first visit (the owner's own bonus, if they set one) and books.
// The booking lands in the owner's CRM like any request and the time is taken for others. Settings live in the page's
// own data (site.book), so every page of a project can have its own schedule.
import type { DB } from './partner.js';

export type Q = { q: string; o: string[] };
export type Book = { on: boolean; days: number[]; from: string; to: string; step: number; cap: number; qs: Q[]; bonus?: string; idea?: string; tz: string };

const cut = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const HM = /^([01]\d|2[0-3]):[0-5]\d$/;
const TZ = /^[A-Za-z]+(?:\/[A-Za-z_+-]+){0,2}$/;
const mins = (t: string) => +t.slice(0, 2) * 60 + +t.slice(3);
const hm = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`;

/** Only what a visitor's page may hold: whole days 1–7 (Monday = 1), sane hours, 3 questions of up to 4 options. */
export function cleanBook(x: unknown): Book | undefined {
  if (!x || typeof x !== 'object') return undefined;
  const b = x as Record<string, unknown>;
  const days = (Array.isArray(b.days) ? b.days : [1, 2, 3, 4, 5, 6]).map(Number).filter((d) => d >= 1 && d <= 7);
  let from = cut(b.from, 5), to = cut(b.to, 5);
  if (!HM.test(from)) from = '10:00';
  if (!HM.test(to) || mins(to) <= mins(from)) to = hm(Math.min(mins(from) + 600, 23 * 60 + 59));
  const step = [15, 20, 30, 45, 60, 90, 120, 180, 240].includes(Number(b.step)) ? Number(b.step) : 60;
  const cap = Math.min(20, Math.max(1, Math.round(Number(b.cap) || 1)));
  const qs = (Array.isArray(b.qs) ? b.qs : []).map((q: any) => (typeof q === 'string' ? (() => { const [a, ...o] = q.split(/[:?]\s+|\s*[|/]\s*/); return { q: a + (/[?:]/.test(q) ? '?' : ''), o }; })() : { q: q?.q ?? q?.question, o: q?.o ?? q?.options ?? q?.answers }))
    .map((q: any) => ({ q: cut(q.q, 80), o: (Array.isArray(q.o) ? q.o : []).map((o: unknown) => cut(o, 40)).filter(Boolean).slice(0, 4) }))
    .filter((q) => q.q && q.o.length >= 2).slice(0, 3);
  const tz = TZ.test(cut(b.tz, 40)) ? cut(b.tz, 40) : 'Europe/Kyiv';
  return { on: b.on !== false, days: [...new Set(days)].sort(), from, to, step, cap, qs, bonus: cut(b.bonus, 120) || undefined, idea: cut(b.idea, 120) || undefined, tz };
}

/** Today's date and minute in the business's own time zone. */
function localNow(tz: string, now = new Date()) {
  let p: Record<string, string> = {};
  try {
    p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now).map((x) => [x.type, x.value]));
  } catch { return localNow('Europe/Kyiv', now); }
  return { y: +p.year, m: +p.month, d: +p.day, min: +p.hour * 60 + +p.minute };
}

/** The windows of the next two weeks: every step between opening and closing on working days, minus the past, minus
 *  times already taken as many times as there are people working at once. */
export function freeDays(book: Book, taken: { day: string; time: string; n: number }[], now = new Date(), span = 14) {
  const L = localNow(book.tz, now), busy = new Map(taken.map((t) => [`${t.day} ${t.time}`, t.n]));
  const out: { d: string; w: number; slots: string[] }[] = [];
  for (let i = 0; i < span; i++) {
    const dt = new Date(Date.UTC(L.y, L.m - 1, L.d + i)), w = dt.getUTCDay() || 7, day = dt.toISOString().slice(0, 10);
    if (!book.days.includes(w)) continue;
    const slots: string[] = [];
    for (let t = mins(book.from); t + book.step <= mins(book.to); t += book.step) {
      if (i === 0 && t < L.min + 30) continue;
      if ((busy.get(`${day} ${hm(t)}`) ?? 0) >= book.cap) continue;
      slots.push(hm(t));
    }
    out.push({ d: day, w, slots });
  }
  return out;
}

async function pageBook(db: DB, key: string, slug: string) {
  const r = (await db.prepare('SELECT b.id, p.data FROM biz b JOIN biz_pages p ON p.biz_id = b.id WHERE b.key = ? AND p.slug = ?').bind(key, slug).first<{ id: number; data: string }>().catch(() => null))
    ?? (await db.prepare('SELECT b.id, s.data FROM biz b JOIN ws_sites s ON s.biz_id = b.id WHERE b.key = ? AND s.slug = ?').bind(key, slug).first<{ id: number; data: string }>().catch(() => null));
  if (!r) return null;
  const s = JSON.parse(r.data) as { book?: unknown; services?: string[]; lang?: string };
  const book = cleanBook(s.book);
  return book?.on ? { bizId: r.id, book, services: s.services ?? [], lang: s.lang || 'en' } : null;
}

async function takenOf(db: DB, bizId: number, slug: string) {
  return (await db.prepare(`SELECT day, time, COUNT(*) AS n FROM biz_bookings WHERE biz_id = ? AND slug = ? AND status = 'booked' AND day >= date('now', '-1 day') GROUP BY day, time`)
    .bind(bizId, slug).all<{ day: string; time: string; n: number }>().catch(() => ({ results: [] }))).results;
}

const CORS = { 'Access-Control-Allow-Origin': '*' };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS } });

/** GET /api/book?k=<key>&p=<slug>: the free windows of one page. */
export async function handleBookGet(db: DB, url: URL): Promise<Response> {
  const k = url.searchParams.get('k') || '', slug = url.searchParams.get('p') || '';
  if (!/^[a-f0-9]{24}$/.test(k) || !/^[a-z0-9-]{3,60}$/.test(slug)) return json(400, { ok: false });
  const pb = await pageBook(db, k, slug);
  if (!pb) return json(404, { ok: false });
  return json(200, { ok: true, days: freeDays(pb.book, await takenOf(db, pb.bizId, slug)) });
}

/** A booking from the page (through /api/w, so it passes the same origin and flood checks). Returns the lead text, or
 *  an error when the time is no longer free. */
export async function takeSlot(db: DB, bizId: number, key: string, b: Record<string, unknown>, path: string): Promise<{ ok: true; text: string; slug: string; day: string; time: string } | { ok: false; error: string }> {
  const slug = path.match(/^\/s\/([a-z0-9-]{3,60})/)?.[1] || cut(b.slug, 60);
  const pb = slug ? await pageBook(db, key, slug) : null;
  if (!pb || pb.bizId !== bizId) return { ok: false, error: 'off' };
  const day = cut(b.day, 10), time = cut(b.time, 5);
  const free = freeDays(pb.book, await takenOf(db, bizId, slug!)).find((d) => d.d === day)?.slots.includes(time);
  if (!free) return { ok: false, error: 'taken' };
  const service = pb.services.includes(cut(b.service, 80)) ? cut(b.service, 80) : '';
  const answers = (Array.isArray(b.answers) ? b.answers : []).slice(0, 3).map((a, i) => (pb.book.qs[i] && pb.book.qs[i].o.includes(cut(a, 40)) ? `${pb.book.qs[i].q} ${cut(a, 40)}` : '')).filter(Boolean);
  const first = b.first === true;
  const text = [`📅 ${day} ${time}${service ? ` · ${service}` : ''}`, ...answers, first ? `★ ${({ ru: 'первый визит', ua: 'перший візит' } as Record<string, string>)[pb.lang] ?? 'first visit'}${pb.book.bonus ? ` (${pb.book.bonus})` : ''}` : '', cut(b.note, 500)].filter(Boolean).join('\n');
  return { ok: true, text, slug: slug!, day, time };
}

export async function saveBooking(db: DB, bizId: number, x: { slug: string; day: string; time: string }, service: string, leadId: number | null) {
  await db.prepare('INSERT INTO biz_bookings (biz_id, slug, day, time, service, lead_id) VALUES (?, ?, ?, ?, ?, ?)').bind(bizId, x.slug, x.day, x.time, service || null, leadId).run();
}

/** The owner's upcoming bookings of one business. */
export async function upcoming(db: DB, bizId: number) {
  return (await db.prepare(`SELECT k.id, k.slug, k.day, k.time, k.service, k.status, l.name, l.contact, l.message FROM biz_bookings k LEFT JOIN biz_leads l ON l.id = k.lead_id
    WHERE k.biz_id = ? AND k.day >= date('now', '-1 day') ORDER BY k.day, k.time LIMIT 100`).bind(bizId).all().catch(() => ({ results: [] }))).results;
}

/** The booking block of a page: rendered empty and filled by its script from /api/book (in the Canvas, from sample windows). */
const BW: Record<string, Record<string, string>> = {
  en: { kick: 'Online booking', lead: 'Pick a time that suits you: no calls, no back and forth.', svc: 'Service', day: 'Day', time: 'Time', none: 'No free time this day', name: 'Your name', contact: 'Phone', more: 'A couple of quick questions (optional)', first: 'This is my first visit', note: 'A wish or a note (optional)', go: 'Book for', done: 'Done! You are booked for', done2: 'We will contact you if anything changes.', taken: 'This time was just taken. Please pick another one.', change: 'change', fail: 'Could not book now. Please try again.', wd: 'Mon,Tue,Wed,Thu,Fri,Sat,Sun', mo: 'Jan,Feb,Mar,Apr,May,Jun,Jul,Aug,Sep,Oct,Nov,Dec' },
  ru: { kick: 'Онлайн-запись', lead: 'Выберите удобное время сами: без звонков и переписки.', svc: 'Услуга', day: 'День', time: 'Время', none: 'В этот день свободного времени нет', name: 'Ваше имя', contact: 'Телефон', more: 'Пара быстрых вопросов (необязательно)', first: 'Я у вас впервые', note: 'Пожелание или примечание (необязательно)', go: 'Записаться на', done: 'Готово! Вы записаны на', done2: 'Если что-то изменится, мы свяжемся с вами.', taken: 'Это время только что заняли. Выберите другое.', change: 'изменить', fail: 'Сейчас не получилось записать. Попробуйте ещё раз.', wd: 'Пн,Вт,Ср,Чт,Пт,Сб,Вс', mo: 'янв,фев,мар,апр,мая,июн,июл,авг,сен,окт,ноя,дек' },
  ua: { kick: 'Онлайн-запис', lead: 'Оберіть зручний час самі: без дзвінків і листування.', svc: 'Послуга', day: 'День', time: 'Час', none: 'Цього дня вільного часу немає', name: "Ваше ім'я", contact: 'Телефон', more: 'Пара швидких питань (необовʼязково)', first: 'Я у вас уперше', note: 'Побажання чи примітка (необовʼязково)', go: 'Записатися на', done: 'Готово! Ви записані на', done2: 'Якщо щось зміниться, ми звʼяжемося з вами.', taken: 'Цей час щойно зайняли. Оберіть інший.', change: 'змінити', fail: 'Зараз не вдалося записати. Спробуйте ще раз.', wd: 'Пн,Вт,Ср,Чт,Пт,Сб,Нд', mo: 'січ,лют,бер,кві,тра,чер,лип,сер,вер,жов,лис,гру' },
};

export function bookBlock(o: { lang: string; key: string; slug: string; cta: string; services: string[]; book: Book; edit?: boolean; esc: (s: string) => string; dk: (k: string) => string }): string {
  const w = BW[o.lang] ?? BW.en, e = o.esc;
  const cfg = { k: o.key, p: o.slug, edit: !!o.edit, svc: o.services, qs: o.book.qs, bonus: o.book.bonus || '', w, demo: freeDays(o.book, [], new Date(), 7) };
  return `<section id="form" style="padding-top:0"><div class="w book bk"><div><p class="kicker">${e(w.kick)}</p><h2${o.dk('cta')}>${e(o.cta)}</h2><p class="lead">${e(w.lead)}</p>${o.book.bonus ? `<p class="bonus">★ ${e(w.first)}: ${e(o.book.bonus)}</p>` : ''}</div>
<div id="bk" class="bkw" aria-live="polite"></div></div></section>
<style>.bk>*{min-width:0}.bk h2{overflow-wrap:anywhere;hyphens:auto}.bkw{display:grid;grid-template-columns:minmax(0,1fr);gap:18px;align-content:start}.bkw>*,.bkw>*>*{min-width:0}.bkw h4{margin:0 0 8px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:var(--mut)}.chips{display:flex;gap:8px;flex-wrap:wrap}.chips.row{flex-wrap:nowrap;overflow-x:auto;padding-bottom:6px;scrollbar-width:thin}
.chip{border:1px solid var(--line);background:transparent;color:inherit;border-radius:999px;padding:10px 15px;font:600 15px inherit;font-family:inherit;cursor:pointer;white-space:nowrap}.chip small{display:block;font-weight:500;opacity:.7;font-size:12px}.chip.day{border-radius:14px;text-align:center;min-width:64px}
.chip:hover{border-color:var(--acc)}.chip.on{background:var(--acc);color:var(--accink);border-color:var(--acc)}.chip:disabled{opacity:.35;cursor:default}.slots{display:grid;grid-template-columns:repeat(auto-fill,minmax(78px,1fr));gap:8px}
.sum{display:flex;justify-content:space-between;gap:10px;align-items:center;background:color-mix(in srgb,var(--acc) 12%,transparent);border-radius:12px;padding:12px 14px;font-weight:700}.sum button{background:none;border:0;color:var(--acc);font:600 14px inherit;font-family:inherit;cursor:pointer;text-decoration:underline}
.bkw .two{display:grid;grid-template-columns:1fr 1fr;gap:10px}.bkw label.cb{display:flex;gap:10px;align-items:center;font-weight:600;cursor:pointer}.bkw label.cb input{width:20px;height:20px;accent-color:var(--acc)}.bonus{margin:16px 0 0;font-weight:700;color:var(--acc)}
.bkw .q{display:grid;gap:8px}.bkw .q span{font-weight:600;font-size:15px}.bkw .err{color:#e5484d;margin:0;font-weight:600}.bkw details summary{font-size:15px;font-weight:600;padding:4px 0}.bkw details summary:after{font-size:18px}.bkw details{border:0;padding:0}
@media(max-width:860px){.bkw .two{grid-template-columns:1fr}.bk h2{font-size:clamp(28px,8vw,40px)}}</style>
<script data-keep>(function(){var C=${JSON.stringify(cfg).replace(/</g, '\\u003c')},W=C.w,root=document.getElementById('bk'),st={svc:'',day:'',time:'',ans:[],first:false},days=[];
var WD=W.wd.split(','),MO=W.mo.split(',');function lab(d){var x=new Date(d+'T12:00:00Z');return [WD[(x.getUTCDay()+6)%7],x.getUTCDate()+' '+MO[x.getUTCMonth()]]}
function h(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e}
function chip(txt,on,fn,sub){var b=h('button','chip'+(on?' on':''),txt);b.type='button';if(sub){b.className+=' day';b.appendChild(h('small','',sub))}b.onclick=fn;return b}
function draw(){root.replaceChildren();
 if(st.done){var p=h('p','ok',W.done+' '+lab(st.day).join(' ')+', '+st.time+'.');root.append(p,h('p','note',W.done2));return}
 if(st.time){var s=h('div','sum');s.append(h('span','',(st.svc?st.svc+' · ':'')+lab(st.day).join(' ')+', '+st.time));var c=h('button','',W.change);c.type='button';c.onclick=function(){st.time='';draw()};s.append(c);root.append(s);
  var f=h('form','');f.style.display='grid';f.style.gap='14px';var two=h('div','two'),n=h('input'),k=h('input');n.name='name';n.placeholder=W.name;n.autocomplete='name';n.maxLength=80;k.name='contact';k.type='tel';k.placeholder=W.contact;k.required=true;k.maxLength=120;k.autocomplete='tel';two.append(n,k);f.append(two);
  if(C.qs.length){var m=h('div','');m.style.display='grid';m.style.gap='12px';m.append(h('h4','',W.more));C.qs.forEach(function(q,i){var r=h('div','q');r.append(h('span','',q.q));var cs=h('div','chips');q.o.forEach(function(o){cs.append(chip(o,st.ans[i]===o,function(){st.ans[i]=st.ans[i]===o?'':o;[].forEach.call(cs.children,function(b){b.classList.toggle('on',b.textContent===st.ans[i])})}))});r.append(cs);m.append(r)});f.append(m)}
  var cb=h('label','cb'),ci=h('input');ci.type='checkbox';ci.checked=st.first;ci.onchange=function(){st.first=ci.checked};cb.append(ci,h('span','',W.first+(C.bonus?' · '+C.bonus:'')));f.append(cb);
  var d=h('details',''),nt=h('textarea');nt.name='note';nt.rows=2;nt.maxLength=500;nt.placeholder=W.note;d.append(h('summary','',W.note),nt);f.append(d);
  var er=h('p','err'),go=h('button','btn solid',W.go+' '+st.time);go.type='submit';f.append(er,go);
  f.onsubmit=function(e){e.preventDefault();if(C.edit)return;go.disabled=true;er.textContent='';
   var body={k:C.k,s:(function(){try{return sessionStorage.getItem('vx_s')||'x'}catch(_){return 'x'}})(),p:location.pathname,u:(function(){try{return sessionStorage.getItem('vx_src')||'direct'}catch(_){return 'direct'}})(),t:'book',slug:C.p,day:st.day,time:st.time,service:st.svc,name:n.value.trim(),contact:k.value.trim(),answers:st.ans,first:st.first,note:nt.value.trim()};
   fetch('/api/w',{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(body)}).then(function(r){return r.json()}).then(function(d){go.disabled=false;if(d.ok&&d.booked){st.done=true;draw()}else if(d.error==='taken'){er.textContent=W.taken;st.time='';load()}else er.textContent=W.fail}).catch(function(){go.disabled=false;er.textContent=W.fail})};
  root.append(f);setTimeout(function(){k.focus({preventScroll:true})},50);return}
 if(C.svc.length){var a=h('div','');a.append(h('h4','',W.svc));var cs=h('div','chips');C.svc.forEach(function(s){cs.append(chip(s,st.svc===s,function(){st.svc=st.svc===s?'':s;draw()}))});a.append(cs);root.append(a)}
 var b=h('div','');b.append(h('h4','',W.day));var dr=h('div','chips row');days.forEach(function(d){var l=lab(d.d),x=chip(l[0],st.day===d.d,function(){st.day=d.d;draw()},l[1]);if(!d.slots.length)x.disabled=true;dr.append(x)});b.append(dr);root.append(b);
 var cur=days.find(function(d){return d.d===st.day});if(cur){var t=h('div','');t.append(h('h4','',W.time));if(!cur.slots.length)t.append(h('p','note',W.none));var g=h('div','slots');cur.slots.forEach(function(s){g.append(chip(s,false,function(){st.time=s;draw()}))});t.append(g);root.append(t)}}
function pick(){var f=days.find(function(d){return d.slots.length});if(!st.day||!days.some(function(d){return d.d===st.day&&d.slots.length}))st.day=f?f.d:'';draw()}
function load(){if(C.edit){days=C.demo;pick();return}fetch('/api/book?k='+C.k+'&p='+C.p).then(function(r){return r.json()}).then(function(d){days=d.days||[];pick()}).catch(function(){days=C.demo;pick()})}
load()})();</script>`;
}
