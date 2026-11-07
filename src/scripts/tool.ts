// Draws a tool spec (worker/toolcore.ts) as a live widget: chat, project room and cabinet use the same code.
// Values stay in this browser. All text goes in through textContent, so a spec can never add markup.
import { evalFormula, type ToolSpec } from '../../worker/toolcore';

const W: Record<string, Record<string, string>> = {
  en: { add: 'Add', today: 'Today', avg: 'Average', last: 'Latest', left: 'to target', none: 'No entries yet — add the first one.', done: 'done', own: 'Made by Vax for you' },
  ru: { add: 'Добавить', today: 'Сегодня', avg: 'Среднее', last: 'Последнее', left: 'до цели', none: 'Записей пока нет — добавьте первую.', done: 'сделано', own: 'Собрано Vax для вас' },
  uk: { add: 'Додати', today: 'Сьогодні', avg: 'Середнє', last: 'Останнє', left: 'до цілі', none: 'Записів поки немає — додайте перший.', done: 'зроблено', own: 'Зібрано Vax для вас' },
};

const CSS = `.vt{margin-top:10px;padding:14px;border:1px solid var(--line,#ddd);border-radius:14px;background:var(--bg,#fff);color:var(--ink,#111);display:grid;gap:10px;text-align:left;font-size:14px}
.vt h4{margin:0;font-size:15px}.vt small{opacity:.7;font-size:12px}.vt .g{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px}
.vt label{display:grid;gap:3px;font-size:12px}.vt input[type=number]{font:16px inherit;padding:8px 10px;border:1px solid var(--line,#ddd);border-radius:9px;background:transparent;color:inherit;width:100%;box-sizing:border-box}
.vt .o{display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:8px}.vt .o div{padding:10px;border-radius:10px;background:color-mix(in srgb,currentColor 7%,transparent);display:grid;gap:2px}.vt .o b{font-size:20px}
.vt ul{list-style:none;padding:0;margin:0;display:grid;gap:6px}.vt li label{display:flex;gap:8px;align-items:flex-start;font-size:14px}.vt li.d span{text-decoration:line-through;opacity:.55}
.vt .r{display:flex;gap:8px}.vt button{border:0;border-radius:9px;padding:8px 14px;background:var(--ink,#111);color:var(--bg,#fff);font:inherit;cursor:pointer}
.vt .bars{display:flex;gap:4px;align-items:flex-end;height:56px}.vt .bars i{flex:1;min-width:6px;border-radius:4px 4px 0 0;background:var(--acc,currentColor)}`;

function hash(s: string) { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
const load = <T,>(k: string, d: T): T => { try { return JSON.parse(localStorage.getItem(k) || 'null') ?? d; } catch { return d; } };
const save = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const h = <K extends keyof HTMLElementTagNameMap>(tag: K, text?: string, cls?: string) => { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; if (cls) e.className = cls; return e; };
const fmt = (n: number) => (Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—');

export function renderTool(t: ToolSpec): HTMLElement {
  if (!document.getElementById('vt-css')) { const s = h('style'); s.id = 'vt-css'; s.textContent = CSS; document.head.append(s); }
  const L = W[(document.documentElement.lang || 'en').slice(0, 2)] || W.en;
  const key = 'vaxo_tool_' + hash(JSON.stringify(t));
  const box = h('div', undefined, 'vt');
  box.append(h('h4', t.title));

  if (t.kind === 'calc') {
    const vals = load<Record<string, number>>(key, {});
    const g = h('div', undefined, 'g'), o = h('div', undefined, 'o');
    const outs = t.outputs.map((x) => { const d = h('div'), b = h('b', '—'); d.append(b, h('small', x.label + (x.unit ? ', ' + x.unit : ''))); o.append(d); return b; });
    const cur: Record<string, number> = Object.fromEntries(t.fields.map((f) => [f.id, vals[f.id] ?? f.value]));
    const calc = () => { t.outputs.forEach((x, i) => { outs[i].textContent = fmt(evalFormula(x.f, cur)); }); save(key, cur); };
    for (const f of t.fields) {
      const l = h('label', f.label + (f.unit ? ', ' + f.unit : '')), i = h('input');
      i.type = 'number'; i.step = 'any'; i.value = String(cur[f.id]);
      i.oninput = () => { cur[f.id] = Number(i.value) || 0; calc(); };
      l.append(i); g.append(l);
    }
    box.append(g, o); calc();
  }

  if (t.kind === 'list') {
    let done = load<number[]>(key, []);
    const ul = h('ul'), p = h('small');
    const upd = () => { p.textContent = `${done.length}/${t.items.length} ${L.done}`; save(key, done); };
    t.items.forEach((s, n) => {
      const li = h('li'), l = h('label'), c = h('input'), sp = h('span', s);
      c.type = 'checkbox'; c.checked = done.includes(n); li.classList.toggle('d', c.checked);
      c.onchange = () => { done = c.checked ? [...done, n] : done.filter((x) => x !== n); li.classList.toggle('d', c.checked); upd(); };
      l.append(c, sp); li.append(l); ul.append(li);
    });
    box.append(p, ul); upd();
  }

  if (t.kind === 'tracker') {
    type E = { d: string; v: number };
    let log = load<E[]>(key, []);
    const r = h('div', undefined, 'r'), i = h('input'), b = h('button', L.add), bars = h('div', undefined, 'bars'), o = h('div', undefined, 'o'), empty = h('small', L.none);
    i.type = 'number'; i.step = 'any'; i.placeholder = t.metric + (t.unit ? ', ' + t.unit : ''); i.setAttribute('aria-label', i.placeholder);
    b.type = 'button';
    const stat = (v: string, s: string) => { const d = h('div'); d.append(h('b', v), h('small', s)); return d; };
    const draw = () => {
      save(key, log);
      empty.hidden = log.length > 0;
      const last = log.slice(-14), top = Math.max(...last.map((e) => Math.abs(e.v)), 1);
      bars.replaceChildren(...last.map((e) => { const x = h('i'); x.style.height = Math.max(6, (Math.abs(e.v) / top) * 100) + '%'; x.title = `${e.d}: ${e.v}`; return x; }));
      const list = [];
      if (log.length) {
        const l = log[log.length - 1].v;
        list.push(stat(fmt(l), L.last), stat(fmt(log.reduce((a, e) => a + e.v, 0) / log.length), L.avg));
        if (t.target !== undefined) list.push(stat(fmt(Math.abs(t.target - l)), L.left));
      }
      o.replaceChildren(...list);
    };
    b.onclick = () => {
      const v = Number(i.value);
      if (i.value === '' || !Number.isFinite(v)) return;
      const d = new Date().toISOString().slice(0, 10);
      log = [...log.filter((e) => e.d !== d), { d, v }].slice(-120);
      i.value = ''; draw();
    };
    r.append(i, b); box.append(r, bars, o, empty); draw();
  }

  if (t.note) box.append(h('small', t.note));
  return box;
}

const TOOL_RE = /\[\[TOOL:(\{[\s\S]*?\})\]\]/;
/** Splits a stored message into its text and tool. */
export function pullTool(text: string): { text: string; tool: ToolSpec | null } {
  const m = text.match(TOOL_RE);
  if (!m) return { text, tool: null };
  try { return { text: text.replace(m[0], '').trim(), tool: JSON.parse(m[1]) as ToolSpec }; } catch { return { text: text.replace(m[0], '').trim(), tool: null }; }
}
