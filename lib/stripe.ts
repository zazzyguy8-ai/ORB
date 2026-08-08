import Stripe from 'stripe'
import { TIERS, type Tier, type TierId } from './products'
import { isTierId } from './products'

/**
 * Stripe Checkout, hosted. No card form of our own, no PCI surface, no
 * webhook endpoint to keep alive: the browser comes back from Checkout with a
 * session id and we ask Stripe directly whether that session was paid.
 *
 * Webhooks are the right answer once there is fulfilment that must happen
 * without the customer's browser (emailing a PDF, provisioning an account).
 * There isn't — the reading is generated in the browser session that paid.
 */

let cached: Stripe | null = null

function stripe(): Stripe {
  if (cached) return cached
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured')
  cached = new Stripe(key)
  return cached
}

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY)
}

export async function createCheckoutSession(
  tier: Tier,
  origin: string
): Promise<{ url: string; id: string }> {
  const session = await stripe().checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: tier.currency,
          unit_amount: tier.amount,
          product_data: {
            name: `CULTSCAN — ${tier.name}`,
            description: tier.tagline,
          },
        },
      },
    ],
    // The tier travels with the session so the return leg does not have to
    // trust anything the browser tells us about what was purchased.
    metadata: { tier: tier.id },
    success_url: `${origin}/?paid=1&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/?cancelled=1`,
    // Stripe collects this; it is the only channel for a refund conversation.
    billing_address_collection: 'auto',
  })

  if (!session.url) throw new Error('Stripe did not return a Checkout URL')
  return { url: session.url, id: session.id }
}

/**
 * Ask Stripe whether this session was actually paid, and for what.
 * Returns null when the session is unknown, unpaid, or carries no valid tier.
 */
export async function resolvePaidSession(
  sessionId: string
): Promise<{ tier: TierId; sessionId: string } | null> {
  let session: Stripe.Checkout.Session
  try {
    session = await stripe().checkout.sessions.retrieve(sessionId)
  } catch {
    return null
  }

  if (session.payment_status !== 'paid') return null

  const tier = session.metadata?.tier
  if (!isTierId(tier)) return null

  return { tier, sessionId: session.id }
}

export { TIERS }
