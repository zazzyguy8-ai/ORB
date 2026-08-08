import { NextRequest, NextResponse } from 'next/server'
import { TIERS, isTierId } from '@/lib/products'
import { createCheckoutSession, stripeConfigured } from '@/lib/stripe'
import { readBody, apiError } from '@/lib/request'

export const maxDuration = 30

/** Start a hosted Stripe Checkout session and hand the browser the URL. */
export async function POST(req: NextRequest) {
  if (!stripeConfigured()) {
    return apiError('Card payments are not configured on this deployment.', 503)
  }

  const body = await readBody(req)
  if (!body) return apiError('Malformed request body.', 400)

  if (!isTierId(body.tier)) return apiError('Unknown tier.', 400)

  // Prefer the configured public origin so the return URL is right even
  // behind a proxy that rewrites Host.
  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
    req.nextUrl.origin

  try {
    const session = await createCheckoutSession(TIERS[body.tier], origin)
    return NextResponse.json({ url: session.url })
  } catch (error: unknown) {
    console.error('checkout failed:', error)
    return apiError('Could not start checkout. Try again in a moment.', 502)
  }
}
