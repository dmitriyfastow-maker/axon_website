import { describe, expect, it } from 'vitest';
import { guard, cleanEls } from '../../worker/agent';

const els = cleanEls([
  { i: 1, tag: 'input', type: 'text', label: 'Search' },
  { i: 2, tag: 'input', type: 'password', label: 'Password', secret: true },
  { i: 3, tag: 'button', type: 'submit', label: 'Найти' },
  { i: 4, tag: 'button', label: 'Оплатить заказ' },
  { i: 5, tag: 'input', type: 'text', label: 'Номер карты' },
  { i: 6, tag: 'a', label: 'Подробнее' },
]);

describe('Vax for Chrome guard', () => {
  it('types into an ordinary field', () => {
    const s = guard({ say: 'ищу', act: { t: 'type', i: 1, v: 'Рим' } }, els, 'page', 'ru');
    expect(s.act).toEqual({ t: 'type', i: 1, v: 'Рим' });
    expect(s.confirm).toBe(false);
  });
  it('never types passwords, cards or long numbers', () => {
    expect(guard({ act: { t: 'type', i: 2, v: 'x' } }, els, '', 'ru').act.t).toBe('ask');
    expect(guard({ act: { t: 'type', i: 5, v: '1' } }, els, '', 'ru').act.t).toBe('ask');
    expect(guard({ act: { t: 'type', i: 1, v: '4111 1111 1111 1111'.replace(/ /g, '') } }, els, '', 'en').act.t).toBe('ask');
  });
  it('asks Yes before paying or submitting', () => {
    expect(guard({ act: { t: 'click', i: 4 } }, els, '', 'ru').confirm).toBe(true);
    expect(guard({ act: { t: 'click', i: 3 } }, els, '', 'ru').confirm).toBe(true);
    expect(guard({ act: { t: 'click', i: 6 } }, els, '', 'ru').confirm).toBe(false);
  });
  it('stops at captcha, unknown elements and bad urls', () => {
    expect(guard({ act: { t: 'click', i: 6 } }, els, 'Please complete the reCAPTCHA', 'en').act.t).toBe('ask');
    expect(guard({ act: { t: 'click', i: 99 } }, els, '', 'en').act.t).toBe('ask');
    expect(guard({ act: { t: 'go', url: 'javascript:alert(1)' } }, els, '', 'en').act.t).toBe('ask');
    expect(guard({ act: { t: 'go', url: 'https://example.com' } }, els, '', 'en').act.t).toBe('go');
    expect(guard(null, els, '', 'en').act.t).toBe('ask');
  });
});
