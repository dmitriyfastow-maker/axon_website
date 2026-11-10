// Execution engine core (Decision 38), shared by the worker and the browser. A tool is DATA, never code: the model
// writes a small spec, we validate it here, and the page draws it. Formulas go through this tiny parser (no eval),
// so nothing a model writes can run in a visitor's browser.

export type ToolField = { id: string; label: string; unit?: string; value: number };
export type ToolOutput = { label: string; unit?: string; f: string };
export type ToolSpec =
  | { kind: 'calc'; title: string; fields: ToolField[]; outputs: ToolOutput[]; note?: string }
  | { kind: 'list'; title: string; items: string[]; note?: string }
  | { kind: 'tracker'; title: string; metric: string; unit?: string; target?: number; note?: string };

const FN: Record<string, (...a: number[]) => number> = {
  min: Math.min, max: Math.max, abs: Math.abs, sqrt: Math.sqrt, floor: Math.floor, ceil: Math.ceil,
  round: (x, d = 0) => Math.round(x * 10 ** d) / 10 ** d,
};

/** Evaluates + - * / ^ ( ) numbers, variables and FN. Returns NaN on anything else. */
export function evalFormula(src: string, vars: Record<string, number>): number {
  const t = src.match(/\d+\.?\d*|\.\d+|[a-zA-Z_]\w*|[-+*/^(),]|\S/g) || [];
  let i = 0;
  const peek = () => t[i];
  const fail = (): never => { throw new Error('formula'); };
  const atom = (): number => {
    const k = t[i++];
    if (k === undefined) fail();
    if (k === '(') { const v = sum(); if (t[i++] !== ')') fail(); return v; }
    if (k === '-') return -atom();
    if (k === '+') return atom();
    if (/^[\d.]/.test(k)) return Number(k);
    if (/^[a-zA-Z_]/.test(k)) {
      if (peek() === '(') {
        if (!Object.hasOwn(FN, k)) fail();
        i++;
        const args = [sum()];
        while (peek() === ',') { i++; args.push(sum()); }
        if (t[i++] !== ')') fail();
        return FN[k](...args);
      }
      if (!Object.hasOwn(vars, k)) fail();
      return vars[k];
    }
    return fail();
  };
  const pow = (): number => { const b = atom(); if (peek() === '^') { i++; return b ** pow(); } return b; };
  const mul = (): number => { let v = pow(); while (peek() === '*' || peek() === '/') { const o = t[i++]; const r = pow(); v = o === '*' ? v * r : v / r; } return v; };
  const sum = (): number => { let v = mul(); while (peek() === '+' || peek() === '-') { const o = t[i++]; const r = mul(); v = o === '+' ? v + r : v - r; } return v; };
  try {
    const v = sum();
    return i === t.length ? v : NaN;
  } catch { return NaN; }
}

// Text only ever reaches the page through textContent (src/scripts/tool.ts), so comparison signs stay ("LTV/CAC > 3" must read right);
// anything shaped like a tag still goes, and square brackets go: they are the chat's own markers.
const txt = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/<\/?[a-z!][^>]*>?/gi, '').replace(/[\[\]]/g, '').replace(/\s+/g, ' ').trim().slice(0, max) : '');
const num = (v: unknown) => { if (v === null || v === undefined || v === '') return null; const n = Number(v); return Number.isFinite(n) ? n : null; };

/** Turns anything into a valid tool, or null. Every formula is test-run on the default values. */
export function sanitizeTool(x: unknown): ToolSpec | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const title = txt(o.title, 70), note = txt(o.note, 200) || undefined;
  if (!title) return null;
  if (o.kind === 'list') {
    const items = (Array.isArray(o.items) ? o.items : []).map((s) => txt(s, 160)).filter(Boolean).slice(0, 31);
    return items.length >= 2 ? { kind: 'list', title, items, note } : null;
  }
  if (o.kind === 'tracker') {
    const metric = txt(o.metric, 40);
    if (!metric) return null;
    const target = num(o.target);
    return { kind: 'tracker', title, metric, unit: txt(o.unit, 12) || undefined, target: target ?? undefined, note };
  }
  if (o.kind === 'calc') {
    const fields: ToolField[] = [];
    for (const f of (Array.isArray(o.fields) ? o.fields : []).slice(0, 12)) {
      const r = (f || {}) as Record<string, unknown>;
      const id = typeof r.id === 'string' && /^[a-zA-Z_]\w{0,19}$/.test(r.id) && !Object.hasOwn(FN, r.id) ? r.id : '';
      const label = txt(r.label, 50), value = num(r.value);
      if (!id || !label || value === null || fields.some((y) => y.id === id)) return null;
      fields.push({ id, label, unit: txt(r.unit, 12) || undefined, value });
    }
    if (!fields.length) return null;
    const vars = Object.fromEntries(fields.map((f) => [f.id, f.value]));
    const outputs: ToolOutput[] = [];
    for (const f of (Array.isArray(o.outputs) ? o.outputs : []).slice(0, 8)) {
      const r = (f || {}) as Record<string, unknown>;
      const label = txt(r.label, 50), src = typeof r.f === 'string' ? r.f.slice(0, 200) : '';
      if (!label || !src || !Number.isFinite(evalFormula(src, vars))) return null;
      outputs.push({ label, unit: txt(r.unit, 12) || undefined, f: src });
    }
    return outputs.length ? { kind: 'calc', title, fields, outputs, note } : null;
  }
  return null;
}
