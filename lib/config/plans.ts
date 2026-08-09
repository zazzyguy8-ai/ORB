/**
 * Plan definitions (spec §22).
 *
 * Pricing lives here and only here — nothing else in the codebase may hardcode
 * a number of euros or a daily limit. Testing €29/€49/€79 later is an env
 * change, not a code change.
 */

export type PlanId = 'free' | 'pro';

export interface Plan {
  id: PlanId;
  name: string;
  /** Cents, so no floating point ever touches a price. */
  priceCents: number;
  currency: 'EUR';
  analysesPerDay: number;
  historyDays: number;
  features: string[];
  telegramAlerts: boolean;
  /** Whether the plan gets the shorter provider deadlines. */
  priorityLatency: boolean;
}

function centsFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : fallback;
}

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export function getPlans(): Record<PlanId, Plan> {
  return {
    free: {
      id: 'free',
      name: 'Free',
      priceCents: 0,
      currency: 'EUR',
      analysesPerDay: intFromEnv('FREE_ANALYSES_PER_DAY', 10),
      historyDays: 7,
      features: ['Full BUY / WATCH / AVOID analysis', 'Risk flags', '7-day history'],
      telegramAlerts: false,
      priorityLatency: false,
    },
    pro: {
      id: 'pro',
      name: 'Pro',
      priceCents: centsFromEnv('PRO_PRICE_CENTS', 1900),
      currency: 'EUR',
      analysesPerDay: intFromEnv('PRO_ANALYSES_PER_DAY', 500),
      historyDays: 365,
      features: [
        'Everything in Free',
        'Higher daily limits',
        'Priority analysis queue',
        'Full analysis history',
        'Telegram alerts',
        'Advanced filters',
      ],
      telegramAlerts: true,
      priorityLatency: true,
    },
  };
}

export function getPlan(id: PlanId | string | null | undefined): Plan {
  const plans = getPlans();
  return id === 'pro' ? plans.pro : plans.free;
}

export function formatPrice(plan: Plan): string {
  if (plan.priceCents === 0) return 'Free';
  const euros = plan.priceCents / 100;
  return `€${euros % 1 === 0 ? euros.toFixed(0) : euros.toFixed(2)}/month`;
}
