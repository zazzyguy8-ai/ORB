import { NextRequest, NextResponse } from 'next/server'
import { TIERS, type TierId } from '@/lib/products'
import { resolvePaidSession, stripeConfigured } from '@/lib/stripe'
import { verifyUsdcPayment, solanaConfigured, isPlausibleSignature } from '@/lib/solana'
import { claimOnce, claimsEnabled } from '@/lib/claims'
import { issueToken } from '@/lib/unlock'
import { readBody, apiError } from '@/lib/request'

export const maxDuration = 30

/**
 * Turn a payment receipt into an unlock token. Two rails land here.
 *
 * CARD (Stripe) — the receipt is a Checkout Session id, which only ever
 * appears in the buyer's own redirect URL. Stripe is the source of truth for
 * whether it was paid, and a re-visit is a legitimate thing a buyer does, so
 * this rail is deliberately re-runnable.
 *
 * USDC (Solana) — the receipt is a transaction signature, which is public to
 * anyone reading the chain. This rail must be single-use, so it requires the
 * claim store and refuses to run without it. Better to turn the rail off than
 * to hand out free unlocks to whoever is watching the address.
 */
export async function POST(req: NextRequest) {
  const body = await readBody(req)
  if (!body) return apiError('Malformed request body.', 400)

  if (body.method === 'stripe') return unlockWithStripe(body)
  if (body.method === 'solana') return unlockWithSolana(body)
  return apiError('Unknown payment method.', 400)
}

async function unlockWithStripe(body: Record<string, unknown>) {
  if (!stripeConfigured()) {
    return apiError('Card payments are not configured on this deployment.', 503)
  }

  const sessionId = body.sessionId
  if (typeof sessionId !== 'string' || sessionId.length === 0 || sessionId.length > 200) {
    return apiError('Missing checkout session.', 400)
  }

  let paid: { tier: TierId; sessionId: string } | null
  try {
    paid = await resolvePaidSession(sessionId)
  } catch (error: unknown) {
    console.error('stripe session lookup failed:', error)
    return apiError('Could not reach Stripe. Try reloading in a moment.', 502)
  }

  if (!paid) {
    return apiError(
      'That checkout has not completed. If you were charged, reload this page — Stripe can take a few seconds.',
      402
    )
  }

  return NextResponse.json({
    token: issueToken(paid.tier, paid.sessionId),
    tier: paid.tier,
  })
}

async function unlockWithSolana(body: Record<string, unknown>) {
  if (!solanaConfigured()) {
    return apiError('USDC payments are not configured on this deployment.', 503)
  }
  if (!claimsEnabled()) {
    // Fail closed. A public signature with no way to burn it is a free unlock
    // for anyone watching the receiving address.
    return apiError(
      'USDC payments are temporarily unavailable. Use the card option, or contact support.',
      503
    )
  }

  const signature = body.signature
  if (!isPlausibleSignature(signature)) {
    return apiError('That does not look like a Solana transaction signature.', 400)
  }

  // Verify against the cheapest tier, then grant whatever the amount actually
  // covers. Someone who sends the arsenal price gets the arsenal, whichever
  // button they happened to click.
  const result = await verifyUsdcPayment(signature, TIERS.scan)
  if (!result.ok) return apiError(result.reason, 402)

  const tier: TierId =
    result.paid * 1_000_000 >= TIERS.arsenal.usdcAmount ? 'arsenal' : 'scan'

  const claim = await claimOnce(`sol:${signature}`)
  if (claim === 'already-claimed') {
    return apiError(
      'That transaction has already been redeemed. If this was you and you lost the unlock, get in touch with the signature.',
      409
    )
  }
  if (claim === 'unavailable') {
    return apiError('Could not reach the claim store. Try again in a moment.', 503)
  }

  return NextResponse.json({ token: issueToken(tier, signature), tier })
}
