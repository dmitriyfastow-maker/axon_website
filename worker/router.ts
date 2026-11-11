// Smart router (Decisions 39, 40): who gets which model, and where the money for it comes from.
// Guests stay on free Workers AI; signed-in free accounts get Claude Haiku under hard caps; paying clients get the strong
// model for hard messages from a shared pool (POOL_SHARE of every plan price). Details in Decision 50.
// Without ANTHROPIC_API_KEY nothing here runs, so turning it on is one secret, and turning it off is deleting that secret.
import Anthropic from '@anthropic-ai/sdk';
import type { DB } from './partner.js';

type Tier = { model: string; effort: 'medium' | 'high'; price: number };

// Decision 50 (10.11.2026): everyone signed in gets Claude, guests get the free Workers AI models. The router picks the
// model per message: an easy message goes to Claude Haiku 5.5 (about $0.001 a message), a hard one to the plan's strong
// model. Free accounts get Haiku only, under a monthly cap per account AND per network (so many accounts from one place
// share one cap) and a cap for all free users together; past any cap the reply comes from the free models.
const HAIKU = 'claude-haiku-5-5';
export const TIERS: Record<string, Tier> = {
  personal: { model: 'claude-sonnet-5-5', effort: 'medium', price: 19 },
  care: { model: 'claude-sonnet-5-5', effort: 'medium', price: 39 },
  growth: { model: 'claude-sonnet-5-5', effort: 'high', price: 129 },
  pro: { model: 'claude-opus-5-5', effort: 'high', price: 299 },
};
export const EASY: Tier = { model: HAIKU, effort: 'medium', price: 0 };
// The worst month of a plan is the first paid one through a partner: 50% partner, about 2% acquiring, 5% tax, 43% left.
// 40% goes to the pool, 3% stays for servers, so that month closes at about zero.
export const POOL_SHARE = 0.4;
/** Free plan: what one account, one network and all free users together may cost a month, in USD. */
export const FREE_CAP = { user: 0.5, ip: 1.5, all: 30 };

// USD per 1M tokens: input, output, cache read, cache write (5 minutes). Anthropic price list (Haiku: prompts ≤100K).
const PRICE: Record<string, [number, number, number, number]> = {
  'claude-haiku-5-5': [0.1, 0.5, 0.01, 0.125],
  'claude-sonnet-5-5': [2, 10, 0.2, 2.5],
  'claude-opus-5-5': [4, 20, 0.2, 5],
  'claude-sonnet-5': [2, 10, 0.2, 2.5],
  'claude-opus-5': [5, 25, 0.5, 6.25],
};

export type Usage = { input_tokens?: number | null; output_tokens?: number | null; cache_read_input_tokens?: number | null; cache_creation_input_tokens?: number | null };

export function costUsd(model: string, u: Usage): number {
  const [i, o, r, w] = PRICE[model] ?? [0, 0, 0, 0];
  return ((u.input_tokens ?? 0) * i + (u.output_tokens ?? 0) * o + (u.cache_read_input_tokens ?? 0) * r + (u.cache_creation_input_tokens ?? 0) * w) / 1e6;
}

/** What the paying clients of this month put into the pool, in USD. */
export const monthPool = (plans: string[]) => plans.reduce((sum, p) => sum + (TIERS[p]?.price ?? 0) * POOL_SHARE, 0);

const HARD = /сайт|лендинг|сторінк|страниц|стратег|финмодел|фінмодел|бизнес-?план|бізнес-?план|договор|контракт|юрид|анализ|аналіз|разбер|розбер|код|програм|приложени|застосун|маркетинг|реклам|ролик|сценари|сценарі|воронк|презентац|исследован|дослідж|website|landing|strategy|financial|business plan|contract|legal|analy[sz]|code|app\b|marketing|campaign|script|funnel|research|presentation/i;
/** A hard message gets the strong model: a deep answer, a long or file-backed message, or real work words. */
export function isHard(text: string, deep = false, files = false): boolean {
  return deep || files || text.length > 400 || HARD.test(text);
}

export type Spend = { lead: number; all: number; pool: number; user?: number; ip?: number; free?: number };
/** The models a paid client may pick by hand. New versions go on top; older ones move to "Other models" in the cabinet. */
export const CATALOG: Record<string, Tier> = {
  'opus-5-5': { model: 'claude-opus-5-5', effort: 'high', price: 0 },
  'sonnet-5-5': { model: 'claude-sonnet-5-5', effort: 'high', price: 0 },
  'haiku-5-5': EASY,
  'opus-5': { model: 'claude-opus-5', effort: 'high', price: 0 },
  'sonnet-5': { model: 'claude-sonnet-5', effort: 'high', price: 0 },
};
const LEGACY: Record<string, string> = { fast: 'haiku-5-5', strong: 'sonnet-5-5', max: 'opus-5-5' };
const MID = /напиш|текст|пост|письм|лист|план|перевед|переклад|резюме|объясн|поясн|сравн|порівн|посчитай|порахуй|идеи|ідеї|write|draft|post|letter|email|plan|translate|explain|compare|calculate|ideas|summar/i;
/** 0 = easy (a short question), 1 = ordinary work (a text, a plan), 2 = hard (a site, a strategy, a contract, ads, files). */
export function taskLevel(text: string, deep = false, files = false): 0 | 1 | 2 {
  if (isHard(text, deep, files)) return 2;
  return text.length > 140 || MID.test(text) ? 1 : 0;
}
/** Auto on every paid plan: easy → Haiku 5.5, ordinary work → Sonnet 5.5, hard → Opus 5.5 (the plans differ by volume,
 *  not by quality). A paid client may pick a model by hand; a pricier one simply uses the monthly budget faster. */
export function pickModel(plan: string, trial: boolean, level: number, choice: string, s: Spend, hasKey: boolean): Tier | null {
  const base = pickTier(plan, trial, level > 0, s, hasKey);
  if (!base || !TIERS[plan] || trial) return base; // free: Haiku or the free models, no choice
  if (base === EASY && level > 0) return EASY; // the month's pool is used up: keep answering on the fast model
  const picked = CATALOG[LEGACY[choice] || choice];
  if (picked) return picked;
  return level >= 2 ? CATALOG['opus-5-5'] : level === 1 ? CATALOG['sonnet-5-5'] : EASY;
}
/** The whole decision, with no I/O: null means free Workers AI. */
export function pickTier(plan: string, trial: boolean, hard: boolean, s: Spend, hasKey: boolean): Tier | null {
  if (!hasKey) return null;
  const t = TIERS[plan];
  if (!t || trial) {
    // Free (or trial): Haiku while the account, its network and all free users are under their monthly caps.
    if ((s.user ?? 0) >= FREE_CAP.user || (s.ip ?? 0) >= FREE_CAP.ip || (s.free ?? 0) >= FREE_CAP.all) return null;
    return EASY;
  }
  // The client's own monthly budget is enforced by the workspace limits; here only the safety net: the month's pool of all
  // paying clients, and one client never past half their price in AI.
  if (s.lead >= t.price * 0.5) return null;
  if (s.all >= s.pool) return EASY;
  return hard ? t : EASY;
}

let apiKey = '';
export function configureRouter(key?: string) { apiKey = key?.trim() || ''; }

const month = () => new Date().toISOString().slice(0, 7);
const ipLedger = (ipKey: string) => `freeip_${ipKey}_${month()}`;

/** The ledger row a reply is charged to: the lead for paying clients, minus the client id for free accounts. */
export type Route = { tier: Tier; ledger: number; ipKey?: string };

export async function routeFor(db: DB, o: { leadId: number | null; clientId: number; plan: string; trial: boolean; hard?: boolean; level?: number; ipKey?: string; choice?: string }): Promise<Route | null> {
  if (!apiKey) return null;
  const m = month();
  const paid = !!TIERS[o.plan] && !o.trial && !!o.leadId;
  const ledger = paid ? (o.leadId as number) : -o.clientId;
  const one = async (id: number) => (await db.prepare('SELECT usd FROM api_usage WHERE lead_id = ? AND month = ?').bind(id, m).first<{ usd: number }>().catch(() => null))?.usd ?? 0;
  const all = await db.prepare('SELECT COALESCE(SUM(usd), 0) AS usd, COALESCE(SUM(CASE WHEN lead_id < 0 THEN usd ELSE 0 END), 0) AS free FROM api_usage WHERE month = ?').bind(m).first<{ usd: number; free: number }>().catch(() => null);
  if (!all) return null; // the table is missing: spend nothing we cannot count
  let s: Spend;
  if (paid) {
    const paying = (await db.prepare(`SELECT l.plan FROM leads l WHERE l.plan IN ('personal', 'care', 'growth', 'pro') AND EXISTS (SELECT 1 FROM invoices i WHERE i.lead_id = l.id AND i.status = 'paid' AND i.at > datetime('now', '-35 days'))`).all<{ plan: string }>().catch(() => ({ results: [] as { plan: string }[] }))).results;
    s = { lead: await one(ledger), all: all.usd - all.free, pool: monthPool(paying.map((r) => r.plan)) };
  } else {
    const ip = o.ipKey ? Number((await db.prepare('SELECT value FROM settings WHERE key = ?').bind(ipLedger(o.ipKey)).first<{ value: string }>().catch(() => null))?.value || 0) : 0;
    s = { lead: 0, all: 0, pool: 0, user: await one(ledger), ip, free: all.free };
  }
  const tier = pickModel(o.plan, o.trial || !paid, o.level ?? (o.hard ? 2 : 0), o.choice || 'auto', s, true);
  return tier ? { tier, ledger, ipKey: paid ? undefined : o.ipKey } : null;
}

/** One reply from Claude, or null, and then the caller uses the free models. */
export async function claudeReply(db: DB, route: Route, system: string, messages: { role: string; content: string }[], onCost?: (usd: number) => void): Promise<string | null> {
  const { tier } = route;
  try {
    const client = new Anthropic({ apiKey });
    const haiku = tier.model === HAIKU; // Haiku has no server-side fallback
    const r = await client.beta.messages.create({
      model: tier.model,
      max_tokens: 4000,
      ...(haiku ? {} : { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }),
      output_config: { effort: tier.effort },
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' as const : 'user' as const, content: m.content })),
    } as never) as unknown as { stop_reason: string; usage: Usage; content: { type: string; text?: string }[] };
    const usd = costUsd(tier.model, r.usage);
    onCost?.(usd);
    await db.prepare(`INSERT INTO api_usage (lead_id, month, usd) VALUES (?, ?, ?) ON CONFLICT (lead_id, month) DO UPDATE SET usd = usd + excluded.usd`)
      .bind(route.ledger, month(), usd).run();
    if (route.ipKey) {
      const k = ipLedger(route.ipKey);
      const prev = Number((await db.prepare('SELECT value FROM settings WHERE key = ?').bind(k).first<{ value: string }>().catch(() => null))?.value || 0);
      await db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind(k, String(prev + usd)).run();
    }
    if (r.stop_reason === 'refusal') return null;
    return r.content.filter((b) => b.type === 'text').map((b) => b.text).join('').trim() || null;
  } catch (e) {
    console.error('[claude]', e);
    return null;
  }
}
