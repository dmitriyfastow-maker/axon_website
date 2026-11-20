// «Привет, VAXO» without a click (20.11, Dmitry: «like Jarvis»). Switched on once by the person (the choice is remembered
// in this browser). While the tab is open, short phrases are caught by a voice detector; each one is turned into text on
// our server (Whisper) and, if it contains the name VAXO, voice mode opens and the rest of the phrase is the command.
// Phrases without the name are dropped at once. The browser shows its own «microphone on» sign all the time.
const NAME = /(в[ао]кс[оауы]?|вакс|vaxo|vacso|vaxa|vax\b|ваксу|ваксы)/i;
const FAKE = /субтитр|продолжение следует|спасибо за просмотр|thanks for watching|amara\.org/i;

export type Wake = { stop: () => void; pause: (on: boolean) => void };

export async function startWake(lang: () => string, onWake: (rest: string) => void, onState?: (s: 'on' | 'off' | 'error') => void): Promise<Wake | null> {
  let stream: MediaStream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } }); }
  catch { onState?.('error'); return null; }
  const ac = new AudioContext(); if (ac.state === 'suspended') await ac.resume().catch(() => {});
  // Chrome keeps sound processing asleep until the person touches the page (after a reload, say): wake it on the first touch.
  const kick = () => { if (ac.state === 'suspended') ac.resume().catch(() => {}); };
  ['pointerdown', 'keydown', 'touchstart'].forEach((e) => document.addEventListener(e, kick, { passive: true }));
  const dbg = { state: () => ac.state, heard: [] as string[], peaks: 0 };
  (window as any).__vxWake = dbg;
  const an = ac.createAnalyser(); an.fftSize = 1024; ac.createMediaStreamSource(stream).connect(an);
  const buf = new Uint8Array(an.fftSize);
  const type = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find((x) => { try { return MediaRecorder.isTypeSupported(x); } catch { return false; } }) || '';
  let paused = false, alive = true, noise = 2, rec: MediaRecorder | null = null, chunks: Blob[] = [], voiced = 0, quiet = 0, started = 0, busy = false;
  onState?.('on');
  const begin = () => {
    chunks = []; voiced = 0; quiet = 0; started = Date.now();
    rec = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = async () => {
      const blob = new Blob(chunks, { type: (rec?.mimeType || type || 'audio/webm').split(';')[0] }); rec = null;
      if (voiced < 450 || busy || paused || !alive) return;
      busy = true;
      const r = await fetch(`/api/stt?lang=${encodeURIComponent(lang())}`, { method: 'POST', headers: { 'Content-Type': blob.type }, body: blob }).catch(() => null);
      const text = String((r?.ok ? await r.json().catch(() => null) : null)?.text || '').trim();
      busy = false;
      dbg.heard.push(text.slice(0, 80)); if (dbg.heard.length > 10) dbg.heard.shift();
      if (!text || FAKE.test(text)) return;
      // the name, or a greeting followed by a word that sounds like it (Whisper hears «факта», «вакса», «ваксу»…)
      const m = text.match(NAME) || text.match(/(?:привет|приветик|эй|хей|слушай|окей|hey|hi|hello|ok)[\s,!.]+([вфбbvfw][аоaeo][кгхkgx][а-яa-z]{0,4})\b/i);
      if (!m || paused || !alive) return;
      const rest = text.slice((m.index || 0) + m[0].length).replace(/^[\s,.!?—-]+/, '').trim();
      onWake(rest.replace(/[\p{P}\s]+$/u, '').length >= 3 ? rest : '');
    };
    rec.start(250);
  };
  const iv = setInterval(() => {
    if (!alive) return;
    an.getByteTimeDomainData(buf); let x = 0; for (const v of buf) x += (v - 128) ** 2; const rms = Math.sqrt(x / buf.length);
    if (paused) { if (rec?.state === 'recording') rec.stop(); return; }
    const thr = Math.max(3, noise * 2.6 + 1.6);
    if (!rec) {
      if (rms > thr) begin(); else noise = noise * 0.97 + rms * 0.03; // learn the room's quiet level
      return;
    }
    const now = Date.now();
    if (rms > thr) { voiced += 80; quiet = 0; dbg.peaks++; } else { quiet ||= now; if (now - quiet > 1100 && rec.state === 'recording') rec.stop(); }
    if (now - started > 8000 && rec.state === 'recording') rec.stop(); // «Привет, VAXO, …» is short; long talk is not a command
  }, 80);
  return {
    stop: () => { alive = false; clearInterval(iv); try { rec?.stop(); } catch { /* */ } stream.getTracks().forEach((t) => t.stop()); ac.close().catch(() => {}); onState?.('off'); },
    pause: (on: boolean) => { paused = on; },
  };
}
