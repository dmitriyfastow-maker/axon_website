import { describe, expect, test } from 'vitest';
import { isValidContact, validateLead } from '../../src/lib/validate';

const base = { mode: 'request', name: 'Anna', contact: '@axon_team', interest: '', message: '', lang: 'en' };

describe('isValidContact', () => {
  test.each(['@axon_team', '+971 50 123 4567', '(050) 123-45-67', 'a@b.co'])('accepts %s', (c) => expect(isValidContact(c)).toBe(true));
  test.each(['@ab', '12345', 'mail@', ''])('rejects %j', (c) => expect(isValidContact(c)).toBe(false));
});

describe('validateLead', () => {
  test('accepts a valid lead and trims', () => {
    const r = validateLead({ ...base, name: '  Anna ', contact: ' a@b.co ' });
    expect(r).toEqual({ ok: true, value: { ...base, name: 'Anna', contact: 'a@b.co' } });
  });
  test('empty or blank name', () => {
    expect(validateLead({ ...base, name: '' })).toMatchObject({ ok: false, errors: { name: true } });
    expect(validateLead({ ...base, name: '  ' })).toMatchObject({ ok: false, errors: { name: true } });
  });
  test('message over 2000 chars', () => {
    expect(validateLead({ ...base, message: 'x'.repeat(2001) })).toMatchObject({ ok: false, errors: { message: true } });
    expect(validateLead({ ...base, message: 'x'.repeat(2000) }).ok).toBe(true);
  });
  test('interest must be known or empty', () => {
    expect(validateLead({ ...base, interest: 'Gold' })).toMatchObject({ ok: false, errors: { interest: true } });
    expect(validateLead({ ...base, interest: 'Growth' }).ok).toBe(true);
    expect(validateLead({ ...base, interest: 'single' }).ok).toBe(true);
  });
  test('mode and lang are enums', () => {
    expect(validateLead({ ...base, mode: 'x' })).toMatchObject({ ok: false, errors: { mode: true } });
    expect(validateLead({ ...base, lang: 'de' })).toMatchObject({ ok: false, errors: { lang: true } });
  });
  test('non-object input', () => {
    expect(validateLead(null).ok).toBe(false);
    expect(validateLead({ ...base, name: 5 })).toMatchObject({ ok: false, errors: { name: true } });
  });
  test('name over 100 chars', () => {
    expect(validateLead({ ...base, name: 'a'.repeat(101) })).toMatchObject({ ok: false, errors: { name: true } });
  });
});
