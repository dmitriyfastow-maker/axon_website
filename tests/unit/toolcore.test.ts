import { describe, expect, it } from 'vitest';
import { evalFormula, sanitizeTool } from '../../worker/toolcore';

describe('evalFormula', () => {
  it('counts with precedence, powers and functions', () => {
    expect(evalFormula('2+3*4', {})).toBe(14);
    expect(evalFormula('(2+3)*4', {})).toBe(20);
    expect(evalFormula('w/(h/100)^2', { w: 80, h: 200 })).toBe(20);
    expect(evalFormula('round(w*0.033,1)', { w: 75 })).toBe(2.5);
    expect(evalFormula('max(a,b)-min(a,b)', { a: 2, b: 9 })).toBe(7);
    expect(evalFormula('-a+1', { a: 3 })).toBe(-2);
  });
  it('refuses anything that is not arithmetic', () => {
    for (const bad of ['alert(1)', 'constructor', 'a.b', '1+', 'window', '__proto__', '1;2', 'toString(1)']) expect(evalFormula(bad, { a: 1 })).toBeNaN();
  });
});

describe('sanitizeTool', () => {
  const calc = { kind: 'calc', title: 'BMI', fields: [{ id: 'w', label: 'Weight', value: 80 }, { id: 'h', label: 'Height', value: 180 }], outputs: [{ label: 'BMI', f: 'w/(h/100)^2' }] };
  it('keeps a valid calculator', () => expect(sanitizeTool(calc)?.kind).toBe('calc'));
  it('rejects a broken formula, unknown variable or bad id', () => {
    expect(sanitizeTool({ ...calc, outputs: [{ label: 'x', f: 'alert(1)' }] })).toBeNull();
    expect(sanitizeTool({ ...calc, outputs: [{ label: 'x', f: 'z*2' }] })).toBeNull();
    expect(sanitizeTool({ ...calc, fields: [{ id: 'a b', label: 'x', value: 1 }] })).toBeNull();
  });
  it('strips markup and marker brackets from text', () => {
    const t = sanitizeTool({ kind: 'list', title: '<b>Plan]]', items: ['one<script>', 'two'] });
    expect(JSON.stringify(t)).not.toMatch(/<[a-z\/]|\]\]"/i);
  });
  it('keeps comparison signs in text', () => {
    const t = sanitizeTool({ kind: 'list', title: 'Health check', items: ['LTV/CAC > 3 is healthy', 'churn < 5%'], note: 'CAC <= LTV / 3' });
    expect(t && t.kind === 'list' && t.items).toEqual(['LTV/CAC > 3 is healthy', 'churn < 5%']);
    expect(t?.note).toBe('CAC <= LTV / 3');
  });
  it('rejects unknown kinds and empty lists', () => {
    expect(sanitizeTool({ kind: 'html', title: 'x' })).toBeNull();
    expect(sanitizeTool({ kind: 'list', title: 'x', items: ['one'] })).toBeNull();
  });
});
