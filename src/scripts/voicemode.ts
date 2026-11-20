// «Привет, VAXO» (Decision 69, 20.11): a hands-free conversation that looks and sounds like a personal Jarvis.
// Full screen, a living core (or Vax the raccoon) that breathes while listening, gathers while thinking and pulses with
// the voice; live captions; a side column with what VAXO is doing right now; camera optional (each question then
// carries a photo). Speech → text: /api/stt (Whisper). Text → speech: /api/tts (live Google voices), else the browser.
import { speak, stopSpeak, canSpeak } from './voice';

type Reply = { text: string; made?: string } | null;
// What the voice screen shows about the chat it was opened from (20.11, Dmitry: the same information as the normal screen,
// only drawn like a futuristic control panel; each chat and project has its own).
export type Hud = {
  title?: () => string; crumb?: () => string;
  canvas?: () => Node | null; // a copy of this chat's canvas
  stats?: () => [string, string][];
  feed?: () => { role: string; text: string }[];
  nav?: () => { head: string; items: { label: string; on?: boolean; go: () => Promise<void> | void }[] } | null;
};
type Ask = (q: string) => Promise<Reply>;
const T: Record<string, Record<string, string>> = {
  ru: { coreH: 'Ядро VAXO', board: 'Холст', talkH: 'Разговор', emptyB: 'Холст этого разговора', emptyP: 'Скажите задачу — результат появится здесь, как в обычном режиме.', clockL: 'ru-RU', wake: '«VAXO» — я рядом', listen: 'Слушаю', hear: 'Слышу', think: 'Думаю', talk: 'Говорю', paused: 'Пауза', hint: 'Скажите задачу — например: «VAXO, подготовь поездку по Европе на неделю»', tap: 'Нажмите на ядро, чтобы перебить или поставить на паузу', side: 'VAXO делает сейчас', idle: 'Здесь появится, что я делаю', cam: 'Камера', camOff: 'Камера выкл.', face: 'Лицо', core: 'Ядро', vax: 'Енот Vax', voice: 'Голос', end: 'Завершить', mic: 'Разрешите микрофон: значок у адреса сайта → Микрофон → Разрешить.', camErr: 'Камера недоступна — разрешите её у адреса сайта.', none: 'Не расслышал — повторите, пожалуйста.', s1: 'Понимаю задачу', s2: 'Работаю', s3: 'Готово', canvas: 'Результат — на холсте', v_warm: 'Тёплый', v_calm: 'Деловой', v_bright: 'Энергичный', v_soft: 'Мягкий' },
  ua: { coreH: 'Ядро VAXO', board: 'Полотно', talkH: 'Розмова', emptyB: 'Полотно цієї розмови', emptyP: 'Скажіть завдання — результат зʼявиться тут, як у звичайному режимі.', clockL: 'uk-UA', wake: '«VAXO» — я поруч', listen: 'Слухаю', hear: 'Чую', think: 'Думаю', talk: 'Говорю', paused: 'Пауза', hint: 'Скажіть завдання — наприклад: «VAXO, підготуй поїздку Європою на тиждень»', tap: 'Натисніть на ядро, щоб перебити або поставити на паузу', side: 'VAXO робить зараз', idle: 'Тут з’явиться, що я роблю', cam: 'Камера', camOff: 'Камера вимк.', face: 'Обличчя', core: 'Ядро', vax: 'Єнот Vax', voice: 'Голос', end: 'Завершити', mic: 'Дозвольте мікрофон: значок біля адреси сайту → Мікрофон → Дозволити.', camErr: 'Камера недоступна — дозвольте її біля адреси сайту.', none: 'Не розчув — повторіть, будь ласка.', s1: 'Розумію завдання', s2: 'Працюю', s3: 'Готово', canvas: 'Результат — на полотні', v_warm: 'Теплий', v_calm: 'Діловий', v_bright: 'Енергійний', v_soft: 'М’який' },
  en: { coreH: 'VAXO core', board: 'Canvas', talkH: 'Conversation', emptyB: 'This chat’s canvas', emptyP: 'Say a task — the result appears here, just like in the normal view.', clockL: 'en-GB', wake: '«VAXO» — I am here', listen: 'Listening', hear: 'Hearing', think: 'Thinking', talk: 'Speaking', paused: 'Paused', hint: 'Say a task — e.g. “VAXO, plan me a week in Europe”', tap: 'Tap the core to interrupt or pause', side: 'VAXO is doing now', idle: 'What I am doing shows here', cam: 'Camera', camOff: 'Camera off', face: 'Face', core: 'Core', vax: 'Vax the raccoon', voice: 'Voice', end: 'End', mic: 'Allow the microphone: the icon next to the address → Microphone → Allow.', camErr: 'Camera unavailable — allow it next to the address.', none: 'I did not catch that — please repeat.', s1: 'Understanding the task', s2: 'Working', s3: 'Done', canvas: 'The result is on the Canvas', v_warm: 'Warm', v_calm: 'Business', v_bright: 'Energetic', v_soft: 'Soft' },
};
const WORK: [RegExp, Record<string, string>][] = [
  [/сайт|лендинг|site|сторінк/i, { ru: 'Собираю сайт', ua: 'Збираю сайт', en: 'Building the site' }],
  [/поездк|путешеств|подорож|trip|travel|маршрут|отпуск/i, { ru: 'Строю маршрут и бюджет', ua: 'Будую маршрут і бюджет', en: 'Planning the route and budget' }],
  [/посчита|рассчита|порахуй|бюджет|calculat|budget|сколько|скільки/i, { ru: 'Считаю', ua: 'Рахую', en: 'Calculating' }],
  [/игр|гру|game|приложен|застосун|app/i, { ru: 'Пишу игру', ua: 'Пишу гру', en: 'Writing the game' }],
  [/найди|поищ|знайди|search|find|новост|курс|цен/i, { ru: 'Ищу в интернете', ua: 'Шукаю в інтернеті', en: 'Searching the web' }],
  [/.*/, { ru: 'Готовлю ответ', ua: 'Готую відповідь', en: 'Preparing the answer' }],
];
const CSS = `
.vxm{--bg:#05070b;--pan:rgba(14,17,24,.72);--ln:rgba(87,211,230,.16);--ln2:rgba(255,255,255,.07);--tx:#eef0f4;--mt:#8b93a3;--am:#f2a93b;--am2:#ffd28a;--cy:#57d3e6;--ok:#4ad295;
  position:fixed;inset:0;width:100vw;height:100vh;max-width:none;max-height:none;margin:0;border:0;padding:0;background:var(--bg);color:var(--tx);font:14.5px/1.5 Inter,system-ui,sans-serif;overflow:hidden}
.vxm[data-theme="light"]{--bg:#eef1f6;--pan:rgba(255,255,255,.78);--ln:rgba(20,120,140,.18);--ln2:rgba(10,20,40,.08);--tx:#10141c;--mt:#5d6576;--am:#d98a14;--am2:#b86e00;--cy:#0f9db3;--ok:#119a62}
.vxm::backdrop{background:#000}
.vxm .v-bg{position:absolute;inset:0;pointer-events:none;background:radial-gradient(1000px 700px at 18% 30%,color-mix(in srgb,var(--am) 13%,transparent),transparent 60%),radial-gradient(900px 600px at 80% 0%,color-mix(in srgb,var(--cy) 11%,transparent),transparent 60%)}
.vxm .v-bg::after{content:"";position:absolute;inset:0;background-image:linear-gradient(var(--ln2) 1px,transparent 1px),linear-gradient(90deg,var(--ln2) 1px,transparent 1px);background-size:44px 44px;mask-image:radial-gradient(ellipse at 50% 40%,#000 30%,transparent 80%)}
.vxm .v-in{position:relative;height:100%;display:grid;grid-template-columns:minmax(300px,1fr) minmax(0,1.45fr) minmax(250px,300px);grid-template-rows:auto minmax(0,1fr);gap:12px;padding:0 14px 14px}
.vxm .v-top{grid-column:1/-1;display:flex;align-items:center;gap:14px;padding:12px 4px 0}
.vxm .v-logo{font:800 19px Sora,Inter,sans-serif;letter-spacing:-.02em}.vxm .v-logo i{color:var(--am);font-style:normal}
.vxm .v-crumb{display:flex;gap:8px;align-items:baseline;min-width:0;flex:1}.vxm .v-crumb small{color:var(--mt);font-size:12px;white-space:nowrap}.vxm .v-crumb b{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vxm .v-wake{font:600 11px ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--cy);display:flex;gap:8px;align-items:center;white-space:nowrap}
.vxm .v-wake i{width:7px;height:7px;border-radius:50%;background:var(--cy);box-shadow:0 0 10px var(--cy);animation:vxb 1.6s infinite}
@keyframes vxb{50%{opacity:.25}}
.vxm .v-clock{font:600 12px ui-monospace,monospace;color:var(--mt);white-space:nowrap}
.vxm .v-st{font:700 11px ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;color:var(--am2);padding:5px 11px;border:1px solid color-mix(in srgb,var(--am) 45%,transparent);border-radius:999px;background:color-mix(in srgb,var(--am) 10%,transparent);white-space:nowrap}
.vxm .v-x{background:none;border:0;color:var(--mt);font-size:28px;cursor:pointer;line-height:1;padding:0 4px}
.vxm .v-pan{position:relative;min-height:0;border-radius:20px;background:var(--pan);border:1px solid var(--ln);backdrop-filter:blur(14px);box-shadow:0 20px 60px rgba(0,0,0,.25),inset 0 1px 0 rgba(255,255,255,.05);display:flex;flex-direction:column;overflow:hidden;animation:vxpan .6s cubic-bezier(.2,.8,.2,1) both}
.vxm .v-pan:nth-of-type(2){animation-delay:.08s}.vxm .v-pan:nth-of-type(3){animation-delay:.16s}
@keyframes vxpan{from{opacity:0;transform:translateY(16px) scale(.98)}}
.vxm .v-pan::before,.vxm .v-pan::after{content:"";position:absolute;width:16px;height:16px;border:2px solid var(--cy);opacity:.55;pointer-events:none}
.vxm .v-pan::before{left:8px;top:8px;border-right:0;border-bottom:0;border-radius:6px 0 0 0}.vxm .v-pan::after{right:8px;bottom:8px;border-left:0;border-top:0;border-radius:0 0 6px 0}
.vxm .v-pan h3{margin:0;padding:14px 18px 8px;font:600 11px ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:var(--mt);display:flex;justify-content:space-between;gap:8px;align-items:center}
.vxm .v-pan h3 em{font-style:normal;color:var(--am2);letter-spacing:.06em;text-transform:none;font:600 12.5px Inter,sans-serif;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.vxm .v-core{grid-row:2;grid-column:1}.vxm .v-board{grid-row:2;grid-column:2}
.vxm .v-stage{position:relative;flex:1;display:grid;place-items:center;min-height:200px}
.vxm canvas{width:min(100%,62vh);aspect-ratio:1;cursor:pointer;position:relative;z-index:1}
.vxm .v-face{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;opacity:0;transition:.4s;z-index:2}
.vxm .v-face .v-pose{width:min(56%,30vh);transition:opacity .22s;will-change:transform;filter:drop-shadow(0 0 24px color-mix(in srgb,var(--cy) 60%,transparent)) drop-shadow(0 14px 34px color-mix(in srgb,var(--am) 40%,transparent)) saturate(1.1)}
.vxm .v-face .v-halo{position:absolute;width:min(78%,44vh);aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,color-mix(in srgb,var(--am) 30%,transparent),color-mix(in srgb,var(--cy) 10%,transparent) 55%,transparent 70%);transform:scale(var(--h,1));transition:transform .08s}
.vxm .v-face::after{content:"";position:absolute;width:min(56%,30vh);aspect-ratio:1;border-radius:50%;background:repeating-linear-gradient(0deg,color-mix(in srgb,var(--cy) 16%,transparent) 0 2px,transparent 2px 5px);mix-blend-mode:screen;animation:vxscan 3s linear infinite;pointer-events:none}
.vxm .v-face .v-pose.v-gl{animation:vxglitch .25s steps(2) 1}
@keyframes vxglitch{50%{transform:translateX(3px) skewX(-4deg);filter:hue-rotate(40deg) drop-shadow(-4px 0 0 rgba(87,211,230,.7))}}
@keyframes vxscan{to{background-position:0 60px}}
.vxm .v-face .v-spark{position:absolute;inset:0;pointer-events:none}
.vxm .v-face .v-spark i{position:absolute;left:50%;top:50%;width:9px;height:9px;border-radius:50%;background:var(--am2);box-shadow:0 0 12px var(--am);animation:vxsp .9s ease-out forwards}
@keyframes vxsp{to{transform:translate(var(--x),var(--y)) scale(.2);opacity:0}}
.vxm[data-face="vax"] .v-face{opacity:1}.vxm[data-face="vax"] canvas{opacity:.4}
.vxm .v-hud{position:absolute;width:min(92%,66vh);aspect-ratio:1;border-radius:50%;pointer-events:none;border:1px dashed color-mix(in srgb,var(--cy) 30%,transparent);animation:vxspin 40s linear infinite}
.vxm .v-hud::before{content:"";position:absolute;inset:6%;border-radius:50%;border:2px solid transparent;border-top-color:color-mix(in srgb,var(--am) 60%,transparent);border-right-color:color-mix(in srgb,var(--cy) 40%,transparent);animation:vxspin 9s linear infinite reverse}
.vxm .v-hud::after{content:"";position:absolute;inset:-3%;border-radius:50%;background:conic-gradient(from 0deg,transparent 0 85%,color-mix(in srgb,var(--cy) 28%,transparent) 92%,transparent 100%);animation:vxspin 6s linear infinite}
@keyframes vxspin{to{transform:rotate(360deg)}}
.vxm .v-cam{position:absolute;right:12px;top:4px;width:min(30%,150px);aspect-ratio:3/4;object-fit:cover;border-radius:14px;border:1px solid var(--ln);background:#000;z-index:3}
.vxm .v-tip{position:absolute;top:0;left:50%;transform:translateX(-50%);color:var(--mt);font-size:12.5px;text-align:center;width:90%;margin:0;z-index:3}
.vxm .v-cap{padding:4px 18px 10px;text-align:center;display:grid;gap:6px}
.vxm .v-me{color:var(--mt);min-height:20px;font-size:13.5px}
.vxm .v-vx{font:600 clamp(16px,1.6vw,20px)/1.4 Sora,Inter,system-ui,sans-serif;min-height:28px;text-wrap:balance;max-height:4.4em;overflow:hidden}
.vxm .v-ctl{display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:center;padding:10px 14px 14px;border-top:1px solid var(--ln2)}
.vxm .v-ctl .v-lab{font:500 10.5px ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--mt);margin-left:4px}
.vxm .v-ctl button{font:600 12.5px Inter,sans-serif;color:var(--tx);background:color-mix(in srgb,var(--tx) 5%,transparent);border:1px solid var(--ln2);border-radius:999px;padding:7px 12px;cursor:pointer}
.vxm .v-ctl button[aria-pressed="true"]{border-color:var(--am);color:var(--am2);background:color-mix(in srgb,var(--am) 12%,transparent)}
.vxm .v-ctl .v-end{background:#c2410c;border-color:#c2410c;color:#fff}
.vxm .v-board .v-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;padding:0 14px 10px}
.vxm .v-kpi{border:1px solid var(--ln2);border-radius:14px;padding:9px 12px;background:color-mix(in srgb,var(--tx) 3%,transparent);display:grid;gap:2px;position:relative;overflow:hidden}
.vxm .v-kpi small{color:var(--mt);font-size:11.5px}.vxm .v-kpi b{font:700 20px Sora,Inter,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.vxm .v-kpi i{position:absolute;right:8px;bottom:8px;display:flex;gap:2px;align-items:flex-end;height:18px;opacity:.7}
.vxm .v-kpi i s{width:3px;background:linear-gradient(var(--cy),var(--am));border-radius:2px;animation:vxkb 1.8s ease-in-out infinite}
@keyframes vxkb{50%{transform:scaleY(.4)}}
.vxm .v-holo{position:relative;flex:1;min-height:0;margin:0 14px 14px;border-radius:16px;border:1px solid var(--ln);overflow:auto;background:color-mix(in srgb,var(--bg) 55%,transparent);box-shadow:inset 0 0 40px color-mix(in srgb,var(--cy) 8%,transparent)}
.vxm .v-holo::after{content:"";position:sticky;display:block;left:0;bottom:0;height:0;box-shadow:0 0 60px 30px color-mix(in srgb,var(--cy) 6%,transparent);pointer-events:none}
.vxm .v-holo>.v-clone{padding:12px;animation:vxholo .7s ease-out both;transform-origin:50% 0}
@keyframes vxholo{from{opacity:0;filter:blur(6px) brightness(1.6);transform:scaleY(.96)}}
.vxm .v-holo .v-empty{height:100%;display:grid;place-items:center;text-align:center;color:var(--mt);padding:24px}
.vxm .v-holo .v-empty b{display:block;color:var(--tx);font:600 17px Sora,Inter,sans-serif;margin-bottom:6px}
.vxm .v-holo .v-scan{position:sticky;top:0;height:0;z-index:5;pointer-events:none}
.vxm .v-holo .v-scan::before{content:"";position:absolute;left:0;right:0;top:0;height:120px;background:linear-gradient(transparent,color-mix(in srgb,var(--cy) 10%,transparent),transparent);animation:vxsweep 5s linear infinite}
@keyframes vxsweep{from{transform:translateY(-120px)}to{transform:translateY(80vh)}}
.vxm .v-side{grid-row:2;grid-column:3;overflow:auto}
.vxm .v-tasks,.vxm .v-feed,.vxm .v-nav{padding:0 14px 8px;display:grid;gap:8px}
.vxm .v-tk{border:1px solid var(--ln2);border-radius:14px;padding:10px 12px;background:color-mix(in srgb,var(--tx) 3%,transparent);display:grid;gap:6px;animation:vxin .45s cubic-bezier(.2,.8,.2,1) both}
@keyframes vxin{from{opacity:0;transform:translateX(14px)}}
.vxm .v-tk b{font-size:13.5px}.vxm .v-tk.v-ok b::after{content:" ✓";color:var(--ok)}
.vxm .v-tk .v-bar{height:4px;border-radius:9px;background:var(--ln2);overflow:hidden}.vxm .v-tk .v-bar i{display:block;height:100%;width:30%;background:linear-gradient(90deg,var(--am),var(--cy));animation:vxload 1.4s ease-in-out infinite}
.vxm .v-tk.v-ok .v-bar i{width:100%;animation:none}
@keyframes vxload{50%{width:85%}}
.vxm .v-tk button{justify-self:start;background:var(--am);color:#1a1205;border:0;border-radius:999px;padding:6px 12px;font:600 12.5px Inter,sans-serif;cursor:pointer}
.vxm .v-idle{color:var(--mt);font-size:13px;margin:0}
.vxm .v-fm{font-size:13px;line-height:1.45;padding:8px 10px;border-radius:12px;border-left:3px solid var(--cy);background:color-mix(in srgb,var(--tx) 3%,transparent);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.vxm .v-fm.v-u{border-left-color:var(--am);color:var(--mt)}
.vxm .v-nav button{display:flex;gap:8px;align-items:center;text-align:left;font:500 13px Inter,sans-serif;color:var(--tx);background:none;border:1px solid var(--ln2);border-radius:12px;padding:8px 10px;cursor:pointer}
.vxm .v-nav button::before{content:"";width:8px;height:8px;border-radius:50%;background:var(--mt);flex:none}
.vxm .v-nav button.v-on{border-color:var(--am)}.vxm .v-nav button.v-on::before{background:var(--am);box-shadow:0 0 8px var(--am)}
.vxm .v-nav button:hover{border-color:var(--cy)}
@media (max-width:980px){.vxm .v-in{grid-template-columns:1fr;grid-template-rows:auto auto auto auto;overflow:auto;height:100%}.vxm .v-core,.vxm .v-board,.vxm .v-side{grid-row:auto;grid-column:1}.vxm .v-core{min-height:62vh}.vxm .v-board{min-height:60vh}.vxm .v-clock,.vxm .v-wake{display:none}.vxm .v-stage{min-height:36vh}.vxm canvas{width:min(80vw,44vh)}}
@media (prefers-reduced-motion:reduce){.vxm *{animation:none!important}}
`;

export function openVoiceMode(lang: string, ask: Ask, vaxImg = '/mascot/vax-happy.webp', opts: { first?: string; onClose?: () => void; hud?: Hud; mount?: HTMLElement; openResult?: () => void } = {}): void {
  const t = T[lang] || T.en;
  if (!document.getElementById('vxm-css')) { const st = document.createElement('style'); st.id = 'vxm-css'; st.textContent = CSS; document.head.append(st); }
  const store = { get: (k: string) => { try { return localStorage.getItem(k) || ''; } catch { return ''; } }, set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private */ } } };
  const d = document.createElement('dialog'); d.className = 'vxm'; d.dataset.face = store.get('vx_face') || 'core';
  const voices = ['warm', 'calm', 'bright', 'soft'];
  d.dataset.theme = (document.documentElement.getAttribute('data-theme') || 'light') === 'dark' ? 'dark' : 'light';
  d.innerHTML = `<div class="v-bg"></div><div class="v-in">
    <header class="v-top"><b class="v-logo">VAXO<i>.</i></b><div class="v-crumb"><small class="v-cr"></small><b class="v-ttl"></b></div><div class="v-wake"><i></i>${t.wake}</div><span class="v-clock"></span><span class="v-st"></span><button type="button" class="v-x" aria-label="${t.end}">×</button></header>
    <section class="v-pan v-core"><h3>${t.coreH}<em class="v-fname"></em></h3>
      <div class="v-stage"><p class="v-tip">${t.hint}</p><video class="v-cam" playsinline muted hidden></video><div class="v-hud"></div><canvas width="900" height="900" aria-label="VAXO"></canvas><div class="v-face"><div class="v-halo"></div><img class="v-pose" src="${vaxImg}" alt="Vax"><div class="v-spark"></div></div></div>
      <div class="v-cap"><div class="v-me"></div><div class="v-vx" aria-live="polite"></div></div>
      <div class="v-ctl"><span class="v-lab">${t.face}</span><button type="button" data-f="core">${t.core}</button><button type="button" data-f="vax">${t.vax}</button>
        <span class="v-lab">${t.voice}</span>${voices.map((v) => `<button type="button" data-v="${v}">${t['v_' + v]}</button>`).join('')}
        <button type="button" class="v-camb">📷 ${t.cam}</button><button type="button" class="v-end">${t.end}</button></div></section>
    <section class="v-pan v-board"><h3>${t.board}<em class="v-bname"></em></h3><div class="v-kpis"></div><div class="v-holo"></div></section>
    <aside class="v-pan v-side"><h3>${t.side}</h3><div class="v-tasks"><p class="v-idle">${t.idle}</p></div><h3>${t.talkH}</h3><div class="v-feed"></div><h3 class="v-navh" hidden></h3><div class="v-nav"></div></aside></div>`;
  (opts.mount || document.body).append(d); d.showModal();
  const $ = <E extends HTMLElement>(s: string) => d.querySelector<E>(s)!;
  const stEl = $('.v-st'), cv = $<HTMLCanvasElement>('canvas'), cx = cv.getContext('2d')!, me = $('.v-me'), vx = $('.v-vx'), tasks = $('.v-tasks'), video = $<HTMLVideoElement>('.v-cam'), tip = $('.v-tip');
  let voice = store.get('vx_tts_voice') || 'warm';
  const paintCtl = () => { d.querySelectorAll<HTMLButtonElement>('[data-f]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === d.dataset.face))); d.querySelectorAll<HTMLButtonElement>('[data-v]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === voice))); };
  paintCtl();
  d.querySelectorAll<HTMLButtonElement>('[data-f]').forEach((b) => (b.onclick = () => { d.dataset.face = b.dataset.f!; store.set('vx_face', b.dataset.f!); paintCtl(); paintFace(); }));
  const paintFace = () => { const n = d.querySelector('.v-fname'); if (n) n.textContent = d.dataset.face === 'vax' ? t.vax : t.core; };
  paintFace();
  d.querySelectorAll<HTMLButtonElement>('[data-v]').forEach((b) => (b.onclick = () => { voice = b.dataset.v!; store.set('vx_tts_voice', voice); paintCtl(); }));
  // ---- the panel: this chat's canvas, numbers, conversation and the project's other chats
  const H = opts.hud || {};
  const clock = $('.v-clock'); const tickClock = () => { clock.textContent = new Date().toLocaleString(t.clockL, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); }; tickClock(); const clk = setInterval(tickClock, 15000);
  const refresh = () => {
    const title = H.title?.() || '', crumb = H.crumb?.() || '';
    $('.v-ttl').textContent = title; $('.v-cr').textContent = crumb; $('.v-bname').textContent = title;
    const k = $('.v-kpis'); k.replaceChildren(...(H.stats?.() || []).map(([a, b]) => { const e = document.createElement('div'); e.className = 'v-kpi'; e.innerHTML = '<small></small><b></b><i>' + Array.from({ length: 5 }, (_, i) => `<s style="height:${30 + ((i * 37) % 70)}%;animation-delay:${i * 0.15}s"></s>`).join('') + '</i>'; e.querySelector('small')!.textContent = a; e.querySelector('b')!.textContent = b; return e; }));
    k.hidden = !k.childElementCount;
    const holo = $('.v-holo'), node = H.canvas?.() || null;
    holo.replaceChildren(Object.assign(document.createElement('div'), { className: 'v-scan' }));
    if (node) { const w = document.createElement('div'); w.className = 'v-clone'; w.append(node); holo.append(w); }
    else { const e = document.createElement('div'); e.className = 'v-empty'; e.innerHTML = '<div><b></b><span></span></div>'; e.querySelector('b')!.textContent = t.emptyB; e.querySelector('span')!.textContent = t.emptyP; holo.append(e); }
    const feed = $('.v-feed'); const msgs = (H.feed?.() || []).slice(-6);
    feed.replaceChildren(...msgs.map((m) => { const e = document.createElement('div'); e.className = 'v-fm' + (m.role === 'user' ? ' v-u' : ''); e.textContent = m.text.replace(/\s+/g, ' ').slice(0, 220); return e; }));
    if (!msgs.length) { const e = document.createElement('p'); e.className = 'v-idle'; e.textContent = '—'; feed.append(e); }
    const nv = H.nav?.() || null, nh = $('.v-navh'), nb = $('.v-nav');
    nh.hidden = !nv; nh.textContent = nv?.head || ''; nb.replaceChildren(...(nv?.items || []).map((x) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = x.label; if (x.on) b.className = 'v-on'; b.onclick = async () => { await x.go(); setTimeout(refresh, 350); }; return b; }));
  };
  refresh();

  // ---- the core
  type Mode = 'listen' | 'hear' | 'think' | 'talk' | 'paused';
  let mode: Mode = 'paused', amp = 0, level = 0, alive = true; const t0 = performance.now();
  const N = 240, pts = Array.from({ length: N }, (_, i) => ({ a: (i / N) * Math.PI * 2, r: 0.6 + Math.random() * 0.24, s: 0.3 + Math.random() * 0.7, k: Math.random() }));
  const LAY = [[242, 169, 59], [87, 211, 230], [255, 206, 130], [235, 130, 40], [120, 232, 244]];
  const draw = (now: number) => {
    if (!alive) return;
    const tt = (now - t0) / 1000, W = cv.width, C = W / 2, light = d.dataset.theme === 'light';
    const target = mode === 'talk' ? 0.35 + level * 0.9 : mode === 'hear' ? 0.25 + level * 0.8 : mode === 'think' ? 0.3 : mode === 'paused' ? 0.04 : 0.12 + 0.07 * Math.sin(tt * 1.6);
    amp += (target - amp) * 0.18;
    cx.clearRect(0, 0, W, W);
    cx.globalCompositeOperation = light ? 'source-over' : 'lighter';
    const g = cx.createRadialGradient(C, C, 0, C, C, C * 0.8);
    g.addColorStop(0, `rgba(242,169,59,${(light ? 0.18 : 0.28) * (0.7 + amp)})`); g.addColorStop(0.5, `rgba(87,211,230,${light ? 0.06 : 0.08})`); g.addColorStop(1, 'rgba(0,0,0,0)');
    cx.fillStyle = g; cx.fillRect(0, 0, W, W);
    // the living blob: five soft layers that breathe, gather while thinking and swell with the voice
    const sp = mode === 'think' ? 2.4 : 1;
    for (let L = 0; L < LAY.length; L++) {
      const [r, gg, bb] = LAY[L], base = C * (0.27 + L * 0.02) * (1 + amp * 0.42);
      cx.beginPath();
      for (let i = 0; i <= 120; i++) {
        const a = (i / 120) * Math.PI * 2;
        const wob = Math.sin(a * 3 + tt * (0.8 + L * 0.23) * sp + L) * 0.12 + Math.sin(a * 5 - tt * (1.2 + L * 0.19) * sp + L * 2.1) * 0.08 + Math.sin(a * 8 + tt * 2.3 * sp + L * 1.3) * 0.045 * (1 + amp * 2);
        const rr = base * (1 + wob * (0.55 + amp * 1.5));
        const x = C + Math.cos(a) * rr, y = C + Math.sin(a) * rr;
        if (i) cx.lineTo(x, y); else cx.moveTo(x, y);
      }
      cx.closePath();
      const lg = cx.createRadialGradient(C - base * 0.25, C - base * 0.3, base * 0.1, C, C, base * 1.25);
      lg.addColorStop(0, light ? 'rgba(255,190,90,.55)' : 'rgba(255,236,200,.35)'); lg.addColorStop(0.45, `rgba(${r},${gg},${bb},${light ? 0.32 : 0.26})`); lg.addColorStop(1, `rgba(${r},${gg},${bb},0)`);
      cx.fillStyle = lg; cx.fill();
      cx.strokeStyle = `rgba(${r},${gg},${bb},${(light ? 0.55 : 0.45) * (0.5 + amp)})`; cx.lineWidth = 1.6; cx.stroke();
    }
    cx.globalCompositeOperation = 'source-over';
    for (const p of pts) {
      const a = p.a + tt * (mode === 'think' ? 1.5 : 0.25) * p.s * 0.4;
      const rr = (mode === 'think' ? p.r * 0.72 : p.r) * C * (1 + amp * 0.35 * Math.sin(tt * 3 + p.k * 6));
      cx.fillStyle = p.k > 0.6 ? `rgba(87,211,230,${0.25 + amp * 0.55})` : `rgba(242,169,59,${0.25 + amp * 0.55})`;
      cx.beginPath(); cx.arc(C + Math.cos(a) * rr, C + Math.sin(a) * rr, 1.6 + p.s * 2 * (0.6 + amp), 0, Math.PI * 2); cx.fill();
    }
    cx.strokeStyle = `rgba(87,211,230,${0.18 + amp * 0.3})`; cx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { cx.beginPath(); cx.arc(C, C, C * (0.8 + i * 0.06) * (1 + amp * 0.05), tt * (0.3 + i * 0.2), tt * (0.3 + i * 0.2) + Math.PI * (0.6 + i * 0.3)); cx.stroke(); }
    if (d.dataset.face === 'vax') {
      const talk = mode === 'talk', bob = talk ? level * 16 + Math.sin(tt * 9) * level * 4 : mode === 'think' ? Math.sin(tt * 2.2) * 5 : Math.sin(tt * 1.8) * 4;
      const tilt = mode === 'hear' ? Math.sin(tt * 2) * 6 + 4 : talk ? Math.sin(tt * 6) * 3 * (0.4 + level) : mode === 'think' ? Math.sin(tt * 1.3) * 8 : Math.sin(tt * 1.1) * 2;
      const sq = talk ? 1 + level * 0.07 : 1 + Math.sin(tt * 1.8) * 0.012;
      pose.style.transform = `translateY(${-bob}px) rotate(${tilt}deg) scale(${sq}, ${2 - sq})`;
      halo.style.setProperty('--h', String(1 + amp * 0.35));
    }
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
  // Vax the raccoon: a pose for every state, crossfaded, and motion that follows the voice (bob, tilt, squash).
  const POSE: Record<Mode, string> = { listen: '/mascot/vax-headset.webp', hear: '/mascot/vax-headset.webp', think: '/mascot/vax-detective.webp', talk: '/mascot/vax-happy.webp', paused: '/mascot/vax-avatar.webp' };
  Object.values(POSE).forEach((u) => { const i = new Image(); i.src = u; });
  const pose = $<HTMLImageElement>('.v-pose'), halo = $('.v-halo'), spark = $('.v-spark');
  const setPose = (u: string) => { if (pose.getAttribute('src') === u) return; pose.style.opacity = '0'; setTimeout(() => { pose.src = u; pose.style.opacity = '1'; pose.classList.remove('v-gl'); void pose.offsetWidth; pose.classList.add('v-gl'); }, 200); };
  const burst = () => { for (let i = 0; i < 14; i++) { const e = document.createElement('i'); const a = (i / 14) * Math.PI * 2, r = 120 + Math.random() * 90; e.style.setProperty('--x', `${Math.cos(a) * r}px`); e.style.setProperty('--y', `${Math.sin(a) * r}px`); spark.append(e); setTimeout(() => e.remove(), 950); } };
  const set = (m: Mode) => { if (mode === 'think' && m === 'talk') burst(); mode = m; stEl.textContent = t[m]; setPose(POSE[m]); };

  // ---- side column: what VAXO is doing
  const task = (title: string) => { tasks.querySelector('.v-idle')?.remove(); const e = document.createElement('div'); e.className = 'v-tk'; e.innerHTML = '<b></b><div class="v-bar"><i></i></div>'; e.querySelector('b')!.textContent = title; tasks.prepend(e); while (tasks.childElementCount > 8) tasks.lastElementChild?.remove(); return e; };

  // ---- speaking: live voice from /api/tts, the browser's voice as a fallback; the core follows the sound
  let audio: HTMLAudioElement | null = null, actx: AudioContext | null = null, stopTalk = () => {};
  async function say(text: string): Promise<void> {
    const sent = text.replace(/\s+/g, ' ').match(/[^.!?…]+[.!?…]*\s*/g) || [text];
    // the first sentence alone (VAXO starts talking fast), the rest in a few bigger pieces
    const parts = [sent[0], ...sent.slice(1).reduce<string[]>((a, p) => { const l = a.length - 1; if (l >= 0 && (a[l] + p).length < 480) a[l] += p; else a.push(p); return a; }, [])].filter((x) => x && x.trim()).slice(0, 7);
    const one = (p: string) => fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: p, voice, lang }) }).then((r) => (r.ok ? r.blob() : null)).catch(() => null);
    const fetchPart = async (p: string) => (await one(p)) || (await new Promise((ok) => setTimeout(ok, 1200)).then(() => one(p))) || (await new Promise((ok) => setTimeout(ok, 2500)).then(() => one(p)));
    let cancelled = false; stopTalk = () => { cancelled = true; audio?.pause(); stopSpeak(); };
    const first = await fetchPart(parts[0]);
    if (!first) {
      // no live voice: the browser speaks, the core pulses on its own
      vx.textContent = (sent[0] || text).trim().slice(0, 240);
      await new Promise<void>((ok) => { if (!canSpeak() || !speak(text, lang, () => ok())) ok(); const tick = () => { if (mode === 'talk') { level = 0.3 + 0.3 * Math.random(); setTimeout(tick, 120); } }; tick(); });
      return;
    }
    let next: Promise<Blob | null> | null = parts[1] ? fetchPart(parts[1]) : null;
    for (let i = 0; i < parts.length && !cancelled && alive; i++) {
      const blob = i === 0 ? first : await next;
      next = parts[i + 2] ? fetchPart(parts[i + 2]) : null;
      if (!blob || cancelled) continue;
      vx.textContent = parts[i].trim();
      await new Promise<void>((ok) => {
        audio = new Audio(URL.createObjectURL(blob));
        try {
          actx ??= new AudioContext();
          const src = actx.createMediaElementSource(audio), an = actx.createAnalyser(); an.fftSize = 512; src.connect(an); an.connect(actx.destination);
          const buf = new Uint8Array(an.fftSize);
          const loop = () => { if (!audio || audio.paused) return; an.getByteTimeDomainData(buf); let s = 0; for (const v of buf) s += (v - 128) ** 2; level = Math.min(1, Math.sqrt(s / buf.length) / 25); requestAnimationFrame(loop); };
          audio.onplay = loop;
        } catch { /* no analyser: the core still breathes */ }
        audio.onended = () => ok(); audio.onerror = () => ok(); audio.play().catch(() => ok());
      });
    }
  }

  // ---- listening with automatic end of speech
  let stream: MediaStream | null = null, cam: MediaStream | null = null, rec: MediaRecorder | null = null, mic: AudioContext | null = null;
  async function frame(): Promise<string> {
    if (!cam || video.hidden || !video.videoWidth) return '';
    const c = document.createElement('canvas'), k = Math.min(1, 1024 / video.videoWidth);
    c.width = Math.round(video.videoWidth * k); c.height = Math.round(video.videoHeight * k); c.getContext('2d')!.drawImage(video, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/jpeg', 0.82)); if (!blob) return '';
    const r = await fetch(`/api/file?name=camera-${Date.now()}.jpg`, { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: blob }).catch(() => null);
    const f = r?.ok ? await r.json().catch(() => null) : null;
    return f?.url ? `\n📎 ${String(f.name).replace(/\s+/g, '_')} ${f.url}` : '';
  }
  // One turn: the words heard → VAXO works → speaks → listens again.
  async function handle(said: string) {
    tip.textContent = t.tap; me.textContent = '«' + said + '»'; vx.textContent = ''; setTimeout(refresh, 300);
    const s1 = task(t.s1);
    const work = WORK.find(([re]) => re.test(said))![1][lang] || WORK[WORK.length - 1][1].en;
    const s2t = setTimeout(() => { s1.classList.add('v-ok'); task(work); }, 900);
    set('think'); level = 0;
    const reply = await ask(said + (await frame()));
    clearTimeout(s2t);
    tasks.querySelectorAll('.v-tk').forEach((e) => e.classList.add('v-ok'));
    if (!alive) return;
    if (!reply?.text) { listen(); return; }
    const done = task(t.s3); done.classList.add('v-ok');
    if (reply.made) { const b = document.createElement('button'); b.type = 'button'; b.textContent = t.canvas + ' →'; b.onclick = () => { close(); opts.openResult?.(); }; done.append(b); }
    vx.textContent = ''; refresh();
    set('talk'); await say(reply.text); level = 0;
    await new Promise((ok) => setTimeout(ok, 700)); // the room echo of VAXO's own voice dies down first
    if (alive && mode === 'talk') listen();
  }

  // The core follows the microphone while listening (both ways of listening use it).
  let meter: (() => void) | null = null;
  async function startMeter(): Promise<boolean> {
    try { stream ??= await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
    catch { set('paused'); tip.textContent = t.mic; return false; }
    mic ??= new AudioContext(); if (mic.state === 'suspended') await mic.resume().catch(() => {});
    if (!meter) {
      const src = mic.createMediaStreamSource(stream), an = mic.createAnalyser(); an.fftSize = 1024; src.connect(an);
      const buf = new Uint8Array(an.fftSize);
      let on = true; meter = () => { on = false; src.disconnect(); };
      const loop = () => { if (!on || !alive) return; if (mode === 'listen' || mode === 'hear') { an.getByteTimeDomainData(buf); let x = 0; for (const v of buf) x += (v - 128) ** 2; level = Math.min(1, Math.sqrt(x / buf.length) / 18); } requestAnimationFrame(loop); };
      loop();
    }
    return true;
  }

  // 20.11 (tested on Dmitry's Mac): the browser's own recognition hears speech but Google's service never answers there,
  // so it cannot be the main path. Now: the recorder ALWAYS listens and catches the end of the phrase itself (threshold
  // adapts to the microphone), Whisper on our server makes the text. The browser's recognition runs alongside only for
  // live captions; if it gives a final text in time, we use it and skip Whisper.
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  let srOff = !SR, recog: any = null;
  const LOC: Record<string, string> = { ru: 'ru-RU', ua: 'uk-UA', en: 'en-US' };
  // Whisper invents these on silence or background noise — never treat them as the person's words.
  const FAKE = /ии-помощник|^(\s*(ваксо|vaxo|вакс|vax)[\s,.!?]*){2,}$|субтитр|продолжение следует|спасибо за просмотр|подписывайтесь на канал|редактор субтитров|корректор|amara\.org|thanks for watching|subscribe to|DimaTorzok/i;
  async function listen() {
    if (!alive) return;
    set('listen'); me.textContent = '';
    if (!(await startMeter())) return;
    let srFinal = '';
    if (!srOff) {
      try {
        const r = new SR(); recog = r;
        r.lang = LOC[lang] || 'en-US'; r.interimResults = true; r.continuous = true;
        r.onresult = (e: any) => { let fin = '', mid = ''; for (let i = 0; i < e.results.length; i++) { const x = e.results[i][0].transcript; if (e.results[i].isFinal) fin += x; else mid += x; } srFinal = fin.trim(); const live = (fin + mid).trim(); if (live) me.textContent = live; };
        r.onerror = (e: any) => { if (['network', 'service-not-allowed', 'not-allowed', 'audio-capture', 'language-not-supported'].includes(e.error)) srOff = true; };
        r.onend = () => { recog = null; };
        r.start();
      } catch { srOff = true; }
    }
    const type = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find((x) => { try { return MediaRecorder.isTypeSupported(x); } catch { return false; } }) || '';
    const r = new MediaRecorder(stream!, type ? { mimeType: type } : undefined); rec = r;
    const chunks: Blob[] = []; r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const an = mic!.createAnalyser(); an.fftSize = 1024; const src = mic!.createMediaStreamSource(stream!); src.connect(an);
    const buf = new Uint8Array(an.fftSize);
    let spoke = false, quiet = 0, noise = 0, n = 0, voiced = 0, floor = 99, peak = 0; const start = Date.now();
    // setInterval, not requestAnimationFrame: it keeps listening even when the window is not in front.
    const iv = setInterval(() => {
      if (r.state !== 'recording') { clearInterval(iv); return; }
      an.getByteTimeDomainData(buf); let x = 0; for (const v of buf) x += (v - 128) ** 2; const rms = Math.sqrt(x / buf.length);
      const now = Date.now();
      // 20.11 (tested live): the room's noise floor drifts (a fan, a street), so it is tracked all the time — it falls at once
      // and rises slowly — and a phrase ends when the sound drops back near that floor or far below the phrase's own peak.
      floor = rms < floor ? rms : floor + (rms - floor) * 0.004;
      if (now - start < 450) { noise += rms; n++; return; }
      const thr = Math.max(3, Math.min((noise / Math.max(1, n)) * 2.6 + 1.6, floor * 2.4 + 1.6));
      const loud = rms > thr && (!spoke || rms > peak * 0.22);
      (window as any).__vxVM = { rms: Math.round(rms * 10) / 10, thr: Math.round(thr * 10) / 10, floor: Math.round(floor * 10) / 10, spoke, ac: mic?.state };
      if (loud) { if (!spoke) { set('hear'); if (!me.textContent) me.textContent = '…'; } spoke = true; quiet = 0; voiced += 60; peak = Math.max(peak * 0.995, rms); }
      else if (spoke) { quiet ||= now; if (now - quiet > 1100) { clearInterval(iv); r.stop(); } }
      if (now - start > 30000 || (!spoke && now - start > 30000)) { clearInterval(iv); r.stop(); }
    }, 60);
    r.onstop = async () => {
      src.disconnect();
      const live = recog; recog = null; try { live?.stop(); } catch { /* */ }
      if (!alive || mode === 'paused') return;
      if (!spoke || voiced < 650) { listen(); return; } // a cough or a click is not a phrase
      set('think');
      await new Promise((ok) => setTimeout(ok, srOff ? 0 : 350)); // a moment for the live recognition's final words
      let said = srFinal;
      if (!said) {
        if (!srOff) srOff = true; // heard speech but no text from the browser → Whisper from now on
        const blob = new Blob(chunks, { type: r.mimeType || type || 'audio/webm' });
        const res = await fetch(`/api/stt?lang=${encodeURIComponent(lang)}`, { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob }).catch(() => null);
        said = ((res?.ok ? await res.json().catch(() => null) : null)?.text || '').trim();
      }
      if (!said || FAKE.test(said) || said.replace(/[^\p{L}]/gu, '').length < 2) { me.textContent = ''; listen(); return; }
      handle(said);
    };
    r.start(250);
  }

  cv.onclick = () => {
    if (mode === 'talk') { stopTalk(); listen(); return; }
    if (mode === 'paused') { listen(); return; }
    if (mode === 'listen' || mode === 'hear') { set('paused'); try { recog?.abort(); } catch { /* */ } if (rec?.state === 'recording') rec.stop(); }
  };
  const camb = $<HTMLButtonElement>('.v-camb');
  camb.onclick = async () => {
    if (cam) { cam.getTracks().forEach((x) => x.stop()); cam = null; video.hidden = true; camb.textContent = '📷 ' + t.cam; camb.setAttribute('aria-pressed', 'false'); return; }
    try {
      cam = await navigator.mediaDevices.getUserMedia({ video: /Android|iPhone|iPad/i.test(navigator.userAgent) ? { facingMode: 'environment' } : true });
      video.srcObject = cam; video.muted = true; video.hidden = false; await video.play().catch(() => {}); camb.textContent = '📷 ' + t.camOff; camb.setAttribute('aria-pressed', 'true');
    } catch (e) { tip.textContent = t.camErr + ' (' + ((e as Error)?.name || 'error') + ')'; }
  };
  function close() {
    alive = false; clearInterval(clk); stopTalk(); try { recog?.abort(); if (rec?.state === 'recording') rec.stop(); } catch { /* */ } meter?.();
    stream?.getTracks().forEach((x) => x.stop()); cam?.getTracks().forEach((x) => x.stop()); mic?.close().catch(() => {}); actx?.close().catch(() => {});
    if (d.open) d.close(); d.remove(); opts.onClose?.();
  }
  $('.v-x').onclick = close; $('.v-end').onclick = close; d.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  if (opts.first) { startMeter().then(() => handle(opts.first!)); } else listen();
}
