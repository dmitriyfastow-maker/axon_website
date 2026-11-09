// Payments on the client's own site (Decision 49): the business connects ITS OWN payment account — plata by mono,
// WayForPay, LiqPay or Stripe — and visitors pay a booking deposit or a payment link straight to that account.
// Vaxo is never in the money flow: we keep only the business's keys (encrypted), create the checkout on its behalf
// and re-read the status from the provider with those keys. A webhook body is never trusted, it only says "check now".
import type { DB } from './partner.js';

export type Prov = 'mono' | 'wfp' | 'liqpay' | 'stripe';
export type PayCfg = { prov: Prov; k1: string; k2?: string; dep?: number; cur?: string; at?: string };
export type PayRec = { prov: Prov; amt: number; cur: string; desc: string; st: 'new' | 'paid'; ext?: string; at: string; paid_at?: string; who?: string };

export const PROVS: Prov[] = ['mono', 'wfp', 'liqpay', 'stripe'];
/** Currencies each provider takes in our integration (mono: hryvnia only). */
export const CURS: Record<Prov, string[]> = { mono: ['UAH'], wfp: ['UAH', 'USD', 'EUR'], liqpay: ['UAH', 'USD', 'EUR'], stripe: ['USD', 'EUR', 'GBP', 'PLN', 'UAH'] };

/* ---------- small crypto: MD5 (WayForPay HMAC-MD5 is not in WebCrypto), SHA-1, AES-GCM for stored keys ---------- */
function md5(bytes: Uint8Array): Uint8Array {
  const K = new Uint32Array(64), S = [7, 12, 17, 22, 5, 9, 14, 20, 4, 11, 16, 23, 6, 10, 15, 21];
  for (let i = 0; i < 64; i++) K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32) >>> 0;
  const n = (((bytes.length + 8) >> 6) + 1) << 6, m = new Uint8Array(n);
  m.set(bytes); m[bytes.length] = 0x80;
  const bits = bytes.length * 8, dv = new DataView(m.buffer);
  dv.setUint32(n - 8, bits >>> 0, true); dv.setUint32(n - 4, Math.floor(bits / 2 ** 32), true);
  let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
  for (let o = 0; o < n; o += 64) {
    let a = a0, b = b0, c = c0, d = d0;
    for (let i = 0; i < 64; i++) {
      let f: number, g: number;
      if (i < 16) { f = (b & c) | (~b & d); g = i; } else if (i < 32) { f = (d & b) | (~d & c); g = (5 * i + 1) % 16; } else if (i < 48) { f = b ^ c ^ d; g = (3 * i + 5) % 16; } else { f = c ^ (b | ~d); g = (7 * i) % 16; }
      const t = d; d = c; c = b;
      const x = (a + f + K[i] + dv.getUint32(o + g * 4, true)) >>> 0, s = S[(i >> 4) * 4 + (i % 4)];
      b = (b + ((x << s) | (x >>> (32 - s)))) >>> 0; a = t;
    }
    a0 = (a0 + a) >>> 0; b0 = (b0 + b) >>> 0; c0 = (c0 + c) >>> 0; d0 = (d0 + d) >>> 0;
  }
  const out = new Uint8Array(16), ov = new DataView(out.buffer);
  [a0, b0, c0, d0].forEach((v, i) => ov.setUint32(i * 4, v, true));
  return out;
}
const enc = new TextEncoder();
const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
export function hmacMd5(key: string, msg: string): string {
  let k: Uint8Array = enc.encode(key);
  if (k.length > 64) k = md5(k);
  const kp = new Uint8Array(64); kp.set(k);
  const ipad = kp.map((x) => x ^ 0x36), opad = kp.map((x) => x ^ 0x5c), mb = enc.encode(msg);
  const inner = new Uint8Array(64 + mb.length); inner.set(ipad); inner.set(mb, 64);
  const ih = md5(inner), outer = new Uint8Array(80); outer.set(opad); outer.set(ih, 64);
  return hex(md5(outer));
}
export async function liqSign(priv: string, data: string): Promise<string> {
  const h = new Uint8Array(await crypto.subtle.digest('SHA-1', enc.encode(priv + data + priv)));
  return btoa(String.fromCharCode(...h));
}
const b64 = (s: string) => btoa(String.fromCharCode(...enc.encode(s)));

async function aes(secret: string) {
  const raw = await crypto.subtle.digest('SHA-256', enc.encode('vaxo-sitepay:' + secret));
  return crypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt', 'decrypt']);
}
export async function seal(secret: string, text: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const c = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aes(secret), enc.encode(text)));
  return btoa(String.fromCharCode(...iv, ...c));
}
export async function open(secret: string, blob: string) {
  const all = Uint8Array.from(atob(blob), (c) => c.charCodeAt(0));
  const p = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: all.slice(0, 12) }, await aes(secret), all.slice(12));
  return new TextDecoder().decode(p);
}

/* ---------- storage (settings table: no migration needed) ---------- */
const get = (db: DB, k: string) => db.prepare('SELECT value FROM settings WHERE key = ?').bind(k).first<{ value: string }>().then((r) => r?.value ?? null);
const put = (db: DB, k: string, v: string) => db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind(k, v).run();

export async function loadCfg(db: DB, secret: string | undefined, bizId: number): Promise<PayCfg | null> {
  const v = await get(db, `sitepay_${bizId}`).catch(() => null);
  if (!v || !secret) return null;
  try { return JSON.parse(await open(secret, v)) as PayCfg; } catch { return null; }
}
/** What the site and the cabinet may see: provider, deposit, a masked key. Never the keys. */
export function publicCfg(c: PayCfg | null) {
  if (!c) return null;
  return { prov: c.prov, dep: c.dep || 0, cur: c.cur || CURS[c.prov][0], key: c.k1.length > 8 ? `${c.k1.slice(0, 4)}…${c.k1.slice(-4)}` : '••••', at: c.at };
}

export function cleanCfg(b: Record<string, unknown>): PayCfg | string {
  const prov = String(b.prov || '') as Prov;
  if (!PROVS.includes(prov)) return 'prov';
  const k1 = String(b.k1 || '').trim().slice(0, 300), k2 = String(b.k2 || '').trim().slice(0, 300);
  if (!k1 || (prov !== 'mono' && prov !== 'stripe' && !k2)) return 'keys';
  if (prov === 'stripe' && !/^(sk|rk)_(live|test)_[A-Za-z0-9]{10,}$/.test(k1)) return 'keys';
  if (prov === 'liqpay' && !/^(sandbox_)?i\d{6,}$/.test(k1)) return 'keys';
  const cur = CURS[prov].includes(String(b.cur)) ? String(b.cur) : CURS[prov][0];
  const dep = Math.max(0, Math.min(1_000_000, Math.round(Number(b.dep) * 100) / 100 || 0));
  return { prov, k1, k2: k2 || undefined, dep, cur };
}

/* ---------- providers ---------- */
type Made = { url: string; ext?: string } | null;
const WFP = 'https://api.wayforpay.com/api';

async function call(url: string, init: RequestInit) {
  const r = await fetch(url, init).catch(() => null);
  if (!r) return { ok: false, d: {} as Record<string, any> };
  const d = (await r.json().catch(() => ({}))) as Record<string, any>;
  return { ok: r.ok, d };
}

/** One cheap read with the keys, so a typo is caught when the owner saves, not when a customer pays. */
export async function checkKeys(c: PayCfg): Promise<boolean> {
  if (c.prov === 'mono') return (await call('https://api.monobank.ua/api/merchant/details', { headers: { 'X-Token': c.k1 } })).ok;
  if (c.prov === 'stripe') return (await call('https://api.stripe.com/v1/balance', { headers: { Authorization: `Bearer ${c.k1}` } })).ok;
  if (c.prov === 'wfp') {
    const ref = 'vx_check_' + Date.now();
    const { d } = await call(WFP, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transactionType: 'CHECK_STATUS', merchantAccount: c.k1, orderReference: ref, merchantSignature: hmacMd5(c.k2 || '', `${c.k1};${ref}`), apiVersion: 1 }) });
    // A wrong account or key answers "Invalid signature"/"Merchant not found"; good keys answer "Order not found".
    return !/signature|merchant/i.test(String(d.reason || '')) && d.reasonCode !== 1113;
  }
  const data = b64(JSON.stringify({ action: 'status', version: 3, public_key: c.k1, order_id: 'vx_check_' + Date.now() }));
  const { d } = await call('https://www.liqpay.ua/api/request', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ data, signature: await liqSign(c.k2 || '', data) }) });
  return !/public_key|signature|private/i.test(String(d.err_code || d.code || ''));
}

export async function makeCheckout(c: PayCfg, ref: string, r: PayRec, back: string, hook: string, host: string): Promise<Made> {
  const name = r.desc.slice(0, 120) || 'Payment';
  if (c.prov === 'mono') {
    const { ok, d } = await call('https://api.monobank.ua/api/merchant/invoice/create', { method: 'POST', headers: { 'X-Token': c.k1, 'Content-Type': 'application/json' }, body: JSON.stringify({
      amount: Math.round(r.amt * 100), ccy: 980, merchantPaymInfo: { reference: ref, destination: name, basketOrder: [{ name, qty: 1, sum: Math.round(r.amt * 100), total: Math.round(r.amt * 100), code: ref.slice(-20), unit: 'посл.' }] },
      redirectUrl: back, webHookUrl: hook, validity: 24 * 3600,
    }) });
    return ok && d.pageUrl ? { url: d.pageUrl, ext: d.invoiceId } : null;
  }
  if (c.prov === 'wfp') {
    const date = Math.floor(Date.now() / 1000), amount = r.amt.toFixed(2).replace(/\.00$/, '');
    const sig = hmacMd5(c.k2 || '', [c.k1, host, ref, date, amount, r.cur, name, 1, amount].join(';'));
    const { d } = await call(WFP, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      transactionType: 'CREATE_INVOICE', merchantAccount: c.k1, merchantAuthType: 'SimpleSignature', merchantDomainName: host, merchantSignature: sig, apiVersion: 1,
      serviceUrl: hook, returnUrl: back, orderReference: ref, orderDate: date, amount, currency: r.cur, orderTimeout: 86400, productName: [name], productPrice: [amount], productCount: [1],
    }) });
    return d.invoiceUrl ? { url: d.invoiceUrl } : null;
  }
  if (c.prov === 'liqpay') {
    const data = b64(JSON.stringify({ version: 3, public_key: c.k1, action: 'pay', amount: r.amt, currency: r.cur, description: name, order_id: ref, result_url: back, server_url: hook }));
    return { url: `https://www.liqpay.ua/api/3/checkout?data=${encodeURIComponent(data)}&signature=${encodeURIComponent(await liqSign(c.k2 || '', data))}` };
  }
  const f = new URLSearchParams({
    mode: 'payment', success_url: back, cancel_url: back.replace(/[?&]sp=[^&]*/, ''), client_reference_id: ref, 'metadata[ref]': ref,
    'line_items[0][quantity]': '1', 'line_items[0][price_data][currency]': r.cur.toLowerCase(), 'line_items[0][price_data][unit_amount]': String(Math.round(r.amt * 100)), 'line_items[0][price_data][product_data][name]': name,
  });
  const { ok, d } = await call('https://api.stripe.com/v1/checkout/sessions', { method: 'POST', headers: { Authorization: `Bearer ${c.k1}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: f });
  return ok && d.url ? { url: d.url, ext: d.id } : null;
}

/** Ask the provider, with the owner's keys, whether this payment went through. */
export async function isPaid(c: PayCfg, ref: string, r: PayRec): Promise<boolean> {
  if (c.prov === 'mono') {
    if (!r.ext) return false;
    const { d } = await call(`https://api.monobank.ua/api/merchant/invoice/status?invoiceId=${encodeURIComponent(r.ext)}`, { headers: { 'X-Token': c.k1 } });
    return d.status === 'success';
  }
  if (c.prov === 'wfp') {
    const { d } = await call(WFP, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transactionType: 'CHECK_STATUS', merchantAccount: c.k1, orderReference: ref, merchantSignature: hmacMd5(c.k2 || '', `${c.k1};${ref}`), apiVersion: 1 }) });
    return d.transactionStatus === 'Approved';
  }
  if (c.prov === 'liqpay') {
    const data = b64(JSON.stringify({ action: 'status', version: 3, public_key: c.k1, order_id: ref }));
    const { d } = await call('https://www.liqpay.ua/api/request', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ data, signature: await liqSign(c.k2 || '', data) }) });
    return d.status === 'success' || (c.k1.startsWith('sandbox_') && d.status === 'sandbox');
  }
  if (!r.ext) return false;
  const { d } = await call(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(r.ext)}`, { headers: { Authorization: `Bearer ${c.k1}` } });
  return d.payment_status === 'paid';
}

/* ---------- the flow ---------- */
const recKey = (ref: string) => `sp_${ref}`;
export const refBiz = (ref: string) => (/^(\d+)_[a-f0-9]{16}$/.test(ref) ? Number(ref.split('_')[0]) : 0);

export async function newPayment(db: DB, bizId: number, prov: Prov, amt: number, cur: string, desc: string, who = ''): Promise<string> {
  const ref = `${bizId}_${hex(crypto.getRandomValues(new Uint8Array(8)))}`;
  const rec: PayRec = { prov, amt, cur, desc: desc.slice(0, 200), st: 'new', at: new Date().toISOString(), who: who.slice(0, 120) || undefined };
  await put(db, recKey(ref), JSON.stringify(rec));
  return ref;
}
export async function getPayment(db: DB, ref: string): Promise<PayRec | null> {
  const v = await get(db, recKey(ref)).catch(() => null);
  return v ? (JSON.parse(v) as PayRec) : null;
}

/** Create a fresh checkout for a stored payment and remember the provider's id. */
export async function checkout(db: DB, secret: string | undefined, ref: string, back: string, origin: string): Promise<string | null> {
  const bizId = refBiz(ref), c = bizId ? await loadCfg(db, secret, bizId) : null, r = await getPayment(db, ref);
  if (!c || !r || r.st === 'paid') return null;
  const host = new URL(back).hostname;
  const made = await makeCheckout(c, ref, r, back, `${origin}/api/sitepay/hook/${ref}`, host);
  if (!made) return null;
  if (made.ext) await put(db, recKey(ref), JSON.stringify({ ...r, ext: made.ext }));
  return made.url;
}

/** Re-read the status; the first time it is paid, mark it and return true so the caller tells the owner. */
export async function settle(db: DB, secret: string | undefined, ref: string): Promise<{ paid: boolean; fresh: boolean; rec: PayRec | null }> {
  const bizId = refBiz(ref), r = await getPayment(db, ref);
  if (!r) return { paid: false, fresh: false, rec: null };
  if (r.st === 'paid') return { paid: true, fresh: false, rec: r };
  const c = bizId ? await loadCfg(db, secret, bizId) : null;
  if (!c || !(await isPaid(c, ref, r).catch(() => false))) return { paid: false, fresh: false, rec: r };
  const done: PayRec = { ...r, st: 'paid', paid_at: new Date().toISOString() };
  await put(db, recKey(ref), JSON.stringify(done));
  return { paid: true, fresh: true, rec: done };
}

export async function listPayments(db: DB, bizId: number) {
  const rows = (await db.prepare('SELECT key, value FROM settings WHERE key LIKE ? ORDER BY rowid DESC LIMIT 30').bind(`sp_${bizId}_%`).all<{ key: string; value: string }>().catch(() => ({ results: [] as { key: string; value: string }[] }))).results;
  return rows.map((x) => ({ ref: x.key.slice(3), ...(JSON.parse(x.value) as PayRec) })).map(({ ext: _e, ...rest }) => rest);
}

export async function saveCfg(db: DB, secret: string, bizId: number, c: PayCfg | null) {
  if (!c) { await db.prepare('DELETE FROM settings WHERE key IN (?, ?)').bind(`sitepay_${bizId}`, `sitepay_pub_${bizId}`).run(); return; }
  await put(db, `sitepay_${bizId}`, await seal(secret, JSON.stringify({ ...c, at: new Date().toISOString() })));
  // What the public site needs to show the deposit button, kept apart so the page never decrypts keys.
  await put(db, `sitepay_pub_${bizId}`, JSON.stringify({ dep: c.dep || 0, cur: c.cur || CURS[c.prov][0] }));
}
export async function sitePay(db: DB, bizId: number): Promise<{ dep: number; cur: string } | null> {
  const v = await get(db, `sitepay_pub_${bizId}`).catch(() => null);
  const x = v ? (JSON.parse(v) as { dep: number; cur: string }) : null;
  return x && x.dep > 0 ? x : null;
}
