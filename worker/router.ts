// Smart router (Decisions 39, 40): who gets which model, and where the money for it comes from.
// Guests, the free plan and trial months stay on free Workers AI. Paying clients get Claude at full quality from a shared
// pool: every paying client adds POOL_SHARE of their plan price, and active clients use what quiet ones leave. Two limits
// remain: one client never costs more than their plan price, and spending stops when the pool of the month is empty.
// Without ANTHROPIC_API_KEY nothing here runs, so turning it on is one secret, and turning it off is deleting that secret.
import Anthropic from '@anthropic-ai/sdk';
import type { DB } from './partner.js';

type Tier = { model: string; effort: 'medium' | 'high'; price: number };

export const TIERS: Record<string, Tier> = {
  care: { model: 'claude-sonnet-5-5', effort: 'medium', price: 39 },
  growth: { model: 'claude-sonnet-5-5', effort: 'high', price: 129 },
  pro: { model: 'claude-opus-5-5', effort: 'high', price: 299 },
};
// The worst month of a plan is the first paid one through a partner: 50% partner, about 2% acquiring, 5% tax, 43% left.
// 40% goes to the pool, 3% stays for servers, so that month closes at about zero. A two-level partner chain (+10%) can
// go slightly below it if the client uses their whole share; research/decision-40-workspace.md has the numbers.
export const POOL_SHARE = 0.4;

// USD per 1M tokens: input, output, cache read, cache write (5 minutes). Anthropic price list, 2026-10.
const PRICE: Record<string, [number, number, number, number]> = {
  'claude-sonnet-5-5': [2, 10, 0.2, 2.5],
  'claude-opus-5-5': [4, 20, 0.2, 5],
};

export type Usage = { input_tokens?: number | null; output_tokens?: number | null; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null };

export function costUsd(model: string, u: Usage): number {
  const [i, o, r, w] = PRICE[model] ?? [0, 0, 0, 0];
  return ((u.input_tokens ?? 0) * i + (u.output_tokens ?? 0) * o + (u.cache_read_input_tokens ?? 0) * r + (u.cache_creation_input_tokens ?? 0) * w) / 1e6;
}

/** What the paying clients of this month put into the pool, in USD. */
export const monthPool = (plans: string[]) => plans.reduce((sum, p) => sum + (TIERS[p]?.price ?? 0) * POOL_SHARE, 0);

/** The whole decision, with no I/O: null means free Workers AI. */
export function pickTier(plan: string, trial: boolean, spentByLead: number, spentByAll: number, pool: number, hasKey: boolean): Tier | null {
  const t = TIERS[plan];
  if (!hasKey || !t || trial || spentByLead >= t.price || spentByAll >= pool) return null;
  return t;
}

let apiKey = '';
export function configureRouter(key?: string) { apiKey = key?.trim() || ''; }

const month = () => new Date().toISOString().slice(0, 7);

export async function routeFor(db: DB, leadId: number, plan: string, trial: boolean): Promise<Tier | null> {
  if (!apiKey || !TIERS[plan] || trial) return null;
  const m = month();
  const lead = await db.prepare('SELECT usd FROM api_usage WHERE lead_id = ? AND month = ?').bind(leadId, m).first<{ usd: number }>().catch(() => null);
  const all = await db.prepare('SELECT COALESCE(SUM(usd), 0) AS usd FROM api_usage WHERE month = ?').bind(m).first<{ usd: number }>().catch(() => null);
  if (!all) return null; // the table is missing: spend nothing we cannot count
  const paying = (await db.prepare(`SELECT l.plan FROM leads l WHERE l.plan IN ('care', 'growth', 'pro') AND EXISTS (SELECT 1 FROM invoices i WHERE i.lead_id = l.id AND i.status = 'paid' AND i.at > datetime('now', '-35 days'))`).all<{ plan: string }>().catch(() => ({ results: [] as { plan: string }[] }))).results;
  return pickTier(plan, trial, lead?.usd ?? 0, all.usd, monthPool(paying.map((r) => r.plan)), true);
}

/** One reply from Claude, or null, and then the caller uses the free models. */
export async function claudeReply(db: DB, leadId: number, tier: Tier, system: string, messages: { role: string; content: string }[], onCost?: (usd: number) => void): Promise<string | null> {
  try {
    const client = new Anthropic({ apiKey });
    const r = await client.beta.messages.create({
      model: tier.model,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: tier.effort },
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' as const : 'user' as const, content: m.content })),
    } as never) as unknown as { stop_reason: string; usage: Usage; content: { type: string; text?: string }[] };
    const usd = costUsd(tier.model, r.usage);
    onCost?.(usd);
    await db.prepare(`INSERT INTO api_usage (lead_id, month, usd) VALUES (?, ?, ?) ON CONFLICT (lead_id, month) DO UPDATE SET usd = usd + excluded.usd`)
      .bind(leadId, month(), usd).run();
    if (r.stop_reason === 'refusal') return null;
    return r.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim() || null;
  } catch (e) {
    console.error('[claude]', e);
    return null;
  }
}
