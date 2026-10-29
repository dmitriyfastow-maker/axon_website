import { isValidContact, LIMITS } from '../lib/validate';

function readRef(): string {
  try {
    return localStorage.getItem('vaxo_ref') ?? '';
  } catch {
    return '';
  }
}

type Mode = 'request' | 'question';
interface Copy { message: string; question: string; send: string; sendQ: string; sending: string }

export function initContactForm(): void {
  const form = document.querySelector<HTMLFormElement>('[data-lead-form]');
  const success = document.querySelector<HTMLElement>('[data-form-success]');
  if (!form || !success) return;
  // A friend link (?code=…) pre-fills the promo code.
  try { const c = localStorage.getItem('vaxo_code'); const p = form.querySelector<HTMLInputElement>('[name=promo]'); if (c && p && !p.value) p.value = c; } catch {}

  const copy = JSON.parse(form.dataset.copy!) as Copy;
  const $ = <T extends Element>(sel: string) => form.querySelector<T>(sel)!;
  const name = $<HTMLInputElement>('[name=name]');
  const contact = $<HTMLInputElement>('[name=contact]');
  const message = $<HTMLTextAreaElement>('[name=message]');
  const trap = $<HTMLInputElement>('[name=website]');
  const submit = $<HTMLButtonElement>('[type=submit]');
  const submitLabel = $<HTMLElement>('[data-submit-label]');
  const formError = $<HTMLElement>('[data-form-error]');
  const chips = [...form.querySelectorAll<HTMLButtonElement>('[data-interest-value]')];
  const modeButtons = [...form.querySelectorAll<HTMLButtonElement>('[data-mode]')];

  let mode: Mode = 'request';
  let interest = '';
  let startedAt = Date.now();
  let sending = false;

  const setError = (field: 'name' | 'contact', on: boolean) => {
    $<HTMLElement>(`[data-error=${field}]`).hidden = !on;
    (field === 'name' ? name : contact).setAttribute('aria-invalid', String(on));
  };
  const setInterest = (v: string) => {
    interest = v;
    chips.forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.interestValue === v)));
  };
  const setMode = (m: Mode) => {
    mode = m;
    modeButtons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
    $<HTMLElement>('[data-interest]').hidden = m !== 'request';
    $<HTMLElement>('[data-message-label]').textContent = m === 'request' ? copy.message : copy.question;
    submitLabel.textContent = m === 'request' ? copy.send : copy.sendQ;
    setError('name', false);
    setError('contact', false);
  };
  const showForm = () => {
    success.hidden = true;
    form.hidden = false;
    formError.hidden = true;
    startedAt = Date.now();
  };

  modeButtons.forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode as Mode)));
  chips.forEach((c) => c.addEventListener('click', () => setInterest(interest === c.dataset.interestValue ? '' : c.dataset.interestValue!)));
  name.addEventListener('input', () => setError('name', false));
  contact.addEventListener('input', () => setError('contact', false));

  document.querySelector('[data-form-again]')?.addEventListener('click', showForm);

  // Tier CTAs start the conversation with Vax (chat instead of the form): the tier goes into the chat box.
  document.querySelectorAll<HTMLElement>('[data-choose-tier]').forEach((btn) =>
    btn.addEventListener('click', (e) => {
      const box = document.querySelector<HTMLTextAreaElement>('#contact [data-pc-text]');
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!box) { showForm(); setMode('request'); setInterest(btn.dataset.chooseTier!); if (btn.dataset.chooseNote && !message.value.trim()) message.value = btn.dataset.chooseNote; document.getElementById('contact')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); return; }
      e.preventDefault();
      const lang = form.dataset.lang || 'en';
      const lead = lang === 'ru' ? 'Интересует' : lang === 'ua' ? 'Цікавить' : 'I am interested in';
      box.value = btn.dataset.chooseNote || `${lead}: ${btn.dataset.chooseTier}. `;
      box.closest('[data-pchat]')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
      setTimeout(() => box.focus(), 500);
    }),
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (sending) return;
    const badName = !name.value.trim();
    const badContact = !isValidContact(contact.value) || contact.value.trim().length > LIMITS.contact;
    setError('name', badName);
    setError('contact', badContact);
    if (badName || badContact) return;

    sending = true;
    submit.disabled = true;
    formError.hidden = true;
    const idle = submitLabel.textContent;
    submitLabel.textContent = copy.sending;
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Vx-Src': (window as unknown as { vxSrc?: () => string }).vxSrc?.() || '' },
        body: JSON.stringify({
          mode,
          name: name.value,
          contact: contact.value,
          interest: mode === 'request' ? interest : '',
          message: message.value,
          lang: form.dataset.lang,
          website: trap.value,
          startedAt,
          ref: readRef(),
          promo: (form.querySelector<HTMLInputElement>('[name=promo]')?.value || '').trim(),
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const out = (await res.json().catch(() => ({}))) as { room?: string };
      const box = document.querySelector<HTMLElement>('[data-room-box]');
      if (box && out.room) {
        box.querySelector<HTMLAnchorElement>('[data-room-link]')!.href = `/room/?t=${out.room}`;
        box.hidden = false;
      }
      form.reset();
      setInterest('');
      form.hidden = true;
      success.hidden = false;
    } catch {
      formError.hidden = false;
    } finally {
      sending = false;
      submit.disabled = false;
      submitLabel.textContent = idle;
    }
  });
}
