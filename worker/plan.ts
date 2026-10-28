// "🔮 Планы и прогноз" in the CRM: Claude's current plan with the reasons behind it (written by Claude with
// scripts/plan.py into settings.claude_plan), and a forecast computed from the real numbers, with how it is computed.
import type { DB } from './partner.js';
import { settings } from './autopilot.js';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

/** Simple, explainable forecast: the pace of the last 30 days carried forward (no magic). */
async function forecast(db: DB) {
  const r = (await db.prepare(`SELECT
      (SELECT COUNT(*) FROM leads WHERE created_at > datetime('now','-30 days') AND COALESCE(page,'') != 'test' AND contact NOT LIKE 'test%') AS leads30,
      (SELECT COUNT(*) FROM leads WHERE status = 'won' AND updated_at > datetime('now','-30 days')) AS won30,
      (SELECT COALESCE(SUM(amount_uah),0) FROM payments WHERE status='ok' AND at >= date('now','start of month')) AS month_uah,
      (SELECT COALESCE(SUM(amount_uah),0) FROM payments WHERE status='ok' AND at > date('now','-30 days')) AS uah30,
      (SELECT COUNT(*) FROM pageviews WHERE at > datetime('now','-30 days')) AS views30,
      (SELECT COUNT(*) FROM pageviews WHERE at > datetime('now','-7 days')) AS views7,
      CAST(strftime('%d','now') AS INTEGER) AS day, CAST(strftime('%d', date('now','start of month','+1 month','-1 day')) AS INTEGER) AS days`)
    .first<Record<string, number>>()) ?? {};
  const conv = r.leads30 ? r.won30 / r.leads30 : 0;
  return {
    leads_month: Math.round((r.leads30 || 0)), leads_quarter: Math.round((r.leads30 || 0) * 3),
    won_month: Math.round(r.won30 || 0), conv: Math.round(conv * 1000) / 10,
    revenue_month_end: Math.round(r.day ? (r.month_uah || 0) / r.day * r.days : 0), revenue_30: Math.round(r.uah30 || 0),
    views_month: Math.round((r.views7 || 0) / 7 * 30), views30: r.views30 || 0,
    how: 'Прогноз = темп последних 30 дней, перенесённый вперёд: заявки и клиенты за 30 дней; выручка месяца = заработано с 1-го числа ÷ прошедшие дни × дни в месяце; визиты = последние 7 дней × 30/7. Это ориентир, не обещание: появятся данные — станет точнее.',
  };
}

/** GET /api/admin/plan → { plan, forecast } */
export async function handlePlan(db: DB, request: Request): Promise<Response> {
  if (request.method !== 'GET') return json(405, { ok: false });
  let plan: unknown = null;
  try { plan = JSON.parse((await settings(db)).claude_plan || 'null'); } catch {}
  return json(200, { ok: true, plan, forecast: await forecast(db) });
}
