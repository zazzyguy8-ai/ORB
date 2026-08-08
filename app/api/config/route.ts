import { NextResponse } from 'next/server'
import { stripeConfigured } from '@/lib/stripe'
import { solanaConfigured, receiveAddress } from '@/lib/solana'
import { claimsEnabled } from '@/lib/claims'
import { anthropicConfigured } from '@/lib/anthropic'

export const dynamic = 'force-dynamic'

/**
 * What this deployment can actually do right now.
 *
 * The UI reads this instead of guessing, so a half-configured deployment
 * shows honest options rather than buttons that fail on click. Nothing
 * secret is returned — the receiving address is meant to be public.
 */
export async function GET() {
  const solana = solanaConfigured() && claimsEnabled()
  return NextResponse.json({
    scanning: anthropicConfigured(),
    card: stripeConfigured(),
    usdc: solana,
    receiveAddress: solana ? receiveAddress() : null,
  })
}
