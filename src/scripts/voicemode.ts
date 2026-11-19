// Voice mode (18.11, Dmitry: «like Gemini / ChatGPT»): a hands-free conversation. Vax listens, notices when you stop
// talking, answers aloud in the voice you chose, and listens again. The camera can be on: each question then carries a
// photo of what you show, so Vax can see it and help (a broken tap, a document, a dish, a screen).
// Speech → text by /api/stt (Whisper, works on iPhone and Android too); text → speech by the browser's own voices.
import { speak, stopSpeak, canSpeak } from './voice';

type Ask = (q: string) => Promise<string | null>;
const T: Record<string, Record<string, string>> = {
  ru: { h: 'Голосовой режим', listen: 'Слушаю… говорите', hear: 'Слышу вас…', think: 'Думаю…', talk: 'Говорю… нажмите на круг, чтобы перебить', paused: 'Пауза — нажмите на круг', cam: 'Камера', camOff: 'Выключить камеру', voice: 'Голос', end: 'Завершить', mic: 'Разрешите микрофон в настройках браузера (значок у адреса сайта).', camErr: 'Камера недоступна — разрешите её у адреса сайта.', none: 'Не расслышал — повторите, пожалуйста.', auto: 'Авто', speed: 'Скорость' },
  ua: { h: 'Голосовий режим', listen: 'Слухаю… говоріть', hear: 'Чую вас…', think: 'Думаю…', talk: 'Говорю… натисніть на коло, щоб перебити', paused: 'Пауза — натисніть на коло', cam: 'Камера', camOff: 'Вимкнути камеру', voice: 'Голос', end: 'Завершити', mic: 'Дозвольте мікрофон у налаштуваннях браузера (значок біля адреси сайту).', camErr: 'Камера недоступна — дозвольте її біля адреси сайту.', none: 'Не розчув — повторіть, будь ласка.', auto: 'Авто', speed: 'Швидкість' },
  en: { h: 'Voice mode', listen: 'Listening… speak', hear: 'I hear you…', think: 'Thinking…', talk: 'Speaking… tap the circle to interrupt', paused: 'Paused — tap the circle', cam: 'Camera', camOff: 'Camera off', voice: 'Voice', end: 'End', mic: 'Allow the microphone in the browser (the icon next to the address).', camErr: 'Camera unavailable — allow it next to the address.', none: 'I did not catch that — please repeat.', auto: 'Auto', speed: 'Speed' },
};
const LOC: Record<string, string> = { ru: 'ru', ua: 'uk', en: 'en' };

export function voiceVoices(lang: string): SpeechSynthesisVoice[] {
  if (!canSpeak()) return [];
  const two = LOC[lang] || 'en';
  return speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith(two));
}

export function openVoiceMode(lang: string, ask: Ask): void {
  const t = T[lang] || T.en;
  const d = document.createElement('dialog'); d.className = 'vmode';
  d.innerHTML = `<div class="vm-in">
    <div class="vm-top"><b>🎧 ${t.h}</b><button type="button" class="vm-x" aria-label="${t.end}">×</button></div>
    <video class="vm-cam" playsinline muted hidden></video>
    <button type="button" class="vm-orb" aria-label="${t.h}"><i></i></button>
    <p class="vm-st"></p>
    <div class="vm-log"></div>
    <div class="vm-ctl">
      <button type="button" class="vm-camb">📷 ${t.cam}</button>
      <label>${t.voice} <select class="vm-voice"><option value="">${t.auto}</option></select></label>
      <label>${t.speed} <select class="vm-rate"><option value="0.9">0.9×</option><option value="1.03" selected>1×</option><option value="1.2">1.2×</option><option value="1.4">1.4×</option></select></label>
      <button type="button" class="vm-end">${t.end}</button>
    </div></div>`;
  document.body.append(d); d.showModal();
  const $ = <E extends HTMLElement>(s: string) => d.querySelector<E>(s)!;
  const st = $('.vm-st'), orb = $('.vm-orb'), log = $('.vm-log'), video = $<HTMLVideoElement>('.vm-cam'), camb = $('.vm-camb');
  const vsel = $<HTMLSelectElement>('.vm-voice'), rsel = $<HTMLSelectElement>('.vm-rate');
  const store = { get: (k: string) => { try { return localStorage.getItem(k) || ''; } catch { return ''; } }, set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* private */ } } };
  const fillVoices = () => { const cur = store.get('vx_voice'); vsel.replaceChildren(new Option(t.auto, '')); for (const v of voiceVoices(lang)) { const o = new Option(v.name.replace(/\s*\(.*\)/, ''), v.name); o.selected = v.name === cur; vsel.append(o); } };
  fillVoices(); if (canSpeak()) speechSynthesis.addEventListener('voiceschanged', fillVoices);
  rsel.value = store.get('vx_rate') || '1.03';
  vsel.onchange = () => store.set('vx_voice', vsel.value); rsel.onchange = () => store.set('vx_rate', rsel.value);

  let alive = true, state: 'listen' | 'hear' | 'think' | 'talk' | 'paused' = 'paused';
  let stream: MediaStream | null = null, cam: MediaStream | null = null, rec: MediaRecorder | null = null, ac: AudioContext | null = null, raf = 0;
  const set = (s: typeof state) => { state = s; d.dataset.state = s; st.textContent = t[s]; };
  const line = (who: string, text: string) => { const p = document.createElement('p'); p.className = 'vm-' + who; p.textContent = text; log.append(p); while (log.childElementCount > 6) log.firstElementChild?.remove(); log.scrollTop = log.scrollHeight; };

  async function frame(): Promise<string> {
    if (!cam || video.hidden || !video.videoWidth) return '';
    const c = document.createElement('canvas'), k = Math.min(1, 1024 / video.videoWidth);
    c.width = Math.round(video.videoWidth * k); c.height = Math.round(video.videoHeight * k);
    c.getContext('2d')!.drawImage(video, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/jpeg', 0.82));
    if (!blob) return '';
    const r = await fetch(`/api/file?name=camera-${Date.now()}.jpg`, { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: blob }).catch(() => null);
    const f = r?.ok ? await r.json().catch(() => null) : null;
    return f?.url ? `\n📎 ${String(f.name).replace(/\s+/g, '_')} ${f.url}` : '';
  }

  async function listen() {
    if (!alive) return;
    set('listen');
    try { stream ??= await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); }
    catch { st.textContent = t.mic; set('paused'); st.textContent = t.mic; return; }
    ac ??= new AudioContext();
    const src = ac.createMediaStreamSource(stream), an = ac.createAnalyser(); an.fftSize = 1024; src.connect(an);
    const buf = new Uint8Array(an.fftSize);
    const type = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find((x) => { try { return MediaRecorder.isTypeSupported(x); } catch { return false; } }) || '';
    rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    const chunks: Blob[] = []; rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    let spoke = false, quietSince = 0; const t0 = performance.now();
    const loop = () => {
      if (!rec || rec.state !== 'recording') return;
      an.getByteTimeDomainData(buf); let sum = 0; for (const v of buf) sum += (v - 128) ** 2; const rms = Math.sqrt(sum / buf.length);
      orb.style.setProperty('--lv', String(Math.min(1, rms / 30)));
      const now = performance.now();
      if (rms > 9) { if (!spoke) set('hear'); spoke = true; quietSince = 0; } else if (spoke) { quietSince ||= now; if (now - quietSince > 1300) { rec.stop(); return; } }
      if (now - t0 > 45000 || (!spoke && now - t0 > 30000)) { rec.stop(); return; }
      raf = requestAnimationFrame(loop);
    };
    rec.onstop = async () => {
      cancelAnimationFrame(raf); src.disconnect();
      if (!alive || state === 'paused') return;
      if (!spoke) { listen(); return; }
      set('think');
      const blob = new Blob(chunks, { type: rec?.mimeType || type || 'audio/webm' });
      const r = await fetch(`/api/stt?lang=${encodeURIComponent(lang)}`, { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob }).catch(() => null);
      const said = ((r?.ok ? await r.json().catch(() => null) : null)?.text || '').trim();
      if (!said) { line('vax', t.none); listen(); return; }
      line('me', said);
      const reply = await ask(said + (await frame()));
      if (!alive) return;
      if (!reply) { listen(); return; }
      line('vax', reply.slice(0, 400));
      set('talk');
      const v = vsel.value, rate = Number(rsel.value) || 1.03;
      const ok = speak(reply, lang, () => { if (alive && state === 'talk') listen(); }, { voice: v, rate });
      if (!ok) listen();
    };
    rec.start(250); loop();
  }

  orb.onclick = () => {
    if (state === 'talk') { stopSpeak(); listen(); return; }
    if (state === 'paused') { listen(); return; }
    if (state === 'listen' || state === 'hear') { set('paused'); rec?.state === 'recording' && rec.stop(); }
  };
  camb.onclick = async () => {
    if (cam) { cam.getTracks().forEach((x) => x.stop()); cam = null; video.hidden = true; camb.textContent = '📷 ' + t.cam; return; }
    try { cam = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } } }); video.srcObject = cam; video.hidden = false; await video.play(); camb.textContent = '📷 ' + t.camOff; }
    catch { st.textContent = t.camErr; }
  };
  const close = () => {
    alive = false; stopSpeak(); try { rec?.state === 'recording' && rec.stop(); } catch { /* */ }
    stream?.getTracks().forEach((x) => x.stop()); cam?.getTracks().forEach((x) => x.stop()); ac?.close().catch(() => {});
    if (d.open) d.close(); d.remove();
  };
  $('.vm-x').onclick = close; $('.vm-end').onclick = close; d.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  listen();
}
