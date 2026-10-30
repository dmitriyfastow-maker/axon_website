// Template shop checkout (/shop/): POST /api/shop/buy {slug, email, lang} creates a card invoice and returns the mono
// payment page. When mono confirms the payment (mono.ts → shopOnPaid) the buyer gets an email with a download link;
// GET /api/shop/dl?t=<invoice token> serves the file from private KV keys shop/<slug> only for a paid invoice.
import type { DB } from './partner.js';
import type { Notify } from './deals.js';
import type { KV } from './files.js';
import { monoPay } from './mono.js';
import { sendMail } from './mail.js';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const hex = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => b.toString(16).padStart(2, '0')).join('');

/** Must match src/components/ShopPage.astro (slug, price). */
export const SHOP: Record<string, { name: string; price: number; file: string }> = {
  'ai-prompt-pack': { name: 'AI Prompt Pack for Small Business', price: 12, file: 'AI-Prompt-Pack-for-Small-Business.pdf' },
  'lead-tracker': { name: 'Lead & Client Tracker', price: 9, file: 'Small-Business-Lead-Tracker.xlsx' },
  'message-templates': { name: 'Customer Message Templates', price: 9, file: 'Customer-Message-Templates.pdf' },
  'marketing-workbook': { name: '90-Day Marketing Plan Workbook', price: 12, file: '90-Day-Marketing-Plan-Workbook.pdf' },
  'faq-builder': { name: 'AI Chatbot FAQ Builder', price: 12, file: 'AI-Chatbot-FAQ-Builder.pdf' },
  'pricing-calculator': { name: 'Service Pricing & Quote Calculator', price: 12, file: 'Service-Pricing-Quote-Calculator.xlsx' },
  'content-calendar': { name: 'Social Media Content Calendar', price: 9, file: 'Social-Media-Content-Calendar.xlsx' },
  'weekly-kpi': { name: 'Weekly Planner & KPI Tracker', price: 9, file: 'Weekly-Planner-KPI-Tracker.xlsx' },
  'review-kit': { name: 'Customer Review Request Kit', price: 9, file: 'Customer-Review-Request-Kit.pdf' },
  'onboarding-kit': { name: 'Client Onboarding Kit', price: 9, file: 'Client-Onboarding-Kit.pdf' },
  'payment-kit': { name: 'Get Paid On Time Kit', price: 9, file: 'Get-Paid-On-Time-Kit.pdf' },
  'job-kit': { name: 'Booking & Job Checklist Pack', price: 9, file: 'Booking-and-Job-Checklist-Pack.pdf' },
  bundle: { name: 'All 12 Vaxo templates (bundle)', price: 67, file: 'Vaxo-12-Templates-Bundle.zip' },
};
const PREFIX = 'Vaxo template: ';

export async function handleShopBuy(db: DB, request: Request, monoToken: string | undefined, notify: Notify, origin: string): Promise<Response> {
  if (request.method !== 'POST') return json(405, { ok: false });
  const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const slug = String(b.slug || ''), p = SHOP[slug];
  const email = typeof b.email === 'string' ? b.email.trim().slice(0, 120) : '';
  const lang = ['en', 'ru', 'ua'].includes(String(b.lang)) ? String(b.lang) : 'en';
  if (!p || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(400, { ok: false, error: 'fields' });
  if (!monoToken) return json(503, { ok: false, error: 'card_off' });
  const lead = await db
    .prepare(`INSERT INTO leads (mode, name, contact, interest, message, lang, page, room, status, email_addr, source) VALUES ('request', ?, ?, 'shop', ?, ?, '/shop/', ?, 'new', ?, ?)`)
    .bind(email.split('@')[0], email, `Shop: ${p.name}`, lang, hex(12), email, typeof b.src === 'string' ? b.src.slice(0, 80) : 'shop')
    .run();
  const leadId = Number((lead as { meta?: { last_row_id?: number } }).meta?.last_row_id) || null;
  const year = new Date().getUTCFullYear();
  const n = ((await db.prepare(`SELECT COUNT(*) AS n FROM invoices WHERE number LIKE ?`).bind(`VX-${year}-%`).first<{ n: number }>())?.n ?? 0) + 1;
  const number = `VX-${year}-${String(n).padStart(4, '0')}`, token = hex(16);
  await db
    .prepare(`INSERT INTO invoices (number, token, lead_id, buyer, currency, amount, description, part, lang, due) VALUES (?, ?, ?, ?, 'USD', ?, ?, 'product', ?, date('now', '+2 days'))`)
    .bind(number, token, leadId, email, p.price, PREFIX + p.name, lang)
    .run();
  await notify(`🛒 Магазин: ${email} открыл оплату «${p.name}» $${p.price}, счёт ${number}.`).catch(() => {});
  return monoPay(db, monoToken, token, origin);
}

/** Called by mono.ts after a card invoice is paid: email the download link for shop invoices. */
export async function shopOnPaid(db: DB, invoiceId: number, notify: Notify) {
  const inv = await db.prepare(`SELECT i.token, i.description, i.lang, l.email_addr FROM invoices i LEFT JOIN leads l ON l.id = i.lead_id WHERE i.id = ?`).bind(invoiceId).first<{ token: string; description: string; lang: string | null; email_addr: string | null }>();
  if (!inv?.description?.startsWith(PREFIX) || !inv.email_addr) return;
  const name = inv.description.slice(PREFIX.length);
  const link = `https://vaxogroup.com/api/shop/dl?t=${inv.token}`;
  const L = inv.lang === 'ru'
    ? { s: `Ваш шаблон: ${name}`, t: `Спасибо за покупку! Скачать «${name}»: ${link}\nСсылка постоянная — сохраните письмо. Вопросы — просто ответьте на него.` }
    : inv.lang === 'ua'
      ? { s: `Ваш шаблон: ${name}`, t: `Дякуємо за покупку! Завантажити «${name}»: ${link}\nПосилання постійне — збережіть лист. Питання — просто дайте відповідь на нього.` }
      : { s: `Your template: ${name}`, t: `Thank you for your purchase! Download “${name}”: ${link}\nThe link is permanent — keep this email. Questions? Just reply.` };
  await sendMail(inv.email_addr, L.s, L.t).catch(() => false);
  await notify(`🛒 Продажа: «${name}» — ${inv.email_addr}, ссылка на файл отправлена.`).catch(() => {});
}

export async function handleShopDownload(db: DB, kv: KV | undefined, request: Request): Promise<Response> {
  const t = new URL(request.url).searchParams.get('t') || '';
  if (!kv || !/^[a-f0-9]{32}$/.test(t)) return new Response('Not found', { status: 404 });
  const inv = await db.prepare(`SELECT description, status FROM invoices WHERE token = ?`).bind(t).first<{ description: string; status: string }>();
  if (!inv || inv.status !== 'paid' || !inv.description.startsWith(PREFIX)) return new Response('Not found', { status: 404 });
  const entry = Object.entries(SHOP).find(([, p]) => PREFIX + p.name === inv.description);
  if (!entry) return new Response('Not found', { status: 404 });
  const { value } = await kv.getWithMetadata(`shop/${entry[0]}`, 'stream');
  if (!value) return new Response('Not found', { status: 404 });
  return new Response(value, { headers: { 'Content-Type': 'application/octet-stream', 'Content-Disposition': `attachment; filename="${entry[1].file}"`, 'Cache-Control': 'private, no-store' } });
}
