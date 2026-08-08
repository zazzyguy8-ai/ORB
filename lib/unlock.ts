import crypto from 'crypto'
import type { TierId } from './products'
import { isTierId } from './products'

/**
 * Stateless entitlement tokens.
 *
 * There is no database. After Stripe confirms payment we mint a short-lived
 * HMAC-signed token, hand it to the browser, and the generation endpoints
 * verify the signature on every call. Nothing to provision, nothing to keep
 * in sync, and no user account to build before the first sale.
 *
 * The tradeoff: a token is bearer-shaped. Someone who copies it out of their
 * own localStorage can hand it to a friend until it expires. That is bounded
 * by the short TTL and by the fact that the expensive part — the reading —
 * is generated once and cached client-side. When volume makes that leak worth
 * closing, back `consume()` with a KV store keyed on the Stripe session id
 * and the shape below does not change.
 */

const TTL_MS = 6 * 60 * 60 * 1000 // 6 hours: long enough to survive a bad signal, short enough to matter

export interface UnlockPayload {
  /** What was bought. */
  tier: TierId
  /** Stripe Checkout Session id — the receipt this token descends from. */
  sid: string
  /** Expiry, epoch ms. */
  exp: number
}

function secret(): string {
  const value = process.env.ORB_UNLOCK_SECRET
  if (!value || value.length < 24) {
    throw new Error(
      'ORB_UNLOCK_SECRET is missing or too short (need 24+ chars). Generate one with: openssl rand -hex 32'
    )
  }
  return value
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url')
}

function sign(body: string): string {
  return crypto.createHmac('sha256', secret()).update(body).digest('base64url')
}

/** Mint a token for a confirmed payment. */
export function issueToken(tier: TierId, stripeSessionId: string): string {
  const payload: UnlockPayload = {
    tier,
    sid: stripeSessionId,
    exp: Date.now() + TTL_MS,
  }
  const body = b64url(JSON.stringify(payload))
  return `${body}.${sign(body)}`
}

/**
 * Verify a token. Returns the payload, or null for anything that is not a
 * valid, unexpired, correctly-signed token. Never throws on bad input.
 */
export function verifyToken(token: unknown): UnlockPayload | null {
  if (typeof token !== 'string' || token.length > 2048) return null

  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [body, signature] = parts
  if (!body || !signature) return null

  let expected: string
  try {
    expected = sign(body)
  } catch {
    return null // secret not configured — fail closed
  }

  const a = Buffer.from(signature)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null

  let payload: unknown
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  } catch {
    return null
  }

  if (typeof payload !== 'object' || payload === null) return null
  const { tier, sid, exp } = payload as Record<string, unknown>

  if (!isTierId(tier)) return null
  if (typeof sid !== 'string' || sid.length === 0) return null
  if (typeof exp !== 'number' || !Number.isFinite(exp) || Date.now() > exp) return null

  return { tier, sid, exp }
}
