// «Привет, VAXO» (Decision 69, 20.11): a hands-free conversation that looks and sounds like a personal Jarvis.
// Full screen, a living core (or Vax the raccoon) that breathes while listening, gathers while thinking and pulses with
// the voice; live captions; a side column with what VAXO is doing right now; camera optional (each question then
// carries a photo). Speech → text: /api/stt (Whisper). Text → speech: /api/tts (live Google voices), else the browser.
import { speak, stopSpeak, canSpeak } from './voice';

type Reply = { text: string; made?: string } | null;
type Ask = (q: string) => Promise<Reply>;
const T: Record<string, Record<string, string>> = {
  ru: { wake: '«VAXO» — я рядом', listen: 'Слушаю', hear: 'Слышу', think: 'Думаю', talk: 'Говорю', paused: 'Пауза', hint: 'Скажите задачу — например: «VAXO, подготовь поездку по Европе на неделю»', tap: 'Нажмите на ядро, чтобы перебить или поставить на паузу', side: 'VAXO делает сейчас', idle: 'Здесь появится, что я делаю', cam: 'Камера', camOff: 'Камера выкл.', face: 'Лицо', core: 'Ядро', vax: 'Енот Vax', voice: 'Голос', end: 'Завершить', mic: 'Разрешите микрофон: значок у адреса сайта → Микрофон → Разрешить.', camErr: 'Камера недоступна — разрешите её у адреса сайта.', none: 'Не расслышал — повторите, пожалуйста.', s1: 'Понимаю задачу', s2: 'Работаю', s3: 'Готово', canvas: 'Результат — на холсте', v_warm: 'Тёплый', v_calm: 'Деловой', v_bright: 'Энергичный', v_soft: 'Мягкий' },
  ua: { wake: '«VAXO» — я поруч', listen: 'Слухаю', hear: 'Чую', think: 'Думаю', talk: 'Говорю', paused: 'Пауза', hint: 'Скажіть завдання — наприклад: «VAXO, підготуй поїздку Європою на тиждень»', tap: 'Натисніть на ядро, щоб перебити або поставити на паузу', side: 'VAXO робить зараз', idle: 'Тут з’явиться, що я роблю', cam: 'Камера', camOff: 'Камера вимк.', face: 'Обличчя', core: 'Ядро', vax: 'Єнот Vax', voice: 'Голос', end: 'Завершити', mic: 'Дозвольте мікрофон: значок біля адреси сайту → Мікрофон → Дозволити.', camErr: 'Камера недоступна — дозвольте її біля адреси сайту.', none: 'Не розчув — повторіть, будь ласка.', s1: 'Розумію завдання', s2: 'Працюю', s3: 'Готово', canvas: 'Результат — на полотні', v_warm: 'Теплий', v_calm: 'Діловий', v_bright: 'Енергійний', v_soft: 'М’який' },
  en: { wake: '«VAXO» — I am here', listen: 'Listening', hear: 'Hearing', think: 'Thinking', talk: 'Speaking', paused: 'Paused', hint: 'Say a task — e.g. “VAXO, plan me a week in Europe”', tap: 'Tap the core to interrupt or pause', side: 'VAXO is doing now', idle: 'What I am doing shows here', cam: 'Camera', camOff: 'Camera off', face: 'Face', core: 'Core', vax: 'Vax the raccoon', voice: 'Voice', end: 'End', mic: 'Allow the microphone: the icon next to the address → Microphone → Allow.', camErr: 'Camera unavailable — allow it next to the address.', none: 'I did not catch that — please repeat.', s1: 'Understanding the task', s2: 'Working', s3: 'Done', canvas: 'The result is on the Canvas', v_warm: 'Warm', v_calm: 'Business', v_bright: 'Energetic', v_soft: 'Soft' },
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
.vxm{position:fixed;inset:0;width:100vw;height:100vh;max-width:none;max-height:none;margin:0;border:0;padding:0;background:#07080b;color:#eef0f4;font:15px/1.5 Inter,system-ui,sans-serif;overflow:hidden}
.vxm::backdrop{background:#000}
.vxm .bg{position:absolute;inset:0;background:radial-gradient(900px 600px at 65% 0%,rgba(87,211,230,.09),transparent 60%),radial-gradient(800px 500px at 20% 100%,rgba(242,169,59,.08),transparent 60%)}
.vxm .in{position:relative;height:100%;display:grid;grid-template-columns:minmax(0,1fr) 320px;grid-template-rows:auto 1fr auto}
.vxm .top{grid-column:1/-1;display:flex;justify-content:space-between;align-items:center;padding:16px 22px}
.vxm .wake{font:600 12px ui-monospace,monospace;letter-spacing:.14em;text-transform:uppercase;color:#57d3e6;display:flex;gap:8px;align-items:center}
.vxm .wake i{width:8px;height:8px;border-radius:50%;background:#57d3e6;box-shadow:0 0 12px #57d3e6;animation:vxb 1.6s infinite}
@keyframes vxb{50%{opacity:.25}}
.vxm .st{font:700 12px ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;color:#ffd28a;padding:6px 12px;border:1px solid #2a2e38;border-radius:999px}
.vxm .x{background:none;border:0;color:#9aa1b0;font-size:28px;cursor:pointer;line-height:1}
.vxm .stage{position:relative;display:grid;place-items:center;min-height:0}
.vxm canvas{width:min(70vh,80%);aspect-ratio:1;cursor:pointer}
.vxm .face{position:absolute;inset:0;display:grid;place-items:center;pointer-events:none;opacity:0;transition:.4s}
.vxm .face img{width:min(28vh,34%);filter:drop-shadow(0 12px 40px rgba(242,169,59,.45));animation:vxbob 2.4s ease-in-out infinite}
@keyframes vxbob{50%{transform:translateY(-8px)}}
.vxm[data-face="vax"] .face{opacity:1}.vxm[data-face="vax"] canvas{opacity:.35}
.vxm .cam{position:absolute;left:22px;top:8px;width:min(22vw,200px);aspect-ratio:3/4;object-fit:cover;border-radius:18px;border:1px solid #2a2e38;background:#000}
.vxm .cap{position:absolute;left:6%;right:6%;bottom:18px;text-align:center;display:grid;gap:8px}
.vxm .me{color:#9aa1b0;min-height:22px}
.vxm .vx{font:600 clamp(17px,2.2vw,23px)/1.4 Sora,Inter,system-ui,sans-serif;min-height:60px;text-wrap:balance;max-height:30vh;overflow:auto}
.vxm .side{grid-row:2/3;grid-column:2;border-left:1px solid #1d2028;padding:16px;display:flex;flex-direction:column;gap:10px;min-height:0;overflow:auto;background:rgba(10,11,15,.55)}
.vxm .side h3{margin:0;font:600 12px ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;color:#9aa1b0}
.vxm .tk{border:1px solid #232733;border-radius:14px;padding:11px 12px;background:#12141a;display:grid;gap:6px;animation:vxin .45s cubic-bezier(.2,.8,.2,1) both}
@keyframes vxin{from{opacity:0;transform:translateX(14px)}}
.vxm .tk b{font-size:14px}.vxm .tk.ok b::after{content:" ✓";color:#4ad295}
.vxm .tk .bar{height:4px;border-radius:9px;background:#22262f;overflow:hidden}.vxm .tk .bar i{display:block;height:100%;width:30%;background:linear-gradient(90deg,#f2a93b,#57d3e6);animation:vxload 1.4s ease-in-out infinite}
.vxm .tk.ok .bar i{width:100%;animation:none}
@keyframes vxload{50%{width:85%}}
.vxm .tk button{justify-self:start;background:#f2a93b;color:#1a1205;border:0;border-radius:999px;padding:6px 12px;font:600 13px Inter,sans-serif;cursor:pointer}
.vxm .idle{color:#5d6472;font-size:13.5px}
.vxm .ctl{grid-column:1/-1;display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center;padding:12px 18px 18px;border-top:1px solid #1d2028}
.vxm .ctl .lab{font:500 11px ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;color:#6c7383}
.vxm .ctl button{font:600 13px Inter,sans-serif;color:#eef0f4;background:#151820;border:1px solid #2a2e38;border-radius:999px;padding:8px 13px;cursor:pointer}
.vxm .ctl button[aria-pressed="true"]{border-color:#f2a93b;color:#ffd28a;background:rgba(242,169,59,.1)}
.vxm .ctl .end{background:#c2410c;border-color:#c2410c}
.vxm .tip{position:absolute;top:8px;left:50%;transform:translateX(-50%);color:#6c7383;font-size:13px;text-align:center;width:min(90%,560px)}
@media (max-width:860px){.vxm .in{grid-template-columns:1fr;grid-template-rows:auto 1fr auto auto}.vxm .side{grid-column:1;grid-row:3;border-left:0;border-top:1px solid #1d2028;max-height:24vh}.vxm .cam{width:90px}}
@media (prefers-reduced-motion:reduce){.vxm *{animation:none!important}}
`;

export function openVoiceMode(lang: string, ask: Ask, vaxImg = '/mascot/vax-happy.webp'): void {
  const t = T[lang] || T.en;
  if (!document.getElementById('vxm-css')) { const st = document.createElement('style'); st.id = 'vxm-css'; st.textContent = CSS; document.head.append(st); }
  const store = { get: (k: string) => { try { return localStorage.getItem(k) || ''; } catch { return ''; } }, set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private */ } } };
  const d = document.createElement('dialog'); d.className = 'vxm'; d.dataset.face = store.get('vx_face') || 'core';
  const voices = ['warm', 'calm', 'bright', 'soft'];
  d.innerHTML = `<div class="bg"></div><div class="in">
    <div class="top"><div class="wake"><i></i>${t.wake}</div><div style="display:flex;gap:12px;align-items:center"><span class="st"></span><button type="button" class="x" aria-label="${t.end}">×</button></div></div>
    <div class="stage"><p class="tip">${t.hint}</p><video class="cam" playsinline muted hidden></video><canvas width="900" height="900" aria-label="VAXO"></canvas><div class="face"><img src="${vaxImg}" alt="Vax"></div>
      <div class="cap"><div class="me"></div><div class="vx"></div></div></div>
    <aside class="side"><h3>${t.side}</h3><div class="tasks"><p class="idle">${t.idle}</p></div></aside>
    <div class="ctl"><span class="lab">${t.face}</span><button type="button" data-f="core">${t.core}</button><button type="button" data-f="vax">${t.vax}</button>
      <span class="lab">${t.voice}</span>${voices.map((v) => `<button type="button" data-v="${v}">${t['v_' + v]}</button>`).join('')}
      <button type="button" class="camb">📷 ${t.cam}</button><button type="button" class="end">${t.end}</button></div></div>`;
  document.body.append(d); d.showModal();
  const $ = <E extends HTMLElement>(s: string) => d.querySelector<E>(s)!;
  const stEl = $('.st'), cv = $<HTMLCanvasElement>('canvas'), cx = cv.getContext('2d')!, me = $('.me'), vx = $('.vx'), tasks = $('.tasks'), video = $<HTMLVideoElement>('.cam'), tip = $('.tip');
  let voice = store.get('vx_tts_voice') || 'warm';
  const paintCtl = () => { d.querySelectorAll<HTMLButtonElement>('[data-f]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.f === d.dataset.face))); d.querySelectorAll<HTMLButtonElement>('[data-v]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.v === voice))); };
  paintCtl();
  d.querySelectorAll<HTMLButtonElement>('[data-f]').forEach((b) => (b.onclick = () => { d.dataset.face = b.dataset.f!; store.set('vx_face', b.dataset.f!); paintCtl(); }));
  d.querySelectorAll<HTMLButtonElement>('[data-v]').forEach((b) => (b.onclick = () => { voice = b.dataset.v!; store.set('vx_tts_voice', voice); paintCtl(); }));

  // ---- the core
  type Mode = 'listen' | 'hear' | 'think' | 'talk' | 'paused';
  let mode: Mode = 'paused', amp = 0, level = 0, alive = true; const t0 = performance.now();
  const N = 240, pts = Array.from({ length: N }, (_, i) => ({ a: (i / N) * Math.PI * 2, r: 0.6 + Math.random() * 0.24, s: 0.3 + Math.random() * 0.7, k: Math.random() }));
  const draw = (now: number) => {
    if (!alive) return;
    const tt = (now - t0) / 1000, W = cv.width, C = W / 2;
    const target = mode === 'talk' ? 0.35 + level * 0.9 : mode === 'hear' ? 0.25 + level * 0.8 : mode === 'think' ? 0.28 : mode === 'paused' ? 0.04 : 0.12 + 0.07 * Math.sin(tt * 1.6);
    amp += (target - amp) * 0.18;
    cx.clearRect(0, 0, W, W);
    const g = cx.createRadialGradient(C, C, 8, C, C, C * 0.62);
    g.addColorStop(0, `rgba(255,214,150,${0.55 + amp * 0.4})`); g.addColorStop(0.38, 'rgba(242,169,59,.32)'); g.addColorStop(1, 'rgba(87,211,230,0)');
    cx.fillStyle = g; cx.beginPath(); cx.arc(C, C, C * (0.42 + amp * 0.14), 0, Math.PI * 2); cx.fill();
    for (const p of pts) {
      const a = p.a + tt * (mode === 'think' ? 1.5 : 0.25) * p.s * 0.4;
      const rr = (mode === 'think' ? p.r * 0.7 : p.r) * C * (1 + amp * 0.35 * Math.sin(tt * 3 + p.k * 6));
      cx.fillStyle = p.k > 0.6 ? `rgba(87,211,230,${0.3 + amp * 0.55})` : `rgba(242,169,59,${0.3 + amp * 0.55})`;
      cx.beginPath(); cx.arc(C + Math.cos(a) * rr, C + Math.sin(a) * rr, 2 + p.s * 2.4 * (0.6 + amp), 0, Math.PI * 2); cx.fill();
    }
    cx.strokeStyle = `rgba(87,211,230,${0.16 + amp * 0.3})`; cx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { cx.beginPath(); cx.arc(C, C, C * (0.8 + i * 0.06) * (1 + amp * 0.05), tt * (0.3 + i * 0.2), tt * (0.3 + i * 0.2) + Math.PI * (0.6 + i * 0.3)); cx.stroke(); }
    requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
  const set = (m: Mode) => { mode = m; stEl.textContent = t[m]; };

  // ---- side column: what VAXO is doing
  const task = (title: string) => { tasks.querySelector('.idle')?.remove(); const e = document.createElement('div'); e.className = 'tk'; e.innerHTML = '<b></b><div class="bar"><i></i></div>'; e.querySelector('b')!.textContent = title; tasks.prepend(e); while (tasks.childElementCount > 8) tasks.lastElementChild?.remove(); return e; };

  // ---- speaking: live voice from /api/tts, the browser's voice as a fallback; the core follows the sound
  let audio: HTMLAudioElement | null = null, actx: AudioContext | null = null, stopTalk = () => {};
  async function say(text: string): Promise<void> {
    const parts = (text.match(/[^.!?…]+[.!?…]*\s*/g) || [text]).reduce<string[]>((a, p) => { const l = a.length - 1; if (l >= 0 && (a[l] + p).length < 260) a[l] += p; else a.push(p); return a; }, []).slice(0, 8);
    const fetchPart = (p: string) => fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: p, voice, lang }) }).then((r) => (r.ok ? r.blob() : null)).catch(() => null);
    let cancelled = false; stopTalk = () => { cancelled = true; audio?.pause(); stopSpeak(); };
    const first = await fetchPart(parts[0]);
    if (!first) {
      // no live voice: the browser speaks, the core pulses on its own
      await new Promise<void>((ok) => { if (!canSpeak() || !speak(text, lang, () => ok())) ok(); const tick = () => { if (mode === 'talk') { level = 0.3 + 0.3 * Math.random(); setTimeout(tick, 120); } }; tick(); });
      return;
    }
    let next: Promise<Blob | null> | null = parts[1] ? fetchPart(parts[1]) : null;
    for (let i = 0; i < parts.length && !cancelled && alive; i++) {
      const blob = i === 0 ? first : await next;
      next = parts[i + 2] ? fetchPart(parts[i + 2]) : null;
      if (!blob || cancelled) continue;
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
  async function listen() {
    if (!alive) return;
    set('listen');
    try { stream ??= await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
    catch { set('paused'); tip.textContent = t.mic; return; }
    mic ??= new AudioContext();
    const src = mic.createMediaStreamSource(stream), an = mic.createAnalyser(); an.fftSize = 1024; src.connect(an);
    const buf = new Uint8Array(an.fftSize);
    const type = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find((x) => { try { return MediaRecorder.isTypeSupported(x); } catch { return false; } }) || '';
    const r = new MediaRecorder(stream, type ? { mimeType: type } : undefined); rec = r;
    const chunks: Blob[] = []; r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    let spoke = false, quiet = 0; const start = performance.now();
    const loop = () => {
      if (r.state !== 'recording') return;
      an.getByteTimeDomainData(buf); let s = 0; for (const v of buf) s += (v - 128) ** 2; const rms = Math.sqrt(s / buf.length); level = Math.min(1, rms / 30);
      const now = performance.now();
      if (rms > 9) { if (!spoke) set('hear'); spoke = true; quiet = 0; } else if (spoke) { quiet ||= now; if (now - quiet > 1200) { r.stop(); return; } }
      if (now - start > 45000 || (!spoke && now - start > 30000)) { r.stop(); return; }
      requestAnimationFrame(loop);
    };
    r.onstop = async () => {
      src.disconnect();
      if (!alive || mode === 'paused') return;
      if (!spoke) { listen(); return; }
      set('think'); level = 0;
      const blob = new Blob(chunks, { type: r.mimeType || type || 'audio/webm' });
      const res = await fetch(`/api/stt?lang=${encodeURIComponent(lang)}`, { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob }).catch(() => null);
      const said = ((res?.ok ? await res.json().catch(() => null) : null)?.text || '').trim();
      if (!said) { vx.textContent = t.none; listen(); return; }
      tip.textContent = t.tap; me.textContent = '«' + said + '»'; vx.textContent = '';
      const s1 = task(t.s1);
      const work = WORK.find(([re]) => re.test(said))![1][lang] || WORK[WORK.length - 1][1].en;
      const s2t = setTimeout(() => { s1.classList.add('ok'); task(work); }, 900);
      const reply = await ask(said + (await frame()));
      clearTimeout(s2t);
      tasks.querySelectorAll('.tk').forEach((e) => e.classList.add('ok'));
      if (!alive) return;
      if (!reply?.text) { listen(); return; }
      const done = task(t.s3); done.classList.add('ok');
      if (reply.made) { const b = document.createElement('button'); b.type = 'button'; b.textContent = t.canvas + ' →'; b.onclick = () => close(); done.append(b); }
      vx.textContent = reply.text.slice(0, 600);
      set('talk'); await say(reply.text); level = 0;
      if (alive && mode === 'talk') listen();
    };
    r.start(250); loop();
  }

  cv.onclick = () => {
    if (mode === 'talk') { stopTalk(); listen(); return; }
    if (mode === 'paused') { listen(); return; }
    if (mode === 'listen' || mode === 'hear') { set('paused'); if (rec?.state === 'recording') rec.stop(); }
  };
  const camb = $<HTMLButtonElement>('.camb');
  camb.onclick = async () => {
    if (cam) { cam.getTracks().forEach((x) => x.stop()); cam = null; video.hidden = true; camb.textContent = '📷 ' + t.cam; camb.setAttribute('aria-pressed', 'false'); return; }
    try { cam = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } } }); video.srcObject = cam; video.hidden = false; await video.play(); camb.textContent = '📷 ' + t.camOff; camb.setAttribute('aria-pressed', 'true'); }
    catch { tip.textContent = t.camErr; }
  };
  function close() {
    alive = false; stopTalk(); try { if (rec?.state === 'recording') rec.stop(); } catch { /* */ }
    stream?.getTracks().forEach((x) => x.stop()); cam?.getTracks().forEach((x) => x.stop()); mic?.close().catch(() => {}); actx?.close().catch(() => {});
    if (d.open) d.close(); d.remove();
  }
  $('.x').onclick = close; $('.end').onclick = close; d.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  listen();
}
