// Vax for Chrome, side panel. The person writes a task; Vax works on the active tab one step at a time.
// Every step: read the tab (text + numbered buttons and fields) → ask vaxogroup.com/api/ws/agent for ONE action →
// show it → do it. Anything that sends, pays, publishes, deletes or accepts waits for "Yes". Passwords, cards,
// codes and ID details are never typed (checked on the server and again here). Stop works at any moment.
const API = 'https://vaxogroup.com';
const L = (() => { const l = (navigator.language || 'en').toLowerCase(); return l.startsWith('uk') ? 'ua' : l.startsWith('ru') ? 'ru' : 'en'; })();
const TX = {
  en: { ph: 'What should Vax do on this page? For example: find a flight to Rome for 12 December and show me the cheapest', go: 'Start', stop: 'Stop', rules: 'Vax asks before anything important and never types passwords or card details. You can stop it at any moment.', signTxt: 'Sign in to Vaxo in this browser to use Vax here.', signBtn: 'Sign in', yes: 'Yes, do it', no: 'No', cont: 'Continue', allow: 'Allow Vax on this site', denied: 'Vax works only on sites you allow. Press Start again and allow this site.', noPage: 'Open a normal website tab (not a Chrome settings or store page) and try again.', stopped: 'Stopped.', fail: 'Something went wrong. Try again.', limit: 'Today\'s step limit is reached. It resets tomorrow.', many: 'I have done many steps. Press Continue if I should keep going.', answer: 'Write your answer below and press Start.' },
  ru: { ph: 'Что сделать на этой странице? Например: найди билет в Рим на 12 декабря и покажи самый дешёвый', go: 'Начать', stop: 'Стоп', rules: 'Vax спрашивает перед всем важным и никогда не вводит пароли и данные карт. Остановить можно в любой момент.', signTxt: 'Войдите в Vaxo в этом браузере, чтобы Vax работал здесь.', signBtn: 'Войти', yes: 'Да, сделать', no: 'Нет', cont: 'Продолжить', allow: 'Разрешить Vax на этом сайте', denied: 'Vax работает только на сайтах, которые вы разрешили. Нажмите «Начать» и разрешите этот сайт.', noPage: 'Откройте обычный сайт (не настройки Chrome и не магазин расширений) и попробуйте снова.', stopped: 'Остановлено.', fail: 'Что-то пошло не так. Попробуйте ещё раз.', limit: 'Лимит шагов на сегодня исчерпан. Обновится завтра.', many: 'Я сделал много шагов. Нажмите «Продолжить», если нужно дальше.', answer: 'Напишите ответ ниже и нажмите «Начать».' },
  ua: { ph: 'Що зробити на цій сторінці? Наприклад: знайди квиток до Рима на 12 грудня й покажи найдешевший', go: 'Почати', stop: 'Стоп', rules: 'Vax питає перед усім важливим і ніколи не вводить паролі та дані карток. Зупинити можна будь-коли.', signTxt: 'Увійдіть у Vaxo в цьому браузері, щоб Vax працював тут.', signBtn: 'Увійти', yes: 'Так, зробити', no: 'Ні', cont: 'Продовжити', allow: 'Дозволити Vax на цьому сайті', denied: 'Vax працює лише на сайтах, які ви дозволили. Натисніть «Почати» й дозвольте цей сайт.', noPage: 'Відкрийте звичайний сайт (не налаштування Chrome і не магазин розширень) і спробуйте знову.', stopped: 'Зупинено.', fail: 'Щось пішло не так. Спробуйте ще раз.', limit: 'Ліміт кроків на сьогодні вичерпано. Оновиться завтра.', many: 'Я зробив багато кроків. Натисніть «Продовжити», якщо треба далі.', answer: 'Напишіть відповідь нижче й натисніть «Почати».' },
}[L];
const $ = (s) => document.querySelector(s);
document.querySelectorAll('[data-t]').forEach((e) => (e.textContent = TX[e.dataset.t]));
$('#goal').placeholder = TX.ph;

const log = $('#log');
function say(text, cls = '') { const d = document.createElement('div'); d.className = 'm ' + cls; d.textContent = text; log.append(d); log.scrollTop = log.scrollHeight; return d; }
function buttons(d, list) { const r = document.createElement('div'); r.className = 'row'; for (const [t, cls, fn] of list) { const b = document.createElement('button'); b.className = cls; b.textContent = t; b.onclick = () => { r.remove(); fn(); }; r.append(b); } d.append(r); log.scrollTop = log.scrollHeight; }

let run = null; // { goal, steps, tab, n, stopped }

async function signedIn() {
  try { const r = await fetch(API + '/api/ws', { credentials: 'include' }); const d = await r.json(); return !!d.signedIn; } catch { return false; }
}
(async () => { if (!(await signedIn())) { $('#sign').hidden = false; $('#form').hidden = true; } })();
$('#signBtn').onclick = () => chrome.tabs.create({ url: API + '/app/' });
window.addEventListener('focus', async () => { if (!$('#sign').hidden && (await signedIn())) { $('#sign').hidden = true; $('#form').hidden = false; } });

async function activeTab() { const [t] = await chrome.tabs.query({ active: true, currentWindow: true }); return t; }
const originOf = (u) => { try { const x = new URL(u); return /^https?:$/.test(x.protocol) ? x.origin + '/*' : null; } catch { return null; } };

// Runs inside the page: numbers the visible buttons and fields, returns the text with long numbers hidden.
function snap() {
  const SECRET = /pass(word)?|парол|cc-|card|карт|cvv|cvc|iban|pin\b|otp|one.?time|sms|смс|паспорт|passport|ssn|token|secret/i;
  const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none'; };
  document.querySelectorAll('[data-vax-i]').forEach((e) => e.removeAttribute('data-vax-i'));
  const q = 'a[href],button,input:not([type=hidden]),textarea,select,[role=button],[role=link],[role=tab],[role=menuitem],[role=checkbox],[role=option],[contenteditable=""],[contenteditable=true],summary';
  const els = []; let i = 0;
  for (const e of document.querySelectorAll(q)) {
    if (els.length >= 150) break;
    if (!vis(e)) continue;
    i++; e.setAttribute('data-vax-i', String(i));
    const field = /^(INPUT|TEXTAREA|SELECT)$/.test(e.tagName);
    let label = e.getAttribute('aria-label') || (e.labels && e.labels[0] && e.labels[0].innerText) || e.getAttribute('placeholder') || (!field && e.innerText) || e.getAttribute('title') || e.getAttribute('name') || (e.querySelector && e.querySelector('img[alt]') && e.querySelector('img[alt]').alt) || '';
    if (e.tagName === 'SELECT' && e.selectedOptions[0]) label += ' = ' + e.selectedOptions[0].text;
    if (e.type === 'checkbox' || e.type === 'radio') label += e.checked ? ' [checked]' : ' [unchecked]';
    const secret = e.type === 'password' || /cc-|one-time-code/.test(e.autocomplete || '') || (field && SECRET.test([e.name, e.id, e.autocomplete, label].join(' ')));
    els.push({ i, tag: e.tagName.toLowerCase(), type: e.type || e.getAttribute('role') || undefined, label: label.replace(/\s+/g, ' ').trim().slice(0, 90), secret });
  }
  const text = (document.body ? document.body.innerText : '').replace(/\b(?:\d[ -]?){12,19}\b/g, '[number]').slice(0, 6000);
  return { url: location.href, title: document.title, text, els };
}
// Runs inside the page: one action on a numbered element. Refuses secret fields whatever it is told.
function act(i, t, v) {
  if (t === 'scroll') { window.scrollBy(0, window.innerHeight * 0.8); return 'scrolled'; }
  const e = document.querySelector('[data-vax-i="' + i + '"]');
  if (!e) return 'not found';
  e.scrollIntoView({ block: 'center' });
  if (t === 'click') { if (e.focus) e.focus(); e.click(); return 'clicked'; }
  if (e.type === 'password' || /cc-|one-time-code/.test(e.autocomplete || '')) return 'refused: secret field';
  if (t === 'type') {
    if (e.isContentEditable) { e.focus(); document.execCommand('selectAll'); document.execCommand('insertText', false, v); return 'typed'; }
    const proto = e.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    e.focus(); Object.getOwnPropertyDescriptor(proto, 'value').set.call(e, v);
    e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true }));
    return 'typed';
  }
  if (t === 'select') {
    const o = [...(e.options || [])].find((o) => o.value === v || o.text.trim().toLowerCase().includes(String(v).toLowerCase()));
    if (!o) return 'no such option';
    e.value = o.value; e.dispatchEvent(new Event('change', { bubbles: true })); return 'selected ' + o.text;
  }
  return 'unknown action';
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function settled(tabId) { for (let k = 0; k < 40; k++) { const t = await chrome.tabs.get(tabId).catch(() => null); if (!t || t.status === 'complete') break; await sleep(250); } await sleep(700); }
function setBusy(on) { $('#go').disabled = on; $('#stop').hidden = !on; }

async function loop() {
  setBusy(true);
  try {
    while (run && !run.stopped) {
      if (run.n >= 25) { const d = say(TX.many, 'ask'); buttons(d, [[TX.cont, 'pri', () => { run.n = 0; loop(); }]]); break; }
      const tab = await chrome.tabs.get(run.tab).catch(() => null);
      if (!tab || !originOf(tab.url)) { say(TX.noPage, 'bad'); run = null; break; }
      if (!(await chrome.permissions.contains({ origins: [originOf(tab.url)] }))) {
        const d = say(TX.denied, 'ask'); const o = originOf(tab.url);
        buttons(d, [[TX.allow, 'pri', async () => { if (await chrome.permissions.request({ origins: [o] })) loop(); }]]);
        break;
      }
      const [{ result: page }] = await chrome.scripting.executeScript({ target: { tabId: run.tab }, func: snap });
      $('#site').textContent = new URL(page.url).hostname;
      const r = await fetch(API + '/api/ws/agent', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ goal: run.goal, steps: run.steps, lang: L, ...page }) });
      const d = await r.json().catch(() => ({}));
      if (!run || run.stopped) break;
      if (r.status === 401) { $('#sign').hidden = false; $('#form').hidden = true; break; }
      if (r.status === 429) { say(TX.limit, 'bad'); run = null; break; }
      if (!d.ok) { say(TX.fail, 'bad'); run = null; break; }
      const a = d.act; run.n++;
      if (a.t === 'done') { say(d.say || '✓'); run = null; break; }
      if (a.t === 'ask') { const m = say(d.say || TX.answer, 'ask'); run.waiting = true; buttons(m, [[TX.cont, 'sec', () => { run.waiting = false; loop(); }]]); break; }
      if (d.confirm) {
        const m = say((d.say ? d.say + '\n' : '') + (d.why || ''), 'ask');
        const ok = await new Promise((res) => buttons(m, [[TX.yes, 'pri', () => res(true)], [TX.no, 'sec', () => res(false)]]));
        if (!ok) { run.steps.push({ did: 'proposed ' + a.t + ' #' + a.i, result: 'the person said NO, do not do this' }); say(TX.stopped, 'did'); run.waiting = true; break; }
      } else if (d.say) say(d.say);
      let result;
      if (a.t === 'go') { await chrome.tabs.update(run.tab, { url: a.url }); result = 'opened ' + a.url; }
      else { const [{ result: x }] = await chrome.scripting.executeScript({ target: { tabId: run.tab }, func: act, args: [a.i ?? 0, a.t, a.v ?? ''] }); result = x; }
      run.steps.push({ did: `${a.t}${a.i ? ' #' + a.i : ''}${a.v ? ' "' + a.v.slice(0, 60) + '"' : ''}${a.url ? ' ' + a.url : ''}`, result });
      say('· ' + result, 'did');
      await settled(run.tab);
    }
  } catch (e) { say(TX.fail + ' (' + (e && e.message ? e.message : e) + ')', 'bad'); run = null; }
  setBusy(false);
}

$('#form').onsubmit = async (ev) => {
  ev.preventDefault();
  const text = $('#goal').value.trim(); if (!text) return;
  const tab = await activeTab();
  const o = tab && originOf(tab.url);
  if (!o) { say(TX.noPage, 'bad'); return; }
  // Permission is asked right on the click (Chrome requires a click for it), only for this one site.
  const granted = await chrome.permissions.request({ origins: [o] });
  say(text, 'me'); $('#goal').value = '';
  if (!granted) { say(TX.denied, 'bad'); return; }
  if (run && run.waiting && !run.stopped) { run.goal += '\nThe person answered: ' + text; run.waiting = false; run.tab = tab.id; run.n = 0; }
  else run = { goal: text, steps: [], tab: tab.id, n: 0, stopped: false };
  loop();
};
$('#stop').onclick = () => { if (run) run.stopped = true; say(TX.stopped, 'did'); setBusy(false); };
