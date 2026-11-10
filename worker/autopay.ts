// Subscription autopay through plata by mono (Decision 50): on the first card payment the client agrees to save the
// card (mono keeps it, we keep only mono's card token); each renewal invoice is then charged by that token on the day the
// paid period ends, after a reminder 3 days ahead. One click turns it off (the invoice page or the project chat link).
// Abroad, Paddle does the same once it is connected.
import type { DB } from './partner.js';
import type { Notify } from './deals.js';
import { mono } from './mono.js';
import { nbuRate } from './finance.js';

type Inv = { id: number; number: string; token: string; amount: number; currency: string; description: string; status: string; lead_id: number | null; lang: string | null };
export type Auto = { token: string; wallet: string; on: boolean; card?: string };

const get = (db: DB, k: string) => db.prepare('SELECT value FROM settings WHERE key = ?').bind(k).first<{ value: string }>().then((r) => r?.value ?? null).catch(() => null);
const put = (db: DB, k: string, v: string) => db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind(k, v).run();

export const isSubscription = (desc: string) => /^Vaxo .+ subscription/.test(desc);

export async function autoOf(db: DB, leadId: number | null): Promise<Auto | null> {
  if (!leadId) return null;
  const v = await get(db, `autopay_${leadId}`);
  try { return v ? (JSON.parse(v) as Auto) : null; } catch { return null; }
}

/** Extra fields for mono's invoice/create: save the card when it is a subscription and the client agreed. */
export function saveCardExtra(inv: Inv, agreed: boolean): Record<string, unknown> {
  return agreed && inv.lead_id && isSubscription(inv.description) ? { saveCardData: { saveCard: true, walletId: `sub-${inv.lead_id}` } } : {};
}

/** After a successful card payment: keep mono's card token for the next renewals. */
export async function rememberCard(db: DB, inv: Inv, status: Record<string, any> | null) {
  const token = status?.walletData?.cardToken;
  if (!inv.lead_id || !isSubscription(inv.description) || typeof token !== 'string') return;
  const card = typeof status?.paymentInfo?.maskedPan === 'string' ? String(status.paymentInfo.maskedPan).slice(-4) : undefined;
  await put(db, `autopay_${inv.lead_id}`, JSON.stringify({ token, wallet: String(status?.walletData?.walletId || `sub-${inv.lead_id}`), on: true, card } satisfies Auto));
}

const REMIND: Record<string, string> = {
  ru: '🔁 {day} продлим тариф {plan}: спишем ${amount} с сохранённой карты{card}. Ничего делать не нужно. Не хотите продолжать — отключите автопродление: {link}',
  ua: '🔁 {day} продовжимо тариф {plan}: спишемо ${amount} зі збереженої картки{card}. Нічого робити не треба. Не хочете продовжувати — вимкніть автопродовження: {link}',
  en: '🔁 On {day} we will renew your {plan} plan: ${amount} from your saved card{card}. Nothing to do. Do not want to continue? Turn autopay off: {link}',
};

/** Called by billing right after a renewal invoice: if autopay is on, remind now and charge on the day the period ends. */
export async function planCharge(db: DB, inv: Inv, plan: string, day: string, lang: string) {
  const a = await autoOf(db, inv.lead_id);
  if (!a?.on || !inv.lead_id) return false;
  await put(db, `autocharge_${inv.id}`, day);
  const { addMessage } = await import('./rooms.js');
  const link = `https://vaxogroup.com/invoice/?t=${inv.token}`;
  await addMessage(db, inv.lead_id, 'owner', 'text', (REMIND[lang] || REMIND.en).replace('{day}', day).replace('{plan}', plan).replace('{amount}', String(inv.amount)).replace('{card}', a.card ? ` •••• ${a.card}` : '').replace('{link}', link));
  return true;
}

/** Hourly: charge the renewal invoices whose day has come, by the saved card token. A failure leaves the invoice to pay by hand. */
export async function autopaySweep(db: DB, monoToken: string | undefined, notify: Notify, origin = 'https://vaxogroup.com') {
  if (!monoToken) return;
  const today = new Date().toISOString().slice(0, 10);
  const due = (await db.prepare(`SELECT key, value FROM settings WHERE key LIKE 'autocharge_%' AND value <= ? LIMIT 20`).bind(today).all<{ key: string; value: string }>().catch(() => ({ results: [] as { key: string; value: string }[] }))).results;
  for (const r of due) {
    const id = Number(r.key.slice('autocharge_'.length));
    await db.prepare('DELETE FROM settings WHERE key = ?').bind(r.key).run();
    const inv = await db.prepare('SELECT id, number, token, amount, currency, description, status, lead_id, lang FROM invoices WHERE id = ?').bind(id).first<Inv>().catch(() => null);
    if (!inv || inv.status !== 'open') continue;
    const a = await autoOf(db, inv.lead_id);
    if (!a?.on) continue;
    const rate = inv.currency === 'UAH' ? 1 : await nbuRate(db, inv.currency, today);
    if (!rate) continue;
    const kop = Math.round(inv.amount * rate * 100);
    const name = `${inv.description} (рахунок ${inv.number})`.slice(0, 250);
    const d = await mono(monoToken, 'wallet/payment', {
      cardToken: a.token, amount: kop, ccy: 980, initiationKind: 'merchant',
      merchantPaymInfo: { reference: inv.number, destination: `VAXO · ${inv.description}, рахунок ${inv.number}`.slice(0, 280), basketOrder: [{ name, qty: 1, sum: kop, total: kop, code: inv.number, unit: 'посл.' }] },
      redirectUrl: `${origin}/invoice/?t=${inv.token}&paid=1`, webHookUrl: `${origin}/api/mono/webhook`,
    });
    if (d?.invoiceId) await db.prepare('UPDATE invoices SET mono_id = ? WHERE id = ?').bind(d.invoiceId, inv.id).run();
    else {
      await notify(`🔁 Автопродление не прошло: счёт ${inv.number} (лид #${inv.lead_id}). Клиенту ушла ссылка на ручную оплату.`).catch(() => {});
      if (inv.lead_id) {
        const { addMessage } = await import('./rooms.js');
        const t: Record<string, string> = { ru: 'Не получилось списать оплату с сохранённой карты. Оплатить можно здесь в пару касаний: {link}', ua: 'Не вдалося списати оплату зі збереженої картки. Сплатити можна тут за пару дотиків: {link}', en: 'We could not charge your saved card. You can pay here in a couple of taps: {link}' };
        await addMessage(db, inv.lead_id, 'owner', 'text', (t[inv.lang || 'en'] || t.en).replace('{link}', `${origin}/invoice/?t=${inv.token}`));
      }
    }
  }
}

/** GET/POST /api/invoice/<token>/autopay — the client sees and switches off autopay for their subscription. */
export async function autopayToggle(db: DB, request: Request, invToken: string, notify: Notify): Promise<Response> {
  const json = (s: number, b: unknown) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
  const inv = await db.prepare('SELECT id, number, token, amount, currency, description, status, lead_id, lang FROM invoices WHERE token = ?').bind(invToken).first<Inv>().catch(() => null);
  if (!inv?.lead_id || !isSubscription(inv.description)) return json(404, { ok: false });
  const a = await autoOf(db, inv.lead_id);
  if (request.method === 'POST') {
    const b = (await request.json().catch(() => ({}))) as { on?: boolean };
    if (a && b.on === false && a.on) {
      await put(db, `autopay_${inv.lead_id}`, JSON.stringify({ ...a, on: false }));
      await notify(`🔁 Лид #${inv.lead_id} отключил автопродление подписки.`).catch(() => {});
    }
    return json(200, { ok: true, on: false, card: a?.card ?? null });
  }
  return json(200, { ok: true, on: !!a?.on, card: a?.card ?? null });
}
