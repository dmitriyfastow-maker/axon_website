import type { Lang } from '../i18n/index.js';

export const INTERESTS = ['Starter', 'Foundation', 'Growth', 'Scale', 'single', 'any'] as const;
export const LIMITS = { name: 100, contact: 100, message: 2000 } as const;

export interface LeadInput {
  mode: 'request' | 'question';
  name: string;
  contact: string;
  interest: string;
  message: string;
  lang: Lang;
  /** Partner code from a ?ref= link (first touch, kept for life). */
  ref?: string;
}

export type LeadErrors = Partial<Record<keyof LeadInput, true>>;
export type LeadValidation = { ok: true; value: LeadInput } | { ok: false; errors: LeadErrors };

// Same three contact formats the design accepted: @telegram, phone, email.
export function isValidContact(s: string): boolean {
  const c = s.trim();
  return /^@\w{3,}$/.test(c) || /^\+?[\d\s()-]{7,}$/.test(c) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c);
}

const str = (v: unknown) => (typeof v === 'string' ? v : null);

export function validateLead(x: unknown): LeadValidation {
  const o = (x && typeof x === 'object' ? x : {}) as Record<string, unknown>;
  const name = str(o.name)?.trim() ?? null;
  const contact = str(o.contact)?.trim() ?? null;
  const message = str(o.message ?? '')?.trim() ?? null;
  const interest = str(o.interest ?? '');
  const errors: LeadErrors = {};

  if (o.mode !== 'request' && o.mode !== 'question') errors.mode = true;
  if (o.lang !== 'en' && o.lang !== 'ua' && o.lang !== 'ru') errors.lang = true;
  if (!name || name.length > LIMITS.name) errors.name = true;
  if (!contact || contact.length > LIMITS.contact || !isValidContact(contact)) errors.contact = true;
  if (message === null || message.length > LIMITS.message) errors.message = true;
  if (interest === null || (interest !== '' && !(INTERESTS as readonly string[]).includes(interest))) errors.interest = true;

  const ref = str(o.ref)?.trim() ?? '';
  if (Object.keys(errors).length) return { ok: false, errors };
  return {
    ok: true,
    value: { mode: o.mode as LeadInput['mode'], name: name!, contact: contact!, interest: interest!, message: message!, lang: o.lang as Lang, ...(/^[A-Za-z0-9_-]{1,64}$/.test(ref) ? { ref } : {}) },
  };
}
