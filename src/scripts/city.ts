// «Город Vaxo» — the all-seeing eye as a living city (21.11, Dmitry: «like the city of AI agents: a web that pulls in all
// the details, where you can look and give tasks»). Every chat is a building (height = how much was talked, lit floors and
// a beacon = finished results), every project is a district, your HQ stands in the middle (level, characteristics, the view
// from the side). Glowing roads (the web) tie the HQ to each district, memory links between projects are arcs of light, and
// Vax's agents run along them. Click a building — its office opens with the latest talk and a field to give it a task.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

type CChat = { id: number; title: string; project: number | null; msgs: number; results: number; last: string | null; site: number; doc: number; tool: number; img: number };
type CProj = { id: number; name: string; chats: number; results: number; last: string | null };
export type CityOpts = {
  lang: string;
  data: { city?: CChat[]; projects?: CProj[]; links?: [number, number][] };
  level?: { n: number; name: string; xp?: number };
  sheet: () => Node; // the character sheet (level, six characteristics, the view from the side)
  openChat: (id: number) => void;
  openProject: (id: number) => void;
  task: (q: string, chat: number | null, project: number | null) => void;
  openResult: (chat: number, msgId: number) => void; // a monitor in the office → that result on the canvas
  askHere: (q: string, chat: number) => Promise<{ text: string; kind: string; title: string } | null>; // a task given inside the office
};

const TX: Record<string, Record<string, string>> = {
  ru: { musOn: '♪ Музыка', musOff: '♪ Без музыки', office: 'Офис', enter: '🏢 Зайти в офис', back: '← В город', taskO: 'Задача агентам этого офиса…', working: 'Работаю…', idle: 'Жду задачу', agents: 'агентов', openR: 'Открыть', kd_site: 'Сайт', kd_doc: 'Документ', kd_tool: 'Инструмент', kd_image: 'Картинка', results: 'Результаты на мониторах', reply: 'Ответ', now: 'Сейчас в работе', none: 'Пока без результатов — дайте задачу, и агент сядет за стол.', busy: 'Vax занят другой задачей — подождите пару секунд.', officeHint: 'Нажмите на монитор — откроется результат · задача внизу справа', title: 'Город Vaxo', proj: 'проектов', chats: 'разговоров', res: 'результатов', find: 'Найти здание или квартал…', reset: '⌂ Обзор', hint: 'Тяните — повернуть · колесо — ближе · нажмите на здание, квартал или штаб', solo: 'Отдельные разговоры', hq: 'Ваш штаб', open: 'Открыть разговор', openP: 'Открыть проект', taskC: 'Дать задачу этому разговору…', taskP: 'Новая задача в этом проекте…', taskN: 'Первая задача для Vax…', go: 'Отправить', last: 'Последнее в разговоре', msgs: 'сообщений', made: 'Сделано', mk_site: 'сайтов', mk_doc: 'документов', mk_tool: 'инструментов', mk_img: 'картинок', mem: 'Память проекта', noMem: 'Правил пока нет — Vax запомнит их сам или впишите в обзоре проекта.', inP: 'Разговоры квартала', dist: 'Квартал проекта', empty: 'Город пока пустой. Дайте Vax первую задачу — и здесь вырастет первое здание.', ago: 'активность', loading: 'Строю город…', glErr: 'Ваш браузер не показывает 3D. Ниже — то же самое списком.' },
  ua: { musOn: '♪ Музика', musOff: '♪ Без музики', office: 'Офіс', enter: '🏢 Зайти в офіс', back: '← До міста', taskO: 'Завдання агентам цього офісу…', working: 'Працюю…', idle: 'Чекаю завдання', agents: 'агентів', openR: 'Відкрити', kd_site: 'Сайт', kd_doc: 'Документ', kd_tool: 'Інструмент', kd_image: 'Картинка', results: 'Результати на моніторах', reply: 'Відповідь', now: 'Зараз у роботі', none: 'Поки без результатів — дайте завдання, і агент сяде за стіл.', busy: 'Vax зайнятий іншим завданням — зачекайте кілька секунд.', officeHint: 'Натисніть на монітор — відкриється результат · завдання внизу праворуч', title: 'Місто Vaxo', proj: 'проєктів', chats: 'розмов', res: 'результатів', find: 'Знайти будівлю чи квартал…', reset: '⌂ Огляд', hint: 'Тягніть — повернути · коліщатко — ближче · натисніть на будівлю, квартал чи штаб', solo: 'Окремі розмови', hq: 'Ваш штаб', open: 'Відкрити розмову', openP: 'Відкрити проєкт', taskC: 'Дати завдання цій розмові…', taskP: 'Нове завдання в цьому проєкті…', taskN: 'Перше завдання для Vax…', go: 'Надіслати', last: 'Останнє в розмові', msgs: 'повідомлень', made: 'Зроблено', mk_site: 'сайтів', mk_doc: 'документів', mk_tool: 'інструментів', mk_img: 'картинок', mem: 'Памʼять проєкту', noMem: 'Правил поки немає — Vax запамʼятає їх сам або впишіть в огляді проєкту.', inP: 'Розмови кварталу', dist: 'Квартал проєкту', empty: 'Місто поки порожнє. Дайте Vax перше завдання — і тут виросте перша будівля.', ago: 'активність', loading: 'Будую місто…', glErr: 'Ваш браузер не показує 3D. Нижче — те саме списком.' },
  en: { musOn: '♪ Music', musOff: '♪ No music', office: 'Office', enter: '🏢 Enter the office', back: '← Back to the city', taskO: 'A task for this office’s agents…', working: 'Working…', idle: 'Waiting for a task', agents: 'agents', openR: 'Open', kd_site: 'Site', kd_doc: 'Document', kd_tool: 'Tool', kd_image: 'Image', results: 'Results on the monitors', reply: 'Answer', now: 'In progress', none: 'No results yet — give a task and an agent sits down at a desk.', busy: 'Vax is busy with another task — wait a few seconds.', officeHint: 'Click a monitor to open the result · the task field is on the right', title: 'Vaxo City', proj: 'projects', chats: 'chats', res: 'results', find: 'Find a building or district…', reset: '⌂ Overview', hint: 'Drag to turn · wheel to zoom · click a building, a district or the HQ', solo: 'Separate chats', hq: 'Your HQ', open: 'Open the chat', openP: 'Open the project', taskC: 'Give this chat a task…', taskP: 'A new task in this project…', taskN: 'A first task for Vax…', go: 'Send', last: 'Latest in the chat', msgs: 'messages', made: 'Made', mk_site: 'sites', mk_doc: 'documents', mk_tool: 'tools', mk_img: 'images', mem: 'Project memory', noMem: 'No rules yet — Vax learns them itself, or write them in the project overview.', inP: 'Chats in this district', dist: 'Project district', empty: 'The city is empty so far. Give Vax a first task and the first building grows here.', ago: 'active', loading: 'Building the city…', glErr: 'Your browser cannot show 3D. Below is the same as a list.' },
};

const CSS = `
.vxc{position:fixed;inset:0;width:100vw;height:100vh;max-width:none;max-height:none;margin:0;border:0;padding:0;background:#04060a;color:#eef0f4;font:14px/1.5 Inter,system-ui,sans-serif;overflow:hidden}
.vxc[data-theme="light"]{background:#e8edf4;color:#10141c}
.vxc::backdrop{background:#000}
.vxc canvas.c-gl{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:grab}
.vxc canvas.c-gl:active{cursor:grabbing}
.vxc .c-top{position:absolute;left:12px;right:12px;top:10px;display:flex;gap:10px;align-items:center;z-index:3;pointer-events:none}
.vxc .c-top>*{pointer-events:auto}
.vxc .c-glass{background:rgba(10,14,22,.62);border:1px solid rgba(87,211,230,.22);backdrop-filter:blur(14px);border-radius:16px}
.vxc[data-theme="light"] .c-glass{background:rgba(255,255,255,.78);border-color:rgba(15,120,140,.2)}
.vxc .c-brand{padding:9px 14px;display:flex;gap:12px;align-items:baseline;white-space:nowrap}
.vxc .c-brand b{font:800 17px Sora,Inter,sans-serif}.vxc .c-brand b i{color:#f2a93b;font-style:normal}
.vxc .c-brand small{opacity:.7;font-size:12.5px}
.vxc .c-find{flex:1;max-width:360px;padding:0 6px 0 12px;display:flex;align-items:center}
.vxc .c-find input{flex:1;min-width:0;border:0;background:none;color:inherit;font:500 14px Inter,sans-serif;padding:10px 0;outline:none}
.vxc .c-btn{font:600 13px Inter,sans-serif;color:inherit;padding:9px 14px;cursor:pointer;white-space:nowrap}
.vxc .c-x{margin-left:auto;font-size:22px;line-height:1;padding:8px 13px;cursor:pointer;color:inherit}
.vxc .c-hint{position:absolute;left:50%;bottom:12px;transform:translateX(-50%);padding:7px 14px;font-size:12.5px;opacity:.85;z-index:3;white-space:nowrap;max-width:94vw;overflow:hidden;text-overflow:ellipsis}
.vxc .c-lbl{position:absolute;left:0;top:0;transform:translate(-50%,-100%);pointer-events:auto;cursor:pointer;z-index:2;padding:5px 10px;border-radius:10px;font:600 12.5px Inter,sans-serif;white-space:nowrap;background:rgba(8,12,20,.7);border:1px solid rgba(87,211,230,.35);color:#eef0f4;box-shadow:0 0 18px rgba(87,211,230,.18)}
.vxc .c-lbl small{display:block;font-weight:500;font-size:11px;opacity:.75}
.vxc .c-lbl.hq{border-color:rgba(242,169,59,.7);box-shadow:0 0 22px rgba(242,169,59,.35)}
.vxc[data-theme="light"] .c-lbl{background:rgba(255,255,255,.9);color:#10141c;border-color:rgba(15,120,140,.35)}
.vxc .c-tip{position:absolute;z-index:4;pointer-events:none;padding:6px 10px;border-radius:10px;font-size:12.5px;max-width:280px;transform:translate(14px,14px)}
.vxc .c-pan{position:absolute;right:12px;top:66px;bottom:52px;width:min(380px,calc(100vw - 24px));z-index:3;display:flex;flex-direction:column;overflow:hidden;animation:cin .45s cubic-bezier(.2,.8,.2,1) both}
@keyframes cin{from{opacity:0;transform:translateX(24px)}}
.vxc .c-pan[hidden]{display:none}
.vxc .c-ph{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;padding:14px 16px 6px}
.vxc .c-ph h3{margin:0;font:700 17px Sora,Inter,sans-serif;line-height:1.3}
.vxc .c-ph small{display:block;opacity:.65;font-size:12px;margin-bottom:3px;text-transform:uppercase;letter-spacing:.08em;font-family:ui-monospace,monospace}
.vxc .c-pb{padding:4px 16px 14px;overflow:auto;display:grid;gap:10px;align-content:start}
.vxc .c-chips{display:flex;flex-wrap:wrap;gap:6px}.vxc .c-chips span{padding:5px 10px;border-radius:999px;font-size:12.5px;background:rgba(87,211,230,.1);border:1px solid rgba(87,211,230,.25)}
.vxc .c-sec{font:600 11px ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase;opacity:.6;margin-top:4px}
.vxc .c-msg{font-size:13px;line-height:1.45;padding:8px 10px;border-radius:12px;border-left:3px solid #57d3e6;background:rgba(127,127,127,.08);display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
.vxc .c-msg.u{border-left-color:#f2a93b;opacity:.8}
.vxc .c-row{display:flex;gap:8px;flex-wrap:wrap}
.vxc .c-pri{border:0;border-radius:999px;padding:9px 15px;font:600 13px Inter,sans-serif;background:#f2a93b;color:#1a1205;cursor:pointer}
.vxc .c-sec2{border:1px solid rgba(127,127,127,.35);border-radius:999px;padding:8px 14px;font:600 13px Inter,sans-serif;background:none;color:inherit;cursor:pointer}
.vxc .c-task{display:flex;gap:6px;padding:4px 4px 4px 12px;border-radius:999px;border:1px solid rgba(242,169,59,.5);background:rgba(242,169,59,.06)}
.vxc .c-task input{flex:1;min-width:0;border:0;background:none;color:inherit;font:500 14px Inter,sans-serif;outline:none}
.vxc .c-task button{border:0;border-radius:999px;padding:7px 13px;background:#f2a93b;color:#1a1205;font:600 13px Inter,sans-serif;cursor:pointer}
.vxc .c-list button{display:flex;justify-content:space-between;gap:8px;width:100%;text-align:left;padding:8px 10px;border-radius:12px;border:1px solid rgba(127,127,127,.2);background:none;color:inherit;font:500 13px Inter,sans-serif;cursor:pointer;margin-bottom:6px}
.vxc .c-list button:hover{border-color:#f2a93b}
.vxc .c-list small{opacity:.6;white-space:nowrap}
.vxc .c-empty{position:absolute;left:50%;top:58%;transform:translate(-50%,0);z-index:3;padding:16px;width:min(460px,90vw);display:grid;gap:10px;text-align:center}
.vxc .c-load{position:absolute;inset:0;display:grid;place-items:center;font:600 14px ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;color:#57d3e6;z-index:1}
.vxc .c-sheet .eye{max-width:100%}
.vxc .c-sheet .eyegrid{grid-template-columns:1fr!important}.vxc .c-sheet .eyerad{max-width:260px;margin:0 auto}
.vxc .c-sheet button.lnk{background:none;border:0;color:#f2a93b;cursor:pointer;padding:0;font:600 12.5px Inter,sans-serif;text-decoration:underline;justify-self:start}
.vxc .c-sheet button.pri{border:0;border-radius:999px;padding:8px 14px;font:600 13px Inter,sans-serif;background:#f2a93b;color:#1a1205;cursor:pointer}
.vxc .c-sheet .eyering span{background:transparent}
.vxc .c-sheet h4{margin:6px 0 0;font:600 11px ui-monospace,monospace;letter-spacing:.1em;text-transform:uppercase;opacity:.6}
@media (max-width:760px){.vxc .c-brand small,.vxc .c-hint{display:none}.vxc .c-pan{top:auto;bottom:10px;height:58vh;right:10px;left:10px;width:auto}.vxc .c-find{max-width:none}}
`;


// Our own ambient music for the city (21.11, Dmitry: «a melody that fits the atmosphere, can be switched on and off»).
// Made live in the browser (no recordings, nothing borrowed): warm slow chords, a soft echoing arpeggio, a deep bass,
// all through a long reverb. Calm, a little cosmic — like a city at night that works for you.
export function ambient(): { setOn: (on: boolean) => void; blip: () => void; stop: () => void } {
  const AC = (window as any).AudioContext || (window as any).webkitAudioContext; const ac: AudioContext = new AC(); (window as any).__vxMus = ac;
  const master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
  // a long soft reverb made from decaying noise
  const conv = ac.createConvolver(); { const len = ac.sampleRate * 3.2, b = ac.createBuffer(2, len, ac.sampleRate); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); } conv.buffer = b; }
  const wet = ac.createGain(); wet.gain.value = 0.55; conv.connect(wet); wet.connect(master);
  const dry = ac.createGain(); dry.gain.value = 0.5; dry.connect(master);
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = 0.6; lp.connect(dry); lp.connect(conv);
  const lfo = ac.createOscillator(), lfoG = ac.createGain(); lfo.frequency.value = 0.05; lfoG.gain.value = 380; lfo.connect(lfoG); lfoG.connect(lp.frequency); lfo.start();
  const echo = ac.createDelay(1.5); echo.delayTime.value = 0.42; const fb = ac.createGain(); fb.gain.value = 0.38; echo.connect(fb); fb.connect(echo); echo.connect(conv); echo.connect(dry);
  const hz = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
  // A minor colours: Am9 → Fmaj7 → Cmaj7 → G6(add9)
  const CH = [[57, 60, 64, 67, 71], [53, 57, 60, 64, 69], [48, 55, 59, 64, 67], [55, 59, 62, 64, 69]];
  let on = false, step = 0, timer: number | null = null, arp: number | null = null;
  const pad = (notes: number[], t: number, dur: number) => {
    for (const n of notes) for (const det of [-7, 6]) {
      const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sawtooth'; o.frequency.value = hz(n); o.detune.value = det;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.022, t + 2.5); g.gain.setValueAtTime(0.022, t + dur - 2.5); g.gain.linearRampToValueAtTime(0, t + dur + 1.5);
      o.connect(g); g.connect(lp); o.start(t); o.stop(t + dur + 1.6);
    }
    const b = ac.createOscillator(), bg = ac.createGain(); b.type = 'sine'; b.frequency.value = hz(notes[0] - 12);
    bg.gain.setValueAtTime(0, t); bg.gain.linearRampToValueAtTime(0.09, t + 1.5); bg.gain.linearRampToValueAtTime(0, t + dur + 1); b.connect(bg); bg.connect(dry); b.start(t); b.stop(t + dur + 1.1);
  };
  const pluck = (n: number, t: number, v = 0.05) => { const o = ac.createOscillator(), g = ac.createGain(); o.type = 'triangle'; o.frequency.value = hz(n); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0008, t + 1.4); o.connect(g); g.connect(echo); g.connect(dry); o.start(t); o.stop(t + 1.5); };
  const bar = () => { const t = ac.currentTime + 0.05, ch = CH[step % CH.length]; pad(ch, t, 8); step++; };
  const tick = () => { if (Math.random() < 0.62) { const ch = CH[(step + CH.length - 1) % CH.length]; pluck(ch[Math.floor(Math.random() * ch.length)] + 12 + (Math.random() < 0.25 ? 12 : 0), ac.currentTime + 0.02); } };
  const start = () => { if (timer) return; bar(); timer = window.setInterval(bar, 8000); arp = window.setInterval(tick, 420); };
  const halt = () => { if (timer) clearInterval(timer); if (arp) clearInterval(arp); timer = arp = null; };
  return {
    setOn: (v: boolean) => { on = v; if (v) { ac.resume().catch(() => {}); start(); master.gain.cancelScheduledValues(ac.currentTime); master.gain.linearRampToValueAtTime(0.85, ac.currentTime + 2.5); } else { master.gain.cancelScheduledValues(ac.currentTime); master.gain.linearRampToValueAtTime(0, ac.currentTime + 0.8); setTimeout(() => { if (!on) halt(); }, 900); } },
    blip: () => { if (!on) return; const t = ac.currentTime; const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(880, t); o.frequency.exponentialRampToValueAtTime(1320, t + 0.08); g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.0008, t + 0.35); o.connect(g); g.connect(dry); g.connect(conv); o.start(t); o.stop(t + 0.4); },
    stop: () => { halt(); try { lfo.stop(); } catch { /* */ } ac.close().catch(() => {}); },
  };
}

export function openCity(o: CityOpts): void {
  const t = TX[o.lang] || TX.en;
  if (!document.getElementById('vxc-css')) { const st = document.createElement('style'); st.id = 'vxc-css'; st.textContent = CSS; document.head.append(st); }
  const theme = (document.documentElement.getAttribute('data-theme') || 'light') === 'dark' ? 'dark' : 'light', dark = theme === 'dark';
  const chats = (o.data.city || []).map((c) => ({ ...c, msgs: +c.msgs || 0, results: +c.results || 0, site: +c.site || 0, doc: +c.doc || 0, tool: +c.tool || 0, img: +c.img || 0 }));
  const projects = o.data.projects || [];
  const d = document.createElement('dialog'); d.className = 'vxc'; d.dataset.theme = theme;
  const total = chats.reduce((a, c) => a + c.results, 0);
  d.innerHTML = `<div class="c-load">${t.loading}</div>
    <div class="c-top"><div class="c-brand c-glass"><b>${t.title.replace('Vaxo', 'VAXO<i>.</i>')}</b><small>${projects.length} ${t.proj} · ${chats.length} ${t.chats} · ${total} ${t.res}</small></div>
      <label class="c-find c-glass"><input type="search" placeholder="${t.find}" aria-label="${t.find}"></label>
      <button type="button" class="c-btn c-glass c-reset">${t.reset}</button><button type="button" class="c-btn c-glass c-mus" aria-pressed="false"></button>
      <button type="button" class="c-x c-glass" aria-label="×">×</button></div>
    <div class="c-hint c-glass">${t.hint}</div>
    <aside class="c-pan c-glass" hidden><div class="c-ph"><div><small class="c-kind"></small><h3 class="c-name"></h3></div><button type="button" class="c-btn c-close" aria-label="×">×</button></div><div class="c-pb"></div></aside>
    <div class="c-tip c-glass" hidden></div>`;
  document.body.append(d); d.showModal();
  const $ = <E extends HTMLElement>(s: string) => d.querySelector<E>(s)!;
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text?: string) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
  let alive = true;
  // music: on by default, the choice is remembered
  const mus = ambient(), musB = $<HTMLButtonElement>('.c-mus');
  let musOn = (() => { try { return localStorage.getItem('vx_city_music') !== '0'; } catch { return true; } })();
  const paintMus = () => { musB.textContent = musOn ? t.musOn : t.musOff; musB.setAttribute('aria-pressed', String(musOn)); musB.style.opacity = musOn ? '1' : '.6'; };
  paintMus(); mus.setOn(musOn);
  musB.onclick = () => { musOn = !musOn; try { localStorage.setItem('vx_city_music', musOn ? '1' : '0'); } catch { /* */ } paintMus(); mus.setOn(musOn); };
  // a browser that waits for a touch before playing sound starts the music on the first click inside the city
  d.addEventListener('pointerdown', () => { if (musOn) mus.setOn(true); }, { once: true });

  // ---------- panel (the office / the district / the HQ)
  const pan = $('.c-pan'), pb = $('.c-pb');
  const taskForm = (ph: string, run: (q: string) => void) => { const f = el('form', 'c-task'); const i = el('input'); i.placeholder = ph; i.maxLength = 2000; const b = el('button', '', t.go); b.type = 'submit'; f.append(i, b); f.onsubmit = (e) => { e.preventDefault(); const q = i.value.trim(); if (!q) { i.focus(); return; } close(); run(q); }; return f; };
  const showPanel = (kind: string, name: string, body: Node[]) => { $('.c-kind').textContent = kind; $('.c-name').textContent = name; pb.replaceChildren(...body); pan.hidden = false; };
  const ago = (s: string | null) => { if (!s) return ''; const m = (Date.now() - new Date(s.replace(' ', 'T') + 'Z').getTime()) / 60000; return m < 60 ? Math.max(1, Math.round(m)) + ' мин' : m < 1440 ? Math.round(m / 60) + ' ч' : Math.round(m / 1440) + ' д'; };
  function chatPanel(c: (typeof chats)[number]) {
    const p = projects.find((x) => x.id === c.project);
    const chips = el('div', 'c-chips'); chips.append(el('span', '', `${c.msgs} ${t.msgs}`));
    for (const k of ['site', 'doc', 'tool', 'img'] as const) if (c[k]) chips.append(el('span', '', `${c[k]} ${t['mk_' + k]}`));
    if (c.last) chips.append(el('span', '', `${t.ago} ${ago(c.last)}`));
    const msgs = el('div', 'c-pb0'); msgs.style.cssText = 'display:grid;gap:6px'; msgs.append(el('small', '', '…'));
    fetch('/api/ws/chat/' + c.id).then((r) => r.json()).then((j) => { msgs.replaceChildren(...(j?.msgs || []).slice(-4).map((m: any) => el('div', 'c-msg' + (m.role === 'user' ? ' u' : ''), String(m.content || (m.doc?.title ? '📄 ' + m.doc.title : '')).replace(/\[\[[^\]]*\]\]/g, '').replace(/\s+/g, ' ').slice(0, 260)))); }).catch(() => msgs.replaceChildren());
    const row = el('div', 'c-row'); const eb = el('button', 'c-pri', t.enter); eb.type = 'button'; eb.onclick = () => enterOffice(c); const ob = el('button', 'c-sec2', t.open + ' →'); ob.type = 'button'; ob.onclick = () => { close(); o.openChat(c.id); }; row.append(eb, ob);
    showPanel(p ? '📁 ' + p.name : t.solo, c.title, [chips, taskForm(t.taskC, (q) => o.task(q, c.id, null)), el('div', 'c-sec', t.last), msgs, row]);
  }
  function projPanel(pid: number | null) {
    const p = projects.find((x) => x.id === pid), list = chats.filter((c) => (pid ? c.project === pid : !c.project || !projects.some((x) => x.id === c.project)));
    const chips = el('div', 'c-chips'); chips.append(el('span', '', `${list.length} ${t.chats}`), el('span', '', `${list.reduce((a, c) => a + c.results, 0)} ${t.res}`));
    const lst = el('div', 'c-list');
    for (const c of list.slice(0, 30)) { const b = el('button'); b.type = 'button'; b.append(el('span', '', c.title.slice(0, 60)), el('small', '', c.results ? `✦ ${c.results}` : `${c.msgs}`)); b.onclick = () => { flyTo(buildings.find((x) => x.c.id === c.id)!.mesh.position, 14); chatPanel(c); }; lst.append(b); }
    const body: Node[] = [chips];
    if (p) {
      body.push(taskForm(t.taskP, (q) => o.task(q, null, p.id)));
      const mem = el('div', 'c-msg'); mem.textContent = '…';
      fetch(`/api/ws/project/${p.id}/memory`).then((r) => r.json()).then((j) => { mem.textContent = j?.text ? String(j.text).slice(0, 500) : t.noMem; }).catch(() => { mem.textContent = t.noMem; });
      body.push(el('div', 'c-sec', t.mem), mem);
    }
    body.push(el('div', 'c-sec', t.inP), lst);
    if (p) { const ob = el('button', 'c-sec2', t.openP + ' →'); ob.type = 'button'; ob.onclick = () => { close(); o.openProject(p.id); }; body.push(ob); }
    showPanel(t.dist, p ? p.name : t.solo, body);
  }
  function hqPanel() { const w = el('div', 'c-sheet'); w.append(o.sheet()); showPanel(t.hq, o.level ? `★ ${o.level.n} · ${o.level.name}` : t.hq, [taskForm(t.taskN, (q) => o.task(q, null, null)), w]); }
  $('.c-close').onclick = () => { pan.hidden = true; };

  // ---------- 3D
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); }
  catch { $('.c-load').textContent = t.glErr; mus.stop(); hqPanel(); $('.c-x').onclick = () => { d.close(); d.remove(); }; return; }
  renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.domElement.className = 'c-gl';
  d.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  const BG = dark ? 0x04060a : 0xe8edf4;
  scene.background = new THREE.Color(BG); scene.fog = new THREE.Fog(BG, 70, 190);
  const cam = new THREE.PerspectiveCamera(48, 1, 0.5, 500);
  const ctl = new OrbitControls(cam, renderer.domElement);
  ctl.enableDamping = true; ctl.dampingFactor = 0.08; ctl.maxPolarAngle = Math.PI * 0.46; ctl.minDistance = 8; ctl.maxDistance = 160; ctl.autoRotate = true; ctl.autoRotateSpeed = 0.35;
  scene.add(new THREE.HemisphereLight(dark ? 0x7fb6ff : 0xffffff, dark ? 0x0a0c12 : 0xb8c4d4, dark ? 0.55 : 1.15));
  const sun = new THREE.DirectionalLight(dark ? 0x9fc7ff : 0xfff4e0, dark ? 0.7 : 1.4); sun.position.set(40, 80, 30); scene.add(sun);
  // ground + grid
  const ground = new THREE.Mesh(new THREE.CircleGeometry(220, 64), new THREE.MeshStandardMaterial({ color: dark ? 0x070b12 : 0xdfe6ef, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  const grid = new THREE.GridHelper(300, 100, dark ? 0x14364a : 0xb9c8d8, dark ? 0x0c1b26 : 0xcdd7e3); (grid.material as THREE.Material).transparent = true; (grid.material as THREE.Material).opacity = dark ? 0.55 : 0.6; grid.position.y = 0.02; scene.add(grid);
  // stars (dark) / dust (light)
  { const g = new THREE.BufferGeometry(), n = 700, a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = (Math.random() - 0.5) * 400; a[i * 3 + 1] = 20 + Math.random() * 120; a[i * 3 + 2] = (Math.random() - 0.5) * 400; } g.setAttribute('position', new THREE.BufferAttribute(a, 3)); scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: dark ? 0x9fd8ff : 0x9ab, size: dark ? 0.5 : 0.25, transparent: true, opacity: dark ? 0.8 : 0.35 }))); }

  const AMBER = new THREE.Color(0xf2a93b), CYAN = new THREE.Color(0x57d3e6);
  // window textures: lit floors in amber/cyan; more lit windows where more was done
  const winTex = (lit: number, seed: number) => {
    const c = document.createElement('canvas'); c.width = 32; c.height = 64; const x = c.getContext('2d')!;
    x.fillStyle = '#000'; x.fillRect(0, 0, 32, 64);
    let r = seed * 9301 + 49297; const rnd = () => ((r = (r * 9301 + 49297) % 233280) / 233280);
    for (let y = 2; y < 64; y += 6) for (let i = 2; i < 32; i += 7) if (rnd() < lit) { x.fillStyle = rnd() < 0.78 ? '#ffc874' : '#7fe6f5'; x.fillRect(i, y, 4, 3); }
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.magFilter = THREE.NearestFilter; return tx;
  };
  type B = { c: (typeof chats)[number]; mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial; base: number; target?: number };
  const buildings: B[] = [], plates: { pid: number | null; mesh: THREE.Mesh; center: THREE.Vector3; lbl: HTMLElement }[] = [];
  const pickables: THREE.Object3D[] = [], beacons: THREE.Mesh[] = [];
  const labels: { el: HTMLElement; pos: THREE.Vector3 }[] = [];
  const mkLabel = (html: string, pos: THREE.Vector3, cls = '', onClick?: () => void) => { const e = el('div', 'c-lbl ' + cls); e.innerHTML = html; d.append(e); labels.push({ el: e, pos }); if (onClick) e.onclick = onClick; return e; };
  const esc = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]!);

  // HQ: the person in the middle
  const lv = o.level?.n || 1, hqH = 9 + lv * 1.6;
  const hq = new THREE.Group();
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.6, hqH, 8), new THREE.MeshStandardMaterial({ color: dark ? 0x1a1206 : 0xfff3df, emissive: AMBER, emissiveIntensity: dark ? 0.32 : 0.18, metalness: 0.4, roughness: 0.3 }));
  tower.position.y = hqH / 2; hq.add(tower);
  const crown = new THREE.Mesh(new THREE.OctahedronGeometry(1.4), new THREE.MeshStandardMaterial({ color: 0xffd28a, emissive: AMBER, emissiveIntensity: 2.2 })); crown.position.y = hqH + 1.8; hq.add(crown);
  const rings: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(3.2 + i * 1.1, 0.07, 8, 64), new THREE.MeshBasicMaterial({ color: i === 1 ? 0xf2a93b : 0x57d3e6, transparent: true, opacity: 0.85 })); r.position.y = hqH * (0.45 + i * 0.2); r.rotation.x = Math.PI / 2; hq.add(r); rings.push(r); }
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.4, 60, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xf2a93b, transparent: true, opacity: dark ? 0.12 : 0.08, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
  beam.position.y = hqH + 30; hq.add(beam);
  const pad = new THREE.Mesh(new THREE.RingGeometry(3.5, 4.2, 48), new THREE.MeshBasicMaterial({ color: 0xf2a93b, side: THREE.DoubleSide, transparent: true, opacity: 0.8 })); pad.rotation.x = -Math.PI / 2; pad.position.y = 0.05; hq.add(pad);
  scene.add(hq); tower.userData = { kind: 'hq' }; crown.userData = { kind: 'hq' }; pickables.push(tower, crown);
  mkLabel(`${t.hq}<small>${o.level ? `★ ${o.level.n} · ${esc(o.level.name)}` : ''}</small>`, new THREE.Vector3(0, hqH + 4.4, 0), 'hq', hqPanel);

  // districts
  const groups: { pid: number | null; name: string; list: typeof chats }[] = projects.map((p) => ({ pid: p.id, name: p.name, list: chats.filter((c) => c.project === p.id) }));
  const solo = chats.filter((c) => !c.project || !projects.some((p) => p.id === c.project));
  if (solo.length) groups.push({ pid: null, name: t.solo, list: solo });
  const N = groups.length, R = N <= 1 ? 22 : 24 + N * 2.4;
  const roads: THREE.Vector3[][] = [];
  groups.forEach((g, gi) => {
    const ang = (gi / Math.max(1, N)) * Math.PI * 2 + 0.4, cx = Math.cos(ang) * R, cz = Math.sin(ang) * R;
    const n = Math.max(1, g.list.length), cols = Math.ceil(Math.sqrt(n)), sp = 3.4, size = cols * sp + 2.4;
    const plate = new THREE.Mesh(new THREE.BoxGeometry(size, 0.3, size), new THREE.MeshStandardMaterial({ color: dark ? 0x0b1420 : 0xf4f7fb, emissive: CYAN, emissiveIntensity: dark ? 0.06 : 0.02, roughness: 0.9 }));
    plate.position.set(cx, 0.15, cz); plate.rotation.y = -ang; plate.userData = { kind: 'proj', pid: g.pid }; scene.add(plate); pickables.push(plate);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(size, 0.32, size)), new THREE.LineBasicMaterial({ color: g.pid ? 0x57d3e6 : 0x9aa7b8, transparent: true, opacity: 0.9 }));
    edge.position.copy(plate.position); edge.rotation.y = -ang; scene.add(edge);
    const lbl = mkLabel(`${g.pid ? '📁 ' : ''}${esc(g.name.slice(0, 40))}<small>${g.list.length} ${t.chats} · ${g.list.reduce((a, c) => a + c.results, 0)} ${t.res}</small>`, new THREE.Vector3(cx, 0, cz), '', () => { flyTo(new THREE.Vector3(cx, 0, cz), 26); projPanel(g.pid); });
    const center = new THREE.Vector3(cx, 0, cz);
    plates.push({ pid: g.pid, mesh: plate, center, lbl });
    let maxH = 0;
    g.list.forEach((c, i) => {
      const r = Math.floor(i / cols), k = i % cols;
      const lx = (k - (cols - 1) / 2) * sp, lz = (r - (cols - 1) / 2) * sp;
      const x = cx + lx * Math.cos(-ang) - lz * Math.sin(-ang), z = cz + lx * Math.sin(-ang) + lz * Math.cos(-ang);
      const h = 1.4 + Math.min(8, Math.sqrt(c.msgs) * 1.3) + Math.min(3, c.results * 0.35); // grows with the work, never a wall maxH = Math.max(maxH, h);
      const lit = Math.min(0.92, 0.18 + c.results * 0.12 + c.msgs * 0.01);
      const tex = winTex(lit, c.id); tex.repeat.set(1, Math.max(1, h / 3));
      const mat = new THREE.MeshStandardMaterial({ color: dark ? 0x101826 : 0xe9eef5, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: dark ? (c.results ? 1.4 : 0.8) : (c.results ? 0.9 : 0.5), metalness: 0.25, roughness: 0.55 });
      const m = new THREE.Mesh(new THREE.BoxGeometry(2.3, h, 2.3), mat);
      m.position.set(x, h / 2 + 0.3, z); m.rotation.y = -ang; m.userData = { kind: 'chat', id: c.id }; scene.add(m); pickables.push(m);
      buildings.push({ c, mesh: m, mat, base: mat.emissiveIntensity });
      if (c.results) { const bcn = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 12), new THREE.MeshBasicMaterial({ color: c.site ? 0xf2a93b : 0x57d3e6 })); bcn.position.set(x, h + 0.75, z); bcn.userData = { blink: Math.random() * 6 }; scene.add(bcn); beacons.push(bcn); }
    });
    lbl.dataset.h = String(maxH);
    labels[labels.length - 1].pos.y = maxH + 2.6;
    roads.push([new THREE.Vector3(0, 0.08, 0), new THREE.Vector3(cx, 0.08, cz)]);
  });
  // the web: glowing roads from the HQ to every district
  for (const [a, b] of roads) {
    const g = new THREE.BufferGeometry().setFromPoints([a, b]);
    scene.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0x57d3e6, transparent: true, opacity: dark ? 0.75 : 0.6 })));
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(a.distanceTo(b), 0.9), new THREE.MeshBasicMaterial({ color: 0x57d3e6, transparent: true, opacity: dark ? 0.12 : 0.1, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.position.copy(a.clone().add(b).multiplyScalar(0.5)); glow.rotation.x = -Math.PI / 2; glow.rotation.z = -Math.atan2(b.z - a.z, b.x - a.x); scene.add(glow);
  }
  // memory links between projects: arcs of light
  const arcs: THREE.QuadraticBezierCurve3[] = [];
  for (const [p1, p2] of o.data.links || []) {
    const A = plates.find((x) => x.pid === p1)?.center, Bp = plates.find((x) => x.pid === p2)?.center; if (!A || !Bp) continue;
    const mid = A.clone().add(Bp).multiplyScalar(0.5); mid.y = 10 + A.distanceTo(Bp) * 0.25;
    const curve = new THREE.QuadraticBezierCurve3(A.clone().setY(1), mid, Bp.clone().setY(1)); arcs.push(curve);
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(48)), new THREE.LineBasicMaterial({ color: 0xf2a93b, transparent: true, opacity: 0.85 })));
  }
  // Vax's agents running along the web and the arcs
  const agents: { m: THREE.Mesh; path: (t: number) => THREE.Vector3; s: number; o: number }[] = [];
  const agentGeo = new THREE.SphereGeometry(0.28, 10, 10);
  roads.forEach(([a, b], i) => { const k = Math.min(6, 1 + Math.round((groups[i]?.list.reduce((s, c) => s + c.results, 0) || 0) / 2)); for (let j = 0; j < k; j++) { const m = new THREE.Mesh(agentGeo, new THREE.MeshBasicMaterial({ color: j % 2 ? 0xf2a93b : 0x7fe6f5 })); scene.add(m); agents.push({ m, path: (u) => a.clone().lerp(b, u).setY(0.5), s: 0.05 + Math.random() * 0.06, o: Math.random() }); } });
  arcs.forEach((cv) => { for (let j = 0; j < 3; j++) { const m = new THREE.Mesh(agentGeo, new THREE.MeshBasicMaterial({ color: 0xffd28a })); scene.add(m); agents.push({ m, path: (u) => cv.getPoint(u), s: 0.06 + Math.random() * 0.04, o: j / 3 }); } });

  // ---------- life in the city (21.11, Dmitry: «in the example the city was alive»): traffic both ways and on a ring road,
  // people walking round the districts, drones over finished work and flying to the HQ, windows switching on and off,
  // cranes where work is going on right now, sparks over results, shooting stars at night.
  const life: ((tt: number, dt: number) => void)[] = [];
  const hgt = (m: THREE.Mesh) => (m.geometry as THREE.BoxGeometry).parameters.height;
  {
    const carGeo = new THREE.BoxGeometry(0.9, 0.36, 0.46), cabGeo = new THREE.BoxGeometry(0.45, 0.24, 0.4), lgGeo = new THREE.BoxGeometry(0.06, 0.12, 0.34);
    const CARS = [0x2b3b52, 0x6b2f3a, 0x2e5a44, 0xe3e7ee, 0xf2a93b, 0x3a3f4a];
    const mkCar = () => {
      const g = new THREE.Group(), mat = new THREE.MeshStandardMaterial({ color: CARS[Math.floor(Math.random() * CARS.length)], metalness: 0.5, roughness: 0.35 });
      const b = new THREE.Mesh(carGeo, mat); b.position.y = 0.28; g.add(b);
      const cab = new THREE.Mesh(cabGeo, mat); cab.position.set(-0.05, 0.56, 0); g.add(cab);
      const hl = new THREE.Mesh(lgGeo, new THREE.MeshBasicMaterial({ color: 0xfff4d6 })); hl.position.set(0.46, 0.28, 0); g.add(hl);
      const tl = new THREE.Mesh(lgGeo, new THREE.MeshBasicMaterial({ color: 0xff4040 })); tl.position.set(-0.46, 0.28, 0); g.add(tl);
      g.scale.setScalar(1.55); scene.add(g); return g;
    };
    roads.forEach(([a, b]) => {
      const dir = b.clone().sub(a), len = dir.length(), ang = Math.atan2(dir.z, dir.x), side = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
      for (let j = 0; j < 4; j++) {
        const car = mkCar(), fwd = j % 2 === 0, sp = (2.6 + Math.random() * 2.4) / len, off = Math.random();
        car.rotation.y = -ang + (fwd ? 0 : Math.PI);
        life.push((tt) => { let u = (off + tt * sp) % 1; if (!fwd) u = 1 - u; const p = a.clone().lerp(b, 0.2 + u * 0.68).addScaledVector(side, fwd ? 0.5 : -0.5); car.position.set(p.x, 0, p.z); });
      }
    });
    const RR = 7.6;
    const ringRoad = new THREE.Mesh(new THREE.RingGeometry(RR - 0.75, RR + 0.75, 72), new THREE.MeshBasicMaterial({ color: dark ? 0x0d1f2c : 0xd3dce6, side: THREE.DoubleSide })); ringRoad.rotation.x = -Math.PI / 2; ringRoad.position.y = 0.03; scene.add(ringRoad);
    const dash = new THREE.Mesh(new THREE.RingGeometry(RR - 0.03, RR + 0.03, 72), new THREE.MeshBasicMaterial({ color: 0xf2a93b, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })); dash.rotation.x = -Math.PI / 2; dash.position.y = 0.05; scene.add(dash);
    for (let j = 0; j < 6; j++) { const car = mkCar(), off = j / 6, sp = 0.035 + Math.random() * 0.02; life.push((tt) => { const an = (off + tt * sp) * Math.PI * 2; car.position.set(Math.cos(an) * (RR + 0.35), 0, Math.sin(an) * (RR + 0.35)); car.rotation.y = -(an + Math.PI / 2); }); }
  }
  // people walking round each district
  plates.forEach((pl, i) => {
    const g = groups[i], n = Math.min(10, 3 + g.list.length), half = (pl.mesh.geometry as THREE.BoxGeometry).parameters.width / 2 + 0.55, a2 = pl.mesh.rotation.y;
    const pg = new THREE.CapsuleGeometry(0.17, 0.42, 4, 8);
    for (let j = 0; j < n; j++) {
      const m = new THREE.Mesh(pg, new THREE.MeshStandardMaterial({ color: [0xf2a93b, 0x57d3e6, 0xeeeeee, 0x8bd17c, 0xe06c75, 0xb48cf2][j % 6], emissive: dark ? 0x1a1a1a : 0x000000 })); scene.add(m);
      const off = Math.random(), sp = (0.012 + Math.random() * 0.016) * (Math.random() < 0.5 ? 1 : -1);
      life.push((tt) => {
        const u = (((off + tt * sp) % 1) + 1) % 1, per = u * 4, k = Math.floor(per), f = per - k;
        const lx = k === 0 ? -half + f * 2 * half : k === 1 ? half : k === 2 ? half - f * 2 * half : -half;
        const lz = k === 0 ? -half : k === 1 ? -half + f * 2 * half : k === 2 ? half : half - f * 2 * half;
        m.position.set(pl.center.x + lx * Math.cos(a2) - lz * Math.sin(a2), 0.4 + Math.abs(Math.sin(tt * 8 + j)) * 0.05, pl.center.z + lx * Math.sin(a2) + lz * Math.cos(a2));
      });
    }
  });
  // street lamps and trees around every district
  { const post = new THREE.CylinderGeometry(0.06, 0.08, 2.4, 6), bulb = new THREE.SphereGeometry(0.2, 10, 10), trunk = new THREE.CylinderGeometry(0.1, 0.14, 0.7, 6), crown = new THREE.ConeGeometry(0.6, 1.5, 8);
    const pm = new THREE.MeshStandardMaterial({ color: 0x3a4250 }), bm = new THREE.MeshBasicMaterial({ color: 0xffd9a0 }), tm = new THREE.MeshStandardMaterial({ color: 0x6b4a2f }), cm1 = new THREE.MeshStandardMaterial({ color: dark ? 0x2f6b46 : 0x58a86c }), cm2 = new THREE.MeshStandardMaterial({ color: dark ? 0x3d7d4e : 0x6cbb7a });
    plates.forEach((pl) => {
      const half = (pl.mesh.geometry as THREE.BoxGeometry).parameters.width / 2 + 1.1, a2 = pl.mesh.rotation.y, at = (lx: number, lz: number) => new THREE.Vector3(pl.center.x + lx * Math.cos(a2) - lz * Math.sin(a2), 0, pl.center.z + lx * Math.sin(a2) + lz * Math.cos(a2));
      for (const [lx, lz] of [[-half, -half], [half, -half], [half, half], [-half, half], [0, -half], [0, half], [-half, 0], [half, 0]]) { const p = at(lx, lz); const m = new THREE.Mesh(post, pm); m.position.set(p.x, 1.2, p.z); scene.add(m); const b = new THREE.Mesh(bulb, bm); b.position.set(p.x, 2.45, p.z); scene.add(b); }
      for (let k = 0; k < 6; k++) { const side = k % 4, f = (Math.random() - 0.5) * 1.6 * half, lx = side === 0 ? f : side === 1 ? half + 0.9 : side === 2 ? f : -half - 0.9, lz = side === 0 ? -half - 0.9 : side === 1 ? f : side === 2 ? half + 0.9 : f; const p = at(lx, lz); const t1 = new THREE.Mesh(trunk, tm); t1.position.set(p.x, 0.35, p.z); scene.add(t1); const c1 = new THREE.Mesh(crown, k % 2 ? cm1 : cm2); c1.position.set(p.x, 1.4, p.z); scene.add(c1); }
    });
  }
  // drones: hovering over finished work, or flying between it and the HQ
  buildings.filter((b) => b.c.results).slice(0, 14).forEach((b, j) => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), new THREE.MeshStandardMaterial({ color: 0xdde3ea, metalness: 0.6, roughness: 0.3 })));
    const rot = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.035, 6, 20), new THREE.MeshBasicMaterial({ color: 0x57d3e6 })); rot.rotation.x = Math.PI / 2; g.add(rot);
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), new THREE.MeshBasicMaterial({ color: 0xff4d4d })); led.position.y = -0.2; g.add(led);
    scene.add(g);
    const top = b.mesh.position.clone(); top.y = hgt(b.mesh) + 1.8;
    const hqP = new THREE.Vector3(0, hqH + 1, 0), mid = top.clone().add(hqP).multiplyScalar(0.5); mid.y += 7;
    const cv = new THREE.QuadraticBezierCurve3(hqP, mid, top), off = Math.random(), sp = 0.035 + Math.random() * 0.03, hover = j % 2 === 0;
    life.push((tt) => {
      if (hover) g.position.set(top.x + Math.cos(tt * 0.8 + j) * 1.5, top.y + Math.sin(tt * 2 + j) * 0.3, top.z + Math.sin(tt * 0.8 + j) * 1.5);
      else { const u = (off + tt * sp) % 2; g.position.copy(cv.getPoint(u > 1 ? 2 - u : u)); }
      rot.rotation.z = tt * 12; (led.material as THREE.MeshBasicMaterial).color.setHex(Math.sin(tt * 6 + j) > 0 ? 0xff4d4d : 0x330000);
    });
  });
  // windows switch on and off
  { let acc = 0; life.push((_tt, dt) => {
    acc += dt;
    if (acc > 0.22 && buildings.length) { acc = 0; const b = buildings[Math.floor(Math.random() * buildings.length)]; if (b.mat.emissiveMap) b.mat.emissiveMap.offset.y = Math.floor(Math.random() * 8) / 8; b.target = b.base * (0.7 + Math.random() * 0.65); }
    for (const b of buildings) if (b !== hover && b.target != null) b.mat.emissiveIntensity += (b.target - b.mat.emissiveIntensity) * 0.05;
  }); }
  // cranes where work went on in the last hours
  buildings.filter((b) => b.c.last && Date.now() - new Date(b.c.last.replace(' ', 'T') + 'Z').getTime() < 3 * 3600e3).slice(0, 6).forEach((b, j) => {
    const h = hgt(b.mesh), p = b.mesh.position, cm = new THREE.MeshStandardMaterial({ color: 0xf2a93b, emissive: 0xf2a93b, emissiveIntensity: 0.35 });
    const mast = new THREE.Mesh(new THREE.BoxGeometry(0.16, h + 4, 0.16), cm); mast.position.set(p.x + 1.45, (h + 4) / 2, p.z + 1.45); scene.add(mast);
    const arm = new THREE.Group(); arm.position.set(p.x + 1.45, h + 4, p.z + 1.45);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(5, 0.14, 0.14), cm); bar.position.x = 1.3; arm.add(bar);
    const hook = new THREE.Mesh(new THREE.BoxGeometry(0.03, 1.6, 0.03), new THREE.MeshBasicMaterial({ color: 0x999999 })); hook.position.set(3, -0.8, 0); arm.add(hook);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff3b3b })); lamp.position.set(3.7, 0.2, 0); arm.add(lamp);
    scene.add(arm);
    life.push((tt) => { arm.rotation.y = Math.sin(tt * 0.3 + j) * 1.3; hook.scale.y = 1 + Math.sin(tt * 0.7 + j) * 0.4; (lamp.material as THREE.MeshBasicMaterial).color.setHex(Math.sin(tt * 4 + j) > 0 ? 0xff3b3b : 0x400000); });
  });
  // sparks over finished work
  { const sparks: { m: THREE.Mesh; v: THREE.Vector3; l: number }[] = [], sg = new THREE.SphereGeometry(0.09, 6, 6), lit = buildings.filter((b) => b.c.results); let acc = 0;
    life.push((_tt, dt) => {
      acc += dt;
      if (acc > 2.4 && lit.length) { acc = 0; const b = lit[Math.floor(Math.random() * lit.length)], top = b.mesh.position.clone(); top.y = hgt(b.mesh) + 1; for (let k = 0; k < 14; k++) { const m = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ color: k % 2 ? 0xffd28a : 0x7fe6f5, transparent: true })); m.position.copy(top); scene.add(m); sparks.push({ m, v: new THREE.Vector3((Math.random() - 0.5) * 3, 2 + Math.random() * 2.5, (Math.random() - 0.5) * 3), l: 1.3 }); } }
      for (let k = sparks.length - 1; k >= 0; k--) { const sp = sparks[k]; sp.l -= dt; sp.v.y -= dt * 3; sp.m.position.addScaledVector(sp.v, dt); (sp.m.material as THREE.MeshBasicMaterial).opacity = Math.max(0, sp.l / 1.3); if (sp.l <= 0) { scene.remove(sp.m); (sp.m.material as THREE.Material).dispose(); sparks.splice(k, 1); } }
    });
  }
  // shooting stars at night
  if (dark) { const st = new THREE.Mesh(new THREE.BoxGeometry(3, 0.06, 0.06), new THREE.MeshBasicMaterial({ color: 0xcfefff, transparent: true })); scene.add(st); let s0 = -10, from = new THREE.Vector3(), to = new THREE.Vector3();
    life.push((tt) => { if (tt - s0 > 7) { s0 = tt; from.set((Math.random() - 0.5) * 200, 70 + Math.random() * 40, -80 - Math.random() * 60); to.copy(from).add(new THREE.Vector3(40, -18, 20)); st.lookAt(to); } const k = (tt - s0) / 1.1; st.visible = k < 1; if (k < 1) { st.position.lerpVectors(from, to, k); (st.material as THREE.MeshBasicMaterial).opacity = 1 - k; st.rotation.y = Math.atan2(-(to.z - from.z), to.x - from.x); } }); }

  // ---------- post: a soft glow (bloom) at night
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, cam));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), dark ? 0.95 : 0.35, 0.55, dark ? 0.62 : 0.9); composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const size = () => { const w = d.clientWidth, h = d.clientHeight; renderer.setSize(w, h, false); composer.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  size(); const ro = new ResizeObserver(size); ro.observe(d);
  // start: a high view that sweeps down
  const span = R + 18;
  cam.position.set(span * 1.1, span * 1.25, span * 1.1); ctl.target.set(0, 0, 0);
  const home = { pos: new THREE.Vector3(span * 0.85, span * 0.7, span * 0.85), tgt: new THREE.Vector3(0, 2, 0) };
  let fly: { p0: THREE.Vector3; p1: THREE.Vector3; t0: THREE.Vector3; t1: THREE.Vector3; s: number } | null = { p0: cam.position.clone(), p1: home.pos.clone(), t0: ctl.target.clone(), t1: home.tgt.clone(), s: performance.now() };
  function flyTo(target: THREE.Vector3, dist: number) {
    ctl.autoRotate = false;
    const dir = cam.position.clone().sub(ctl.target).setY(0).normalize();
    const p1 = target.clone().add(dir.multiplyScalar(dist)).setY(target.y + dist * 0.75);
    fly = { p0: cam.position.clone(), p1, t0: ctl.target.clone(), t1: target.clone().setY(Math.max(1, target.y)), s: performance.now() };
  }
  $('.c-reset').onclick = () => { leaveOffice(); pan.hidden = true; fly = { p0: cam.position.clone(), p1: home.pos.clone(), t0: ctl.target.clone(), t1: home.tgt.clone(), s: performance.now() }; ctl.autoRotate = true; };
  // search: fly to the first match
  const find = $<HTMLInputElement>('.c-find input');
  find.onkeydown = (e) => {
    if (e.key !== 'Enter') return; const q = find.value.trim().toLowerCase(); if (!q) return;
    const b = buildings.find((x) => x.c.title.toLowerCase().includes(q)); if (b) { flyTo(b.mesh.position, 14); chatPanel(b.c); return; }
    const p = groups.find((g) => g.name.toLowerCase().includes(q)); if (p) { const pl = plates.find((x) => x.pid === p.pid)!; flyTo(pl.center, 26); projPanel(p.pid); }
  };
  // picking
  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(), tip = $('.c-tip');
  let hover: B | null = null, downAt = 0, downXY = [0, 0];
  const pick = (ev: PointerEvent) => { const r = renderer.domElement.getBoundingClientRect(); ptr.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ptr, cam); return ray.intersectObjects(inOffice ? officePick : pickables, false)[0]?.object; };
  renderer.domElement.addEventListener('pointermove', (ev) => {
    const ob = pick(ev); const b = !inOffice && ob?.userData.kind === 'chat' ? buildings.find((x) => x.mesh === ob) || null : null;
    if (ob?.userData.kind === 'res') { tip.hidden = false; tip.textContent = `${ob.userData.title} · ${t.openR} →`; tip.style.left = ev.clientX + 'px'; tip.style.top = ev.clientY + 'px'; renderer.domElement.style.cursor = 'pointer'; return; }
    if (hover && hover !== b) hover.mat.emissiveIntensity = hover.base;
    hover = b; if (b) b.mat.emissiveIntensity = b.base * 1.9;
    renderer.domElement.style.cursor = ob ? 'pointer' : '';
    if (b) { tip.hidden = false; tip.textContent = `${b.c.title.slice(0, 70)} · ${b.c.msgs} ${t.msgs}${b.c.results ? ` · ✦ ${b.c.results}` : ''}`; tip.style.left = ev.clientX + 'px'; tip.style.top = ev.clientY + 'px'; }
    else if (ob?.userData.kind === 'hq') { tip.hidden = false; tip.textContent = t.hq; tip.style.left = ev.clientX + 'px'; tip.style.top = ev.clientY + 'px'; }
    else tip.hidden = true;
  });
  renderer.domElement.addEventListener('pointerdown', (ev) => { downAt = performance.now(); downXY = [ev.clientX, ev.clientY]; });
  renderer.domElement.addEventListener('pointerup', (ev) => {
    if (performance.now() - downAt > 400 || Math.hypot(ev.clientX - downXY[0], ev.clientY - downXY[1]) > 6) return; // that was a drag
    const ob = pick(ev); if (!ob) return;
    const u = ob.userData; mus.blip();
    if (u.kind === 'res') { close(); o.openResult(u.chat, u.id); return; }
    if (u.kind === 'agent') { pb.querySelector<HTMLInputElement>('.c-task input')?.focus(); return; }
    if (inOffice) return;
    if (u.kind === 'chat') { const b = buildings.find((x) => x.mesh === ob)!; enterOffice(b.c); }
    else if (u.kind === 'proj') { const pl = plates.find((x) => x.mesh === ob)!; flyTo(pl.center, 26); projPanel(pl.pid); }
    else if (u.kind === 'hq') { flyTo(new THREE.Vector3(0, hqH / 2, 0), 22); hqPanel(); }
  });
  ctl.addEventListener('start', () => { ctl.autoRotate = false; fly = null; });

  if (!chats.length) { const e = el('div', 'c-empty c-glass'); e.append(el('p', '', t.empty), taskForm(t.taskN, (q) => o.task(q, null, null))); d.append(e); }
  $('.c-load').remove();

  // ---------- the office inside a building (21.11): desks with Vax's agents, one monitor per finished result, a wall screen
  // with what is being done; a task given here is worked on right here — an agent types, the result lands on a new monitor.
  let inOffice = false, office: THREE.Group | null = null, officeChat: (typeof chats)[number] | null = null;
  const officePick: THREE.Object3D[] = [];
  let crew: { g: THREE.Group; head: THREE.Mesh; base: THREE.Vector3; phase: number; work: boolean; screen?: THREE.Mesh; walk?: boolean; arms?: THREE.Mesh[]; tail?: THREE.Mesh; title?: string }[] = [];
  let officeT0 = 0, bubbles: { sp: THREE.Sprite; a: number; until: number }[] = [], bubbleAcc = 0, steam: THREE.Mesh[] = [], route: THREE.Vector3[] = [], codes: THREE.Texture[] = [];
  const OFF = new THREE.Vector3(0, 0, 700);
  const KI: Record<string, string> = { site: '🌐', doc: '📄', tool: '🧮', image: '🖼' };
  const screenTex = (rows: { t: string; f: string; c: string }[], w = 512, h = 320, bg = '#0b1724', border = '#57d3e6') => {
    const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const x = cv.getContext('2d')!;
    x.fillStyle = bg; x.fillRect(0, 0, w, h); x.strokeStyle = border; x.lineWidth = 6; x.strokeRect(3, 3, w - 6, h - 6);
    let y = 30;
    for (const r of rows) {
      x.font = r.f; x.fillStyle = r.c; const words = r.t.split(/\s+/); let line = '';
      const lh = parseInt(r.f.match(/(\d+)px/)?.[1] || '24', 10) * 1.25;
      for (const wd of words) { const tst = line ? line + ' ' + wd : wd; if (x.measureText(tst).width > w - 48 && line) { x.fillText(line, 24, y + lh * 0.8); y += lh; line = wd; if (y > h - lh) break; } else line = tst; }
      if (line && y <= h - lh) { x.fillText(line, 24, y + lh * 0.8); y += lh; }
      y += 8;
    }
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4; return tx;
  };
  const agentMesh = (work: boolean) => {
    // a little Vax: a round grey head with the dark raccoon mask, white eyes, ears, an apron-coloured body
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.6, 6, 12), new THREE.MeshStandardMaterial({ color: work ? 0x3f7d4f : 0x4a8a5c, roughness: 0.7 }));
    body.position.y = 1.15; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.46, 20, 16), new THREE.MeshStandardMaterial({ color: 0x8d8f96, roughness: 0.8 }));
    head.position.y = 2.05; g.add(head);
    const mask = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.2, 0.3), new THREE.MeshStandardMaterial({ color: 0x23252b })); mask.position.set(0, 0.06, -0.3); head.add(mask);
    for (const sx of [-0.17, 0.17]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffffff })); e.position.set(sx, 0.07, -0.44); head.add(e); const ear = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.28, 10), new THREE.MeshStandardMaterial({ color: 0x6f7178 })); ear.position.set(sx * 1.9, 0.42, 0); head.add(ear); }
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshBasicMaterial({ color: 0x111111 })); nose.position.set(0, -0.08, -0.46); head.add(nose);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.92, 32), new THREE.MeshBasicMaterial({ color: work ? 0xf2a93b : 0x57d3e6, side: THREE.DoubleSide, transparent: true, opacity: 0.85 }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04; g.add(ring);
    const arms: THREE.Mesh[] = [];
    for (const sx of [-0.5, 0.5]) { const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.42, 4, 8), new THREE.MeshStandardMaterial({ color: 0x8d8f96 })); arm.position.set(sx, 1.35, -0.18); arm.rotation.x = -1.1; g.add(arm); arms.push(arm); }
    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.6, 4, 8), new THREE.MeshStandardMaterial({ color: 0x6f7178 })); tail.position.set(0, 0.6, 0.45); tail.rotation.x = 0.9; g.add(tail);
    return { g, head, arms, tail };
  };
  type It = { id: number; kind: string; title: string };
  function buildOffice(c: (typeof chats)[number], items: It[], wall: { q: string; a: string }, working?: string) {
    if (office) { scene.remove(office); office.traverse((ob) => { const m = ob as THREE.Mesh; m.geometry?.dispose?.(); const mt = m.material as THREE.MeshBasicMaterial | undefined; mt?.map?.dispose(); mt?.dispose?.(); }); }
    const room = new THREE.Group(); office = room; room.position.copy(OFF); scene.add(room); officePick.length = 0; crew = []; route = []; codes = []; steam = [];
    const desks: (It | null)[] = [...items.slice(-7), null]; // the last desk waits for a new task
    const cols = Math.min(4, desks.length), rows = Math.ceil(desks.length / cols), W = cols * 6 + 6, D = rows * 6 + 10;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ color: dark ? 0x0c141e : 0xeef1f5, roughness: 0.9 })); floor.rotation.x = -Math.PI / 2; room.add(floor);
    const fg = new THREE.GridHelper(Math.max(W, D), Math.max(W, D) / 2, dark ? 0x173246 : 0xd3dbe5, dark ? 0x10202d : 0xe0e6ee); fg.position.y = 0.02; room.add(fg);
    const wallM = new THREE.MeshStandardMaterial({ color: dark ? 0x101a26 : 0xf7f8fa, roughness: 0.9 });
    const back = new THREE.Mesh(new THREE.PlaneGeometry(W, 9), wallM); back.position.set(0, 4.5, -D / 2); room.add(back);
    const left = new THREE.Mesh(new THREE.PlaneGeometry(D, 9), wallM); left.position.set(-W / 2, 4.5, 0); left.rotation.y = Math.PI / 2; room.add(left);
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(W, 0.12), new THREE.MeshBasicMaterial({ color: 0xf2a93b })); strip.position.set(0, 8.6, -D / 2 + 0.02); room.add(strip);
    // the wall screen: what this office works on
    const ws = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(14, W - 4), 5.2), new THREE.MeshBasicMaterial({ map: screenTex([
      { t: c.title.slice(0, 90), f: '700 34px Inter, sans-serif', c: '#ffffff' },
      { t: (working ? t.now + ': ' + working : wall.q ? '› ' + wall.q : '').slice(0, 140), f: '500 24px Inter, sans-serif', c: '#ffd28a' },
      { t: (working ? t.working : wall.a).slice(0, 240), f: '400 22px Inter, sans-serif', c: '#bfe9f2' },
    ], 1024, 380) }));
    ws.position.set(0, 4.6, -D / 2 + 0.05); room.add(ws);
    desks.forEach((it, i) => {
      const r = Math.floor(i / cols), k = i % cols;
      const x = (k - (cols - 1) / 2) * 6, z = -D / 2 + 6 + r * 6;
      const desk = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.16, 1.7), new THREE.MeshStandardMaterial({ color: dark ? 0x1d2a38 : 0xffffff, roughness: 0.6 })); desk.position.set(x, 1.25, z); room.add(desk);
      for (const lx of [-1.5, 1.5]) { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.2, 1.5), new THREE.MeshStandardMaterial({ color: dark ? 0x2a3846 : 0xd8dee6 })); leg.position.set(x + lx, 0.62, z); room.add(leg); }
      const isWork = !it && !!working;
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 1.45), new THREE.MeshBasicMaterial({ map: screenTex(it ? [
        { t: (KI[it.kind] || '✦') + ' ' + (t['kd_' + it.kind] || ''), f: '600 26px Inter, sans-serif', c: '#ffd28a' },
        { t: it.title || '—', f: '700 32px Inter, sans-serif', c: '#ffffff' },
        { t: t.openR + ' →', f: '600 24px Inter, sans-serif', c: '#7fe6f5' },
      ] : [{ t: isWork ? '⚙ ' + t.working : '＋ ' + t.idle, f: '700 34px Inter, sans-serif', c: isWork ? '#ffd28a' : '#7fe6f5' }, { t: isWork ? working!.slice(0, 80) : t.taskO, f: '500 24px Inter, sans-serif', c: '#cfe9f0' }], 512, 320, '#0b1724', it ? '#57d3e6' : '#f2a93b') }));
      scr.position.set(x, 2.35, z - 0.55); room.add(scr);
      const bezel = new THREE.Mesh(new THREE.BoxGeometry(2.45, 1.6, 0.08), new THREE.MeshStandardMaterial({ color: 0x15181e })); bezel.position.set(x, 2.35, z - 0.6); room.add(bezel);
      if (it) { scr.userData = { kind: 'res', id: it.id, chat: c.id, title: it.title }; officePick.push(scr); }
      const a = agentMesh(isWork || !!it); a.g.position.set(x, 0, z + 1.35); room.add(a.g); // faces its monitor, like people at desks
      a.g.traverse((m) => { m.userData = { kind: it ? 'res' : 'agent', id: it?.id, chat: c.id, title: it?.title || '' }; }); officePick.push(...(a.g.children as THREE.Object3D[]));
      crew.push({ g: a.g, head: a.head, base: a.g.position.clone(), phase: Math.random() * 6, work: isWork || !!it, screen: isWork ? scr : undefined, arms: a.arms, tail: a.tail, title: it?.title });
      // a live «working» strip on the monitor (scrolling lines) and a status LED
      const code = codeTex(); codes.push(code);
      const strip = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.32), new THREE.MeshBasicMaterial({ map: code, transparent: true, opacity: 0.85 })); strip.position.set(x, 1.8, z - 0.54); room.add(strip);
      const led = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshBasicMaterial({ color: it ? 0x4ad295 : isWork ? 0xf2a93b : 0x57d3e6 })); led.position.set(x + 1.1, 1.66, z - 0.54); room.add(led);
      route.push(new THREE.Vector3(x - 2.2, 0, z + 1.6));
    });
    // the corner: a coffee machine with steam, plants, a sofa — and one agent walking coffee → desks → the wall screen
    const cm = new THREE.Group(); cm.position.set(W / 2 - 1.6, 0, -D / 2 + 1.6); room.add(cm);
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.9, 0.9), new THREE.MeshStandardMaterial({ color: 0x2a2f38, metalness: 0.5, roughness: 0.3 })); box.position.y = 0.95; cm.add(box);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.22, 12), new THREE.MeshStandardMaterial({ color: 0xffffff })); cup.position.set(0, 0.95, 0.5); cm.add(cup);
    const cl = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshBasicMaterial({ color: 0xf2a93b })); cl.position.set(0.4, 1.6, 0.46); cm.add(cl);
    steam = [0, 1, 2].map((k) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 })); m.position.set(0, 1.15 + k * 0.3, 0.5); m.userData.k = k; cm.add(m); return m; });
    for (const [px, pz] of [[-W / 2 + 1.2, -D / 2 + 1.2], [W / 2 - 1.2, D / 2 - 1.2], [-W / 2 + 1.2, D / 2 - 1.2]]) {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.35, 0.7, 14), new THREE.MeshStandardMaterial({ color: 0xc9a27a })); pot.position.set(px, 0.35, pz); room.add(pot);
      for (let k = 0; k < 3; k++) { const lf = new THREE.Mesh(new THREE.SphereGeometry(0.55 - k * 0.1, 12, 10), new THREE.MeshStandardMaterial({ color: [0x3f8f4f, 0x4fa35e, 0x5cb86a][k] })); lf.position.set(px + (k - 1) * 0.2, 1.0 + k * 0.45, pz); room.add(lf); }
    }
    const sofa = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.7, 1.1), new THREE.MeshStandardMaterial({ color: 0x3b4a6b, roughness: 0.9 })); sofa.position.set(-W / 2 + 2.4, 0.35, D / 2 - 1.4); room.add(sofa);
    route = [cm.position.clone().add(new THREE.Vector3(-0.9, 0, 1.4)), ...route, new THREE.Vector3(0, 0, -D / 2 + 3)];
    const w = agentMesh(false); w.g.position.copy(route[0]); room.add(w.g); crew.push({ g: w.g, head: w.head, base: new THREE.Vector3(0, 0, 0), phase: 0, work: false, walk: true, arms: w.arms, tail: w.tail });
    officeT0 = performance.now(); bubbles = []; bubbleAcc = 1.5;
    // light for the room (the city's night light is too dim indoors)
    const lamp = new THREE.PointLight(0xfff1dc, dark ? 260 : 160, 60, 1.6); lamp.position.set(0, 9, 0); room.add(lamp);
    const fill = new THREE.PointLight(0x9fe8f5, dark ? 120 : 60, 50, 1.6); fill.position.set(-W / 3, 6, D / 3); room.add(fill);
    for (let k = 0; k < cols; k++) { const sh = new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.5, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xffd28a, side: THREE.DoubleSide })); sh.position.set((k - (cols - 1) / 2) * 6, 7.2, 0); room.add(sh); }
    officeSize = { W, D };
  }
  let officeSize = { W: 20, D: 16 };
  const codeTex = () => {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 128; const x = cv.getContext('2d')!;
    for (let y = 4; y < 128; y += 9) { let px = 6; while (px < 240) { const w = 8 + Math.random() * 40; x.fillStyle = ['#57d3e6', '#f2a93b', '#8bd17c', '#cfd8e3'][Math.floor(Math.random() * 4)]; x.globalAlpha = 0.5 + Math.random() * 0.5; x.fillRect(px, y, w, 4); px += w + 6; } }
    const tx = new THREE.CanvasTexture(cv); tx.wrapT = THREE.RepeatWrapping; tx.repeat.set(1, 0.35); return tx;
  };
  const PH: Record<string, string[]> = {
    ru: ['Проверяю «{t}»', 'Улучшаю текст…', 'Считаю цифры', 'Готово ✓', '☕ Минутку', 'Ищу идеи…', 'Сверяю с памятью проекта', 'Отправил на холст', 'Ещё чуть-чуть…', 'Нашёл ошибку — правлю'],
    ua: ['Перевіряю «{t}»', 'Покращую текст…', 'Рахую цифри', 'Готово ✓', '☕ Хвилинку', 'Шукаю ідеї…', 'Звіряю з памʼяттю проєкту', 'Відправив на полотно', 'Ще трішки…', 'Знайшов помилку — виправляю'],
    en: ['Checking “{t}”', 'Polishing the text…', 'Crunching numbers', 'Done ✓', '☕ One sec', 'Looking for ideas…', 'Checking project memory', 'Sent to the canvas', 'Almost there…', 'Found a bug — fixing'],
  };
  const bubbleSprite = (text: string) => {
    const cv = document.createElement('canvas'); const x = cv.getContext('2d')!; x.font = '600 30px Inter, sans-serif';
    const w = Math.min(560, x.measureText(text).width + 44); cv.width = w; cv.height = 64; const y = cv.getContext('2d')!;
    y.fillStyle = 'rgba(255,255,255,.95)'; y.beginPath(); (y as any).roundRect ? (y as any).roundRect(2, 2, w - 4, 52, 22) : y.rect(2, 2, w - 4, 52); y.fill();
    y.fillStyle = '#10141c'; y.font = '600 30px Inter, sans-serif'; y.textBaseline = 'middle'; y.fillText(text, 22, 29);
    const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, transparent: true, depthTest: false })); sp.scale.set(w / 64, 1, 1); sp.renderOrder = 5; return sp;
  };
  function animOffice(tt: number, dt: number) {
    const since = (performance.now() - officeT0) / 1000, greet = since < 2.2 ? Math.sin(Math.min(1, since / 2.2) * Math.PI) : 0;
    for (const a of crew) {
      if (a.walk) {
        // walk the route: coffee → each desk → the wall screen → back
        const n = route.length, seg = (tt * 0.22) % n, i0 = Math.floor(seg), f = seg - i0, A = route[i0], Bp = route[(i0 + 1) % n];
        const pause = f < 0.25; const k = pause ? 0 : (f - 0.25) / 0.75;
        a.g.position.lerpVectors(A, Bp, k); a.g.position.y = pause ? 0 : Math.abs(Math.sin(tt * 9)) * 0.1;
        if (!pause) a.g.rotation.y = Math.atan2(-(Bp.x - A.x), -(Bp.z - A.z));
        if (a.arms) { a.arms[0].rotation.x = -0.3 + Math.sin(tt * 9) * (pause ? 0 : 0.5); a.arms[1].rotation.x = -0.3 - Math.sin(tt * 9) * (pause ? 0 : 0.5); }
        if (a.tail) a.tail.rotation.z = Math.sin(tt * 4) * 0.4;
        continue;
      }
      const sp = a.work ? 7 : 2;
      a.head.position.y = 2.05 + Math.sin(tt * sp + a.phase) * (a.work ? 0.05 : 0.025);
      a.head.rotation.z = Math.sin(tt * 1.3 + a.phase) * 0.08;
      a.head.rotation.y = greet * Math.PI * 0.85; // they turn to greet you when you come in
      if (a.arms) { const typ = a.work ? Math.sin(tt * 18 + a.phase) * 0.18 : Math.sin(tt * 1.5 + a.phase) * 0.05; a.arms[0].rotation.x = -1.1 + typ; a.arms[1].rotation.x = -1.1 - typ; }
      if (a.tail) a.tail.rotation.z = Math.sin(tt * 2 + a.phase) * 0.35;
      if (a.screen) (a.screen.material as THREE.MeshBasicMaterial).color.setScalar(0.75 + 0.25 * Math.sin(tt * 5));
    }
    for (const c of codes) c.offset.y = (c.offset.y + dt * 0.12) % 1;
    for (const m of steam) { const k = ((tt * 0.6 + m.userData.k / 3) % 1); m.position.y = 1.15 + k * 0.9; (m.material as THREE.MeshBasicMaterial).opacity = 0.45 * (1 - k); m.scale.setScalar(0.8 + k * 1.2); }
    // speech bubbles: what the agents are doing
    bubbleAcc -= dt;
    if (bubbleAcc <= 0 && office) {
      bubbleAcc = 2 + Math.random() * 2;
      const pool = crew.map((c, i) => i).filter((i) => !crew[i].walk && !bubbles.some((b) => b.a === i));
      if (pool.length) {
        const ai = pool[Math.floor(Math.random() * pool.length)], c = crew[ai], ph = PH[o.lang] || PH.en;
        const txt = ph[Math.floor(Math.random() * ph.length)].replace('{t}', (c.title || '').slice(0, 26) || '…');
        const sp = bubbleSprite(txt); sp.position.copy(c.g.position).add(new THREE.Vector3(0, 3.1, 0)); office.add(sp); bubbles.push({ sp, a: ai, until: tt + 3.2 });
      }
    }
    for (let i = bubbles.length - 1; i >= 0; i--) { const b = bubbles[i]; const left = b.until - tt; b.sp.position.y = 3.1 + Math.sin(tt * 2 + i) * 0.05; (b.sp.material as THREE.SpriteMaterial).opacity = Math.min(1, left * 2); if (left <= 0) { office?.remove(b.sp); b.sp.material.map?.dispose(); b.sp.material.dispose(); bubbles.splice(i, 1); } }
  }
  async function enterOffice(c: (typeof chats)[number], note?: { q: string; a: string }) {
    officeChat = c; ctl.autoRotate = false;
    const j = await fetch('/api/ws/chat/' + c.id).then((r) => r.json()).catch(() => null);
    const msgs: any[] = j?.msgs || [];
    const items: It[] = msgs.filter((m) => m.role === 'assistant' && (m.site || m.doc || m.tool || m.image) && m.id).map((m) => ({ id: m.id, kind: m.site ? 'site' : m.tool ? 'tool' : m.doc ? 'doc' : 'image', title: (m.site?.title || m.tool?.title || m.doc?.title || '').slice(0, 70) }));
    const lu = [...msgs].reverse().find((m) => m.role === 'user'), la = [...msgs].reverse().find((m) => m.role === 'assistant');
    const clean = (x: string) => String(x || '').replace(/\[\[[^\]]*\]\]/g, '').replace(/📎 \S+ \S+/g, '').replace(/\s+/g, ' ').trim();
    buildOffice(c, items, { q: clean(lu?.content).slice(0, 140), a: clean(la?.content).slice(0, 240) });
    inOffice = true; tip.hidden = true;
    $('.c-hint').textContent = t.officeHint;
    const D = officeSize.D;
    fly = { p0: cam.position.clone(), p1: OFF.clone().add(new THREE.Vector3(officeSize.W * 0.18, 8 + D * 0.2, D / 2 + 6)), t0: ctl.target.clone(), t1: OFF.clone().add(new THREE.Vector3(0, 2, -1)), s: performance.now() };
    officePanel(c, items, msgs, note);
  }
  function officePanel(c: (typeof chats)[number], items: It[], msgs: any[], note?: { q: string; a: string }) {
    const back = el('button', 'c-sec2', t.back); back.type = 'button'; back.onclick = () => { leaveOffice(); chatPanel(c); flyTo(buildings.find((x) => x.c.id === c.id)!.mesh.position, 14); };
    const out = el('div'); out.style.cssText = 'display:grid;gap:6px';
    if (note) out.append(el('div', 'c-msg u', note.q), el('div', 'c-msg', note.a));
    const f = el('form', 'c-task'); const i = el('input'); i.placeholder = t.taskO; i.maxLength = 2000; const b = el('button', '', t.go); b.type = 'submit'; f.append(i, b);
    f.onsubmit = async (e) => {
      e.preventDefault(); const q = i.value.trim(); if (!q) { i.focus(); return; }
      i.value = ''; b.disabled = true;
      buildOffice(c, items, { q, a: '' }, q);
      out.replaceChildren(el('div', 'c-msg u', q), el('div', 'c-msg', '⚙ ' + t.working));
      const r = await o.askHere(q, c.id).catch(() => null);
      b.disabled = false;
      if (!alive || !inOffice) return;
      if (!r) { out.lastElementChild!.textContent = t.busy; buildOffice(c, items, { q, a: t.busy }); return; }
      out.lastElementChild!.textContent = r.text.slice(0, 600) || (r.title ? (KI[r.kind] || '') + ' ' + r.title : '');
      c.msgs += 2; if (r.kind) { c.results += 1; (c as any)[r.kind === 'image' ? 'img' : r.kind] = ((c as any)[r.kind === 'image' ? 'img' : r.kind] || 0) + 1; }
      enterOffice(c, { q, a: out.lastElementChild!.textContent || '' });
    };
    const lst = el('div', 'c-list');
    for (const it of [...items].reverse().slice(0, 12)) { const bt = el('button'); bt.type = 'button'; bt.append(el('span', '', (KI[it.kind] || '✦') + ' ' + (it.title || '—')), el('small', '', t.openR + ' →')); bt.onclick = () => { close(); o.openResult(c.id, it.id); }; lst.append(bt); }
    const chips = el('div', 'c-chips'); chips.append(el('span', '', `${crew.length} ${t.agents}`), el('span', '', `${items.length} ${t.res}`), el('span', '', `${c.msgs} ${t.msgs}`));
    const ob = el('button', 'c-sec2', t.open + ' →'); ob.type = 'button'; ob.onclick = () => { close(); o.openChat(c.id); };
    const row = el('div', 'c-row'); row.append(back, ob);
    showPanel(t.office, c.title, [chips, f, out, el('div', 'c-sec', t.results), items.length ? lst : el('p', '', t.none), row]);
  }
  function leaveOffice() {
    if (!inOffice) return; inOffice = false; officeChat = null; $('.c-hint').textContent = t.hint;
    if (office) { scene.remove(office); office.traverse((ob) => { const m = ob as THREE.Mesh; m.geometry?.dispose?.(); const mt = m.material as THREE.MeshBasicMaterial | undefined; mt?.map?.dispose(); mt?.dispose?.(); }); office = null; }
    crew = []; officePick.length = 0;
  }

  // ---------- loop
  const v = new THREE.Vector3(), t0 = performance.now(); let lastT = t0;
  const loop = (now: number) => {
    if (!alive) return;
    const tt = (now - t0) / 1000, dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    if (!inOffice) for (const f of life) f(tt, dt);
    if (fly) { const k = Math.min(1, (now - fly.s) / 1100), e = 1 - Math.pow(1 - k, 3); cam.position.lerpVectors(fly.p0, fly.p1, e); ctl.target.lerpVectors(fly.t0, fly.t1, e); if (k >= 1) fly = null; }
    ctl.update();
    rings.forEach((r, i) => { r.rotation.z = tt * (0.3 + i * 0.25) * (i % 2 ? -1 : 1); r.position.y = hqH * (0.45 + i * 0.2) + Math.sin(tt * 1.2 + i) * 0.3; });
    crown.rotation.y = tt * 0.8; crown.position.y = hqH + 1.8 + Math.sin(tt * 1.5) * 0.25;
    for (const b of beacons) (b.material as THREE.MeshBasicMaterial).opacity = 0.55 + 0.45 * Math.sin(tt * 3 + b.userData.blink), (b.material as THREE.MeshBasicMaterial).transparent = true;
    for (const a of agents) { const u = (a.o + tt * a.s) % 2, p = a.path(u > 1 ? 2 - u : u); a.m.position.copy(p); }
    if (inOffice) animOffice(tt, dt);
    bloom.strength = inOffice ? (dark ? 0.28 : 0.12) : (dark ? 0.95 : 0.35);
    composer.render();
    // labels follow their places on screen
    const w = d.clientWidth, h = d.clientHeight;
    for (const L of labels) { v.copy(L.pos).project(cam); const vis = !inOffice && v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1; L.el.style.display = vis ? '' : 'none'; if (vis) L.el.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px, ${(-v.y * 0.5 + 0.5) * h}px) translate(-50%,-100%)`; }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  function close() {
    if (!alive) return; alive = false; mus.stop(); ro.disconnect(); ctl.dispose();
    scene.traverse((ob) => { const m = ob as THREE.Mesh; m.geometry?.dispose?.(); const mt = m.material as THREE.Material | THREE.Material[] | undefined; (Array.isArray(mt) ? mt : mt ? [mt] : []).forEach((x) => { (x as THREE.MeshStandardMaterial).emissiveMap?.dispose(); x.dispose(); }); });
    composer.dispose(); renderer.dispose();
    if (d.open) d.close(); d.remove();
  }
  $('.c-x').onclick = close; d.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
}
