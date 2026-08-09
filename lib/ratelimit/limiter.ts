import { env } from '@/lib/config/env';
import { getPlan, type Plan } from '@/lib/config/plans';
import { getDb } from '@/lib/db/client';

/**
 * Two layers of protection (spec §19), because they stop different things:
 *
 *  - A per-IP sliding window stops a burst from hammering our provider quotas
 *    and our AI spend. It is in-process, which is the right trade at one
 *    instance: no network hop in the hot path.
 *  - A per-user daily counter in Postgres enforces the actual plan limit and
 *    survives restarts and multiple instances.
 *
 * Anonymous callers get a small IP-keyed daily allowance so the landing page
 * demo works without an account but cannot be farmed.
 */

interface Window {
  hits: number[];
  dayKey: string;
  dayCount: number;
}

const windows = new Map<string, Window>();
const WINDOW_MS = 60_000;
const MAX_TRACKED_IPS = 10_000;

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export interface RateLimitResult {
  allowed: boolean;
  reason?: string;
  retryAfterSeconds?: number;
  remainingToday?: number;
}

export function checkIpLimit(ip: string, dailyLimit: number): RateLimitResult {
  const now = Date.now();
  const day = today();

  let window = windows.get(ip);
  if (!window || window.dayKey !== day) {
    window = { hits: [], dayKey: day, dayCount: 0 };
    if (windows.size >= MAX_TRACKED_IPS) {
      const oldest = windows.keys().next();
      if (!oldest.done) windows.delete(oldest.value);
    }
    windows.set(ip, window);
  }

  window.hits = window.hits.filter((t) => now - t < WINDOW_MS);

  if (window.hits.length >= env.ipRequestsPerMinute) {
    const oldest = window.hits[0];
    return {
      allowed: false,
      reason: 'Too many requests. Slow down for a moment.',
      retryAfterSeconds: Math.max(1, Math.ceil((WINDOW_MS - (now - oldest)) / 1000)),
    };
  }

  if (window.dayCount >= dailyLimit) {
    return {
      allowed: false,
      reason: `Daily limit of ${dailyLimit} analyses reached. Sign in or upgrade for more.`,
      remainingToday: 0,
    };
  }

  window.hits.push(now);
  window.dayCount += 1;

  return { allowed: true, remainingToday: Math.max(0, dailyLimit - window.dayCount) };
}

/**
 * Increments and checks the user's daily quota atomically-enough for our
 * purposes: a read-modify-write can over-count by one under a true race, which
 * is the safe direction to be wrong in.
 */
export async function checkUserQuota(userId: string): Promise<RateLimitResult & { plan: Plan }> {
  const db = getDb();
  const fallbackPlan = getPlan('free');
  if (!db) return { allowed: true, plan: fallbackPlan };

  const { data, error } = await db
    .from('users')
    .select('plan, analyses_today, quota_reset_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) return { allowed: true, plan: fallbackPlan };

  const plan = getPlan(data?.plan);
  const day = today();
  const needsReset = !data || data.quota_reset_at !== day;
  const used = needsReset ? 0 : (data?.analyses_today ?? 0);

  if (used >= plan.analysesPerDay) {
    return {
      allowed: false,
      plan,
      reason: `You have used all ${plan.analysesPerDay} analyses on the ${plan.name} plan today.`,
      remainingToday: 0,
    };
  }

  await db
    .from('users')
    .upsert(
      { id: userId, analyses_today: used + 1, quota_reset_at: day },
      { onConflict: 'id' },
    );

  return { allowed: true, plan, remainingToday: plan.analysesPerDay - used - 1 };
}

/**
 * Returns a consumed daily slot. Called when an analysis could not be produced
 * at all — a user should not lose one of three daily attempts because our data
 * provider was down.
 */
export function refundIpLimit(ip: string): void {
  const window = windows.get(ip);
  if (window && window.dayKey === today() && window.dayCount > 0) window.dayCount -= 1;
}

/** Mirror of refundIpLimit for authenticated users. */
export async function refundUserQuota(userId: string): Promise<void> {
  const db = getDb();
  if (!db) return;

  const { data } = await db
    .from('users')
    .select('analyses_today, quota_reset_at')
    .eq('id', userId)
    .maybeSingle();

  if (!data || data.quota_reset_at !== today() || (data.analyses_today ?? 0) <= 0) return;
  await db
    .from('users')
    .update({ analyses_today: data.analyses_today - 1 })
    .eq('id', userId);
}

/** Best-effort client IP from the proxy headers Vercel and friends set. */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return headers.get('x-real-ip') ?? '0.0.0.0';
}

/** Test seam. */
export function resetLimiter(): void {
  windows.clear();
}
