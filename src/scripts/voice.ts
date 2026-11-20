// Voice input for every chat: a mic button next to the text field. On a computer the browser recognises speech itself
// where it can (Chrome, Edge, desktop Safari) and the words appear live. On phones (iOS Safari, Android Chrome) live
// recognition is unreliable — it stops silently or repeats words — so there we always record a clip (MediaRecorder,
// audio/mp4 on iPhone, webm on Android) and /api/stt turns it into text (Workers AI Whisper).
// The text lands in the field — the person checks it and sends it. With keepAudio the clip itself is attached too.

import { isTouch } from './compose';

type Field = HTMLInputElement | HTMLTextAreaElement;
const LOCALE: Record<string, string> = { en: 'en-US', ru: 'ru-RU', ua: 'uk-UA', uk: 'uk-UA' };
const MAX_MS = 120000;
const T: Record<string, { allow: string; rec: string; wait: string; none: string; fail: string; https: string }> = {
  en: { allow: 'Allow the microphone: tap aA / the lock icon next to the address → Microphone → Allow, then tap 🎤 again', rec: '● Recording {s} — tap ■ to stop', wait: 'Turning your voice into text…', none: "Didn't catch that — tap 🎤 and speak a bit closer", fail: 'Voice did not go through — try again or type', https: 'Voice needs the secure site: open https://vaxogroup.com' },
  ru: { allow: 'Разрешите микрофон: значок aA / замок у адреса сайта → Микрофон → Разрешить, затем снова 🎤', rec: '● Запись {s} — нажмите ■, чтобы закончить', wait: 'Превращаю голос в текст…', none: 'Не расслышал — нажмите 🎤 и скажите чуть ближе к телефону', fail: 'Голос не дошёл — попробуйте ещё раз или напишите', https: 'Голос работает только на защищённом сайте: откройте https://vaxogroup.com' },
  ua: { allow: 'Дозвольте мікрофон: значок aA / замок біля адреси сайту → Мікрофон → Дозволити, потім знову 🎤', rec: '● Запис {s} — натисніть ■, щоб закінчити', wait: 'Перетворюю голос на текст…', none: 'Не розчув — натисніть 🎤 і скажіть трохи ближче', fail: 'Голос не дійшов — спробуйте ще раз або напишіть', https: 'Голос працює лише на захищеному сайті: відкрийте https://vaxogroup.com' },
};
const STOP_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>';

function pickType(): string {
  for (const t of ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm', 'audio/ogg;codecs=opus']) {
    try { if (MediaRecorder.isTypeSupported(t)) return t; } catch {}
  }
  return '';
}

export function attachMic(button: HTMLButtonElement, field: Field, lang: () => string, opts: { keepAudio?: boolean } = {}): void {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const canRecord = !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
  if (!SR && !canRecord && window.isSecureContext) { button.hidden = true; return; }
  const t = () => T[lang()] || T.en;
  const ph = field.placeholder;
  const icon = button.innerHTML;
  let stop: (() => void) | null = null;
  let tick: ReturnType<typeof setInterval> | undefined;
  const setOn = (on: boolean) => {
    button.classList.toggle('rec', on);
    button.setAttribute('aria-pressed', String(on));
    button.innerHTML = on ? STOP_SVG : icon || MIC_SVG;
  };
  const note = (s: string) => { field.placeholder = s; };
  const put = (base: string, said: string) => {
    field.value = (base ? base.replace(/\s*$/, ' ') : '') + said.trim();
    field.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const hint = (s = t().allow) => { note(s); field.focus(); setTimeout(() => note(ph), 9000); };
  // Record a clip and let /api/stt (Whisper) turn it into text everywhere it is possible: live browser recognition on
  // computers failed silently for owners (30.10: "network" errors, blocked Google speech service), recording is reliable.
  // Live recognition stays only as a fallback where recording is impossible.
  let useRecorder = canRecord || !SR || isTouch();

  async function record() {
    if (!window.isSecureContext) { hint(t().https); return; }
    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }); } catch { hint(); return; }
    const base = field.value;
    const chunks: Blob[] = [];
    const type = pickType();
    let mr: MediaRecorder;
    try { mr = type ? new MediaRecorder(stream, { mimeType: type }) : new MediaRecorder(stream); } catch { mr = new MediaRecorder(stream); }
    const started = Date.now();
    mr.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const timer = setTimeout(() => mr.state !== 'inactive' && mr.stop(), MAX_MS);
    const show = () => { const s = Math.round((Date.now() - started) / 1000); note(t().rec.replace('{s}', `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`)); };
    show(); tick = setInterval(show, 500);
    // 20.11: words appear while you speak (like ChatGPT): every ~2 s the clip so far goes to /api/stt and the new words
    // light up in the brand colour above the field. The final text lands in the field when you stop.
    const box = document.createElement('div'); box.className = 'dict-live'; box.setAttribute('aria-live', 'polite');
    (field.closest('form') || field.parentElement)?.before(box);
    if (!document.getElementById('dict-css')) { const st = document.createElement('style'); st.id = 'dict-css'; st.textContent = '.dict-live{max-width:760px;margin:0 auto 6px;padding:10px 14px;border-radius:14px;font-size:16px;line-height:1.5;background:color-mix(in srgb,#e8a33d 7%,transparent);border:1px solid color-mix(in srgb,#e8a33d 30%,transparent);min-height:24px}.dict-live:empty::before{content:"🎙 …";opacity:.6}.dict-live span{display:inline-block;margin-right:.28em;animation:dictin .5s ease-out both}.dict-live span.new{color:#e8a33d;text-shadow:0 0 12px rgba(232,163,61,.55)}@keyframes dictin{from{opacity:0;transform:translateY(4px);filter:blur(3px)}}'; document.head.append(st); }
    let shown: string[] = [], busy = false;
    const paintLive = (text: string) => {
      const words = text.split(/\s+/).filter(Boolean);
      const keep = shown.length && words.slice(0, shown.length).join(' ') === shown.join(' ') ? shown.length : 0;
      if (!keep) box.replaceChildren();
      box.querySelectorAll('span.new').forEach((x) => x.classList.remove('new'));
      for (const w of words.slice(keep)) { const sp = document.createElement('span'); sp.className = 'new'; sp.textContent = w; box.append(sp); }
      shown = words;
    };
    const liveTick = setInterval(async () => {
      if (busy || !chunks.length || mr.state === 'inactive') return;
      busy = true;
      const blob = new Blob(chunks, { type: (mr.mimeType || type || 'audio/webm').split(';')[0] });
      const r = await fetch(`/api/stt?lang=${encodeURIComponent(lang())}`, { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob }).catch(() => null);
      const d = r?.ok ? await r.json().catch(() => null) : null;
      if (d?.text && mr.state !== 'inactive') paintLive(String(d.text).trim());
      busy = false;
    }, 2200);
    mr.onstop = async () => {
      clearTimeout(timer); clearInterval(tick); clearInterval(liveTick); setTimeout(() => box.remove(), 600);
      stream.getTracks().forEach((x) => x.stop());
      stop = null;
      setOn(false);
      const mime = (mr.mimeType || type || 'audio/webm').split(';')[0];
      const blob = new Blob(chunks, { type: mime });
      if (!blob.size || Date.now() - started < 600) { note(ph); return; }
      button.classList.add('busy'); note(t().wait);
      const ext = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm';
      try {
        const [r, f] = await Promise.all([
          fetch(`/api/stt?lang=${encodeURIComponent(lang())}`, { method: 'POST', headers: { 'Content-Type': mime }, body: blob }),
          opts.keepAudio ? fetch(`/api/file?name=voice-${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.${ext}`, { method: 'POST', headers: { 'Content-Type': mime }, body: blob }).catch(() => null) : null,
        ]);
        const d = r.ok ? await r.json() : null;
        const file = f?.ok ? await f.json().catch(() => null) : null;
        const said = (d?.text || '').trim();
        put(base, [file?.url ? `📎 ${file.name} ${file.url}` : '', said].filter(Boolean).join('\n'));
        note(ph);
        if (!said && !file?.url) hint(r.ok ? t().none : t().fail);
      } catch { hint(t().fail); }
      button.classList.remove('busy');
      field.focus();
    };
    stop = () => mr.state !== 'inactive' && mr.stop();
    setOn(true);
    mr.start(1000);
  }

  button.addEventListener('click', async () => {
    if (button.classList.contains('busy')) return;
    if (stop) { stop(); return; }
    if (useRecorder) { if (canRecord) record(); else hint(window.isSecureContext ? t().fail : t().https); return; }
    const base = field.value;
    const rec = new SR();
    rec.lang = LOCALE[lang()] || navigator.language || 'en-US';
    rec.interimResults = true;
    rec.continuous = true;
    let done = '', heard = false, failed = '';
    rec.onresult = (e: any) => {
      heard = true;
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) done += e.results[i][0].transcript + ' ';
        else interim += e.results[i][0].transcript;
      }
      put(base, done + interim);
    };
    rec.onerror = (e: any) => { failed = e.error || 'error'; };
    rec.onend = () => {
      stop = null; setOn(false);
      if (!heard && failed && failed !== 'no-speech' && failed !== 'aborted') {
        // Live recognition is blocked or down: switch to recording for good (the next tap records).
        useRecorder = true;
        hint(failed === 'not-allowed' ? t().allow : t().none);
        return;
      }
      field.focus();
    };
    stop = () => rec.stop();
    setOn(true);
    try { rec.start(); } catch { stop = null; setOn(false); useRecorder = true; if (canRecord) record(); }
  });
}

/** Mic icon (inline SVG) for the button. */
export const MIC_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z"/></svg>';

// ---------- Answers read aloud (Decision 53: "dictate → hear the answer") ----------
// The browser's own speech (speechSynthesis): free, works offline, no audio sent anywhere. Chrome cuts one long
// utterance after ~15 s, so the text is spoken sentence by sentence.
export const canSpeak = (): boolean => typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
let speakRun = 0;
let speakEnd: (() => void) | null = null;

/** Text for the ear: no markers, links, code, table bars or emoji. */
export function speakable(s: string): string {
  return s
    .replace(/\[\[[^\]]*\]\]/g, ' ')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/^📎.*$/gmu, ' ')
    .replace(/[*_`#>|~]+/g, ' ')
    .replace(/^\s*[-•]\s+/gm, '')
    .replace(/\p{Extended_Pictographic}|️/gu, '')
    .replace(/\s*\n+\s*/g, '. ')
    .replace(/\.(\s*\.)+/g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function pickVoice(loc: string): SpeechSynthesisVoice | undefined {
  const vs = speechSynthesis.getVoices();
  const two = loc.slice(0, 2);
  const mine = vs.filter((v) => v.lang.replace('_', '-').toLowerCase().startsWith(two));
  return mine.find((v) => /natural|neural|premium|enhanced|google/i.test(v.name)) || mine.find((v) => v.localService) || mine[0];
}

export function stopSpeak(): void {
  speakRun++;
  try { speechSynthesis.cancel(); } catch {}
  const f = speakEnd; speakEnd = null; f?.();
}

/** Speaks the text in the page language; onEnd runs when it finishes or is stopped. */
export function speak(text: string, lang: string, onEnd?: () => void, opt: { voice?: string; rate?: number } = {}): boolean {
  if (!canSpeak()) return false;
  stopSpeak();
  const said = speakable(text);
  if (!said) return false;
  const run = ++speakRun;
  speakEnd = onEnd || null;
  const loc = LOCALE[lang] || (/[іїєґ]/i.test(said) ? 'uk-UA' : /[а-яё]/i.test(said) ? 'ru-RU' : 'en-US');
  const parts = said.match(/[^.!?…]+[.!?…]*\s*/g)?.reduce<string[]>((a, p) => { const l = a.length - 1; if (l >= 0 && (a[l] + p).length < 220) a[l] += p; else a.push(p); return a; }, []) || [said];
  const go = (i: number) => {
    if (run !== speakRun) return;
    if (i >= parts.length) { const f = speakEnd; speakEnd = null; f?.(); return; }
    const u = new SpeechSynthesisUtterance(parts[i].trim());
    u.lang = loc;
    // The voice the person picked in voice mode (saved in the browser), else the best one for the language.
    let want = opt.voice; if (want === undefined) { try { want = localStorage.getItem('vx_voice') || ''; } catch { want = ''; } }
    const v = (want && speechSynthesis.getVoices().find((x) => x.name === want)) || pickVoice(loc); if (v) u.voice = v;
    u.rate = opt.rate || (() => { try { return Number(localStorage.getItem('vx_rate')) || 1.03; } catch { return 1.03; } })();
    u.onend = () => go(i + 1);
    u.onerror = () => go(i + 1);
    speechSynthesis.speak(u);
  };
  // Voices load late on the first call in Chrome.
  if (!speechSynthesis.getVoices().length) { let started = false; const s = () => { if (!started) { started = true; go(0); } }; speechSynthesis.addEventListener('voiceschanged', s, { once: true }); setTimeout(s, 400); } else go(0);
  return true;
}
