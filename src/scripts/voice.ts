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

  button.addEventListener('click', async () => {
    if (stop) { stop(); return; }
    const base = field.value;
    if (SR) {
      const rec = new SR();
      rec.lang = LOCALE[lang()] || navigator.language || 'en-US';
      rec.interimResults = true;
      rec.continuous = true;
      let done = '';
      rec.onresult = (e: any) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          if (e.results[i].isFinal) done += e.results[i][0].transcript + ' ';
          else interim += e.results[i][0].transcript;
        }
        put(base, done + interim);
      };
      rec.onend = () => { stop = null; setOn(false); field.focus(); };
      rec.onerror = (e: any) => { if (e.error === 'not-allowed' || e.error === 'service-not-allowed') button.hidden = !canRecord; };
      stop = () => rec.stop();
      setOn(true);
      try { rec.start(); } catch { stop = null; setOn(false); }
      return;
    }
    // Fallback: record, then transcribe on the server.
    let stream: MediaStream;
    try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch { return; }
    const chunks: Blob[] = [];
    const mr = new MediaRecorder(stream);
    mr.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
    const timer = setTimeout(() => mr.state !== 'inactive' && mr.stop(), MAX_MS);
    mr.onstop = async () => {
      clearTimeout(timer);
      stream.getTracks().forEach((t) => t.stop());
      stop = null;
      button.classList.add('busy');
      try {
        const r = await fetch(`/api/stt?lang=${encodeURIComponent(lang())}`, { method: 'POST', body: new Blob(chunks, { type: mr.mimeType || 'audio/webm' }) });
        const d = r.ok ? await r.json() : null;
        if (d?.text) put(base, d.text);
      } catch {}
      button.classList.remove('busy');
      setOn(false);
      field.focus();
    };
    stop = () => mr.state !== 'inactive' && mr.stop();
    setOn(true);
    mr.start();
  });
}

/** Mic icon (inline SVG) for the button. */
export const MIC_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M12 14a3 3 0 0 0 3-3V5a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2Z"/></svg>';
