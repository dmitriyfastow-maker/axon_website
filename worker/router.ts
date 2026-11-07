// Smart router (Decision 39): who gets which model, with a hard money limit.
// Guests, the free plan and trial months stay on free Workers AI. A paying client gets Claude until their monthly
// budget runs out, then free models again. All of Vaxo stops spending at MONTH_CAP. Without ANTHROPIC_API_KEY nothing
// here runs, so turning it on is one secret, and turning it off is deleting that secret.
import Anthropic from '@anthropic-ai/sdk';
import type { DB } from './partner.js';

type Tier = { model: string; effort: 'low' | 'medium'; budget: number };

// USD per month and client. Far below the plan price on purpose: this is the part of the fee that may go to tokens.
export const TIERS: Record<string, Tier> = {
  care: { model: 'claude-sonnet-5-5', effort: 'low', budget: 8 },
  growth: { model: 'claude-sonnet-5-5', effort: 'low', budget: 25 },
  pro: { model: 'claude-opus-5-5', effort: 'medium', budget: 60 },
};
export const MONTH_CAP = 50; // all clients together; raise it when revenue allows

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

/** The whole decision, with no I/O: null means free Workers AI. */
export function pickTier(plan: string, trial: boolean, spentByLead: number, spentByAll: number, hasKey: boolean): Tier | null {
  const t = TIERS[plan];
  if (!hasKey || !t || trial || spentByLead >= t.budget || spentByAll >= MONTH_CAP) return null;
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
  return pickTier(plan, trial, lead?.usd ?? 0, all.usd, true);
}

/** One reply from Claude, or null, and then the caller uses the free models. */
export async function claudeReply(db: DB, leadId: number, tier: Tier, system: string, messages: { role: string; content: string }[]): Promise<string | null> {
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
    await db.prepare(`INSERT INTO api_usage (lead_id, month, usd) VALUES (?, ?, ?) ON CONFLICT (lead_id, month) DO UPDATE SET usd = usd + excluded.usd`)
      .bind(leadId, month(), costUsd(tier.model, r.usage)).run();
    if (r.stop_reason === 'refusal') return null;
    return r.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim() || null;
  } catch (e) {
    console.error('[claude]', e);
    return null;
  }
}
