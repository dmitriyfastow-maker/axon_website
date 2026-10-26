// The message field in every chat behaves like Telegram: it grows with the text (up to ~6 lines, then scrolls),
// Enter sends on a computer, Shift+Enter makes a new line; on a phone Enter is a new line and the ➤ button sends.

const MAX_PX = 160;

/** Touch-first device (phone/tablet keyboard): Enter must not send. */
export const isTouch = () => matchMedia('(pointer: coarse)').matches && !matchMedia('(pointer: fine)').matches;

export function composer(field: HTMLTextAreaElement, send: () => void): () => void {
  field.rows = 1;
  field.setAttribute('enterkeyhint', isTouch() ? 'enter' : 'send');
  const fit = () => {
    // Empty: one line (a long placeholder must not make the field taller).
    if (!field.value) { field.style.height = ''; field.style.overflowY = 'hidden'; return; }
    field.style.height = 'auto';
    field.style.height = Math.min(field.scrollHeight + 2, MAX_PX) + 'px';
    field.style.overflowY = field.scrollHeight > MAX_PX ? 'auto' : 'hidden';
  };
  field.addEventListener('input', fit);
  field.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.shiftKey || e.isComposing || isTouch()) return;
    e.preventDefault();
    send();
  });
  // Chats clear the field in their submit handler: shrink it back right after.
  field.form?.addEventListener('submit', () => requestAnimationFrame(fit));
  requestAnimationFrame(fit);
  return fit;
}

/** Same as composer, for code where a local variable is already called "composer". */
export const grow = composer;
