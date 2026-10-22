// Files in every chat: a paperclip button, drag-and-drop and paste. Each file goes to /api/file and its link lands in
// the text field ("📎 name https://…/f/…"), so the person sends it with their message and everyone sees the same link.

type Field = HTMLInputElement | HTMLTextAreaElement;
const MAX = 25 * 1024 * 1024;
const T: Record<string, { up: string; big: string; fail: string; drop: string }> = {
  en: { up: 'Uploading', big: 'is over 25 MB — send a Google Drive or WeTransfer link instead', fail: 'did not upload, try again', drop: 'Drop files here' },
  ru: { up: 'Загружаю', big: 'больше 25 МБ — пришлите ссылку на Google Drive или WeTransfer', fail: 'не загрузился, попробуйте ещё раз', drop: 'Отпустите файлы здесь' },
  ua: { up: 'Завантажую', big: 'більше 25 МБ — надішліть посилання на Google Drive або WeTransfer', fail: 'не завантажився, спробуйте ще раз', drop: 'Відпустіть файли тут' },
};

export const CLIP_SVG = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="m21 11-8.6 8.6a5.5 5.5 0 0 1-7.8-7.8l8.6-8.6a3.7 3.7 0 0 1 5.2 5.2l-8.6 8.6a1.8 1.8 0 0 1-2.6-2.6l7.9-7.9"/></svg>';

/** Wire a paperclip button + drop/paste on `zone` to put uploaded file links into `field`. */
export function attachFiles(button: HTMLButtonElement, field: Field, lang: () => string, zone: HTMLElement = field.parentElement || field): void {
  const t = () => T[lang()] || T.en;
  const input = document.createElement('input');
  input.type = 'file';
  input.multiple = true;
  input.hidden = true;
  button.after(input);
  button.innerHTML ||= CLIP_SVG;
  const note = (s: string) => { field.placeholder = s; };
  const ph = field.placeholder;
  async function upload(files: FileList | File[]) {
    const list = [...files];
    if (!list.length) return;
    button.classList.add('busy');
    for (const [i, f] of list.entries()) {
      if (f.size > MAX) { alert(`${f.name} ${t().big}`); continue; }
      note(`${t().up} ${i + 1}/${list.length}: ${f.name}…`);
      try {
        const r = await fetch(`/api/file?name=${encodeURIComponent(f.name || 'photo.jpg')}`, { method: 'POST', headers: { 'Content-Type': f.type || 'application/octet-stream' }, body: f });
        const d = r.ok ? await r.json() : null;
        if (!d?.url) throw new Error();
        field.value = (field.value ? field.value.replace(/\s*$/, field instanceof HTMLTextAreaElement ? '\n' : ' ') : '') + `📎 ${d.name} ${d.url}`;
        field.dispatchEvent(new Event('input', { bubbles: true }));
      } catch { alert(`${f.name} ${t().fail}`); }
    }
    note(ph);
    button.classList.remove('busy');
    field.focus();
  }
  button.addEventListener('click', () => input.click());
  input.addEventListener('change', () => { if (input.files) upload(input.files); input.value = ''; });
  field.addEventListener('paste', (e) => {
    const files = (e as ClipboardEvent).clipboardData?.files;
    if (files?.length) { e.preventDefault(); upload(files); }
  });
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drop'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drop'));
  zone.addEventListener('drop', (e) => {
    e.preventDefault(); zone.classList.remove('drop');
    if (e.dataTransfer?.files.length) upload(e.dataTransfer.files);
  });
}

const IMG = /\.(png|jpe?g|gif|webp|avif)$/i;

/** Turn plain text into safe HTML: links become clickable, our file links become a chip or an image preview. */
export function linkify(text: string): string {
  const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  return esc(text)
    .replace(/📎 (\S+) (https?:\/\/[^\s<]+\/f\/[a-f0-9]{20}\/[^\s<]+)/g, (_m, name, u) =>
      IMG.test(decodeURIComponent(u))
        ? `<a class="file img" href="${u}" target="_blank" rel="noopener"><img src="${u}" alt="${name}" loading="lazy"></a>`
        : `<a class="file" href="${u}" target="_blank" rel="noopener">📎 ${name}</a>`)
    .replace(/(^|[\s(])(https?:\/\/[^\s<]+|vaxogroup\.com\/[^\s<]*)/g, (_m, pre, u) => `${pre}<a href="${u.startsWith('http') ? u : 'https://' + u}" target="_blank" rel="noopener">${u}</a>`);
}
