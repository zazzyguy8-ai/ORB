/**
 * Single-use claim store.
 *
 * A payment receipt — a Stripe session id or a Solana transaction signature —
 * is public. Anyone who sees one could otherwise replay it and unlock the
 * product for free. This module burns each receipt exactly once.
 *
 * Backed by Upstash Redis over plain REST, so there is no client library and
 * no connection pool to babysit in a serverless function. Two env vars and
 * it is live:
 *
 *   UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
 *   UPSTASH_REDIS_REST_TOKEN=...
 *
 * When it is not configured, `claimOnce` reports `unavailable`. Callers decide
 * what that means per rail: the Stripe rail lets it through (Stripe itself is
 * the source of truth and the session id is only visible to the buyer), the
 * Solana rail refuses (transaction signatures are visible to the whole chain).
 */

const CLAIM_TTL_SECONDS = 60 * 60 * 24 * 90 // 90 days

export type ClaimResult = 'claimed' | 'already-claimed' | 'unavailable'

export function claimsEnabled(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  )
}

/**
 * Attempt to burn `receipt`. Returns `claimed` the first time and
 * `already-claimed` on every attempt after that.
 */
export async function claimOnce(receipt: string): Promise<ClaimResult> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return 'unavailable'

  const key = `cultscan:claim:${receipt}`

  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      // SET key value NX EX ttl — atomic "create if absent".
      body: JSON.stringify(['SET', key, String(Date.now()), 'NX', 'EX', String(CLAIM_TTL_SECONDS)]),
      cache: 'no-store',
    })
  } catch {
    return 'unavailable'
  }

  if (!response.ok) return 'unavailable'

  let body: unknown
  try {
    body = await response.json()
  } catch {
    return 'unavailable'
  }

  const result = (body as { result?: unknown } | null)?.result
  // Upstash returns "OK" when the key was set, null when NX blocked it.
  if (result === 'OK') return 'claimed'
  if (result === null) return 'already-claimed'
  return 'unavailable'
}
