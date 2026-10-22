// Voice input for every chat: a mic button next to the text field. The browser recognises speech itself where it
// can (Chrome, Safari, Edge); elsewhere we record a short clip and /api/stt turns it into text (Workers AI Whisper).
// The text lands in the field — the person checks it and sends it.

type Field = HTMLInputElement | HTMLTextAreaElement;
const LOCALE: Record<string, string> = { en: 'en-US', ru: 'ru-RU', ua: 'uk-UA', uk: 'uk-UA' };
const MAX_MS = 60000;

export function attachMic(button: HTMLButtonElement, field: Field, lang: () => string): void {
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const canRecord = !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
  if (!SR && !canRecord) { button.hidden = true; return; }
  let stop: (() => void) | null = null;
  const setOn = (on: boolean) => { button.classList.toggle('rec', on); button.setAttribute('aria-pressed', String(on)); };
  const put = (base: string, said: string) => {
    field.value = (base ? base.replace(/\s*$/, ' ') : '') + said.trim();
    field.dispatchEvent(new Event('input', { bubbles: true }));
  };

  const HINT: Record<string, string> = {
    en: 'Allow the microphone: click the lock icon next to the address and turn it on',
    ru: 'Разрешите микрофон: значок замка слева от адреса сайта → Микрофон → Разрешить',
    ua: 'Дозвольте мікрофон: значок замка ліворуч від адреси сайту → Мікрофон → Дозволити',
  };
  const hint = () => { field.placeholder = HINT[lang()] || HINT.en; field.focus(); };
  // Browser recognition first (live text); if it fails (blocked, offline, Google service down) we record and use Whisper.
  let useRecorder = !SR;

  async function record() {
    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { hint(); return; }
    const base = field.value;
    const chunks: Blob[] = [];
    const mr = new MediaRecorder(stream);
    mr.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const timer = setTimeout(() => mr.state !== 'inactive' && mr.stop(), MAX_MS);
    mr.onstop = async () => {
      clearTimeout(timer);
      stream.getTracks().forEach((t) => t.stop());
      stop = null;
      setOn(false);
      button.classList.add('busy');
      try {
        const r = await fetch(`/api/stt?lang=${encodeURIComponent(lang())}`, { method: 'POST', body: new Blob(chunks, { type: mr.mimeType || 'audio/webm' }) });
        const d = r.ok ? await r.json() : null;
        if (d?.text) put(base, d.text);
      } catch {}
      button.classList.remove('busy');
      field.focus();
    };
    stop = () => mr.state !== 'inactive' && mr.stop();
    setOn(true);
    mr.start();
  }

  button.addEventListener('click', async () => {
    if (stop) { stop(); return; }
    if (useRecorder) { if (canRecord) record(); return; }
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
        if (failed === 'not-allowed' && !canRecord) { hint(); return; }
        // Switch to recording for good and start right away, so one click is enough.
        useRecorder = true;
        if (canRecord) record(); else hint();
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
