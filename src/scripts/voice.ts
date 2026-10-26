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
  // Phones always record; computers try live recognition first and fall back to recording if it fails.
  let useRecorder = !SR || isTouch();

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
    mr.onstop = async () => {
      clearTimeout(timer); clearInterval(tick);
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
