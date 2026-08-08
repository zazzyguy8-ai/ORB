import { NextRequest, NextResponse } from 'next/server'
import { generateVibeCheck } from '@/lib/cultscan'
import { anthropicConfigured } from '@/lib/anthropic'
import { readTokenInput, apiError } from '@/lib/request'

export const maxDuration = 60

/**
 * The free vibe check. No payment, no token.
 *
 * This is the top of the funnel and the content engine at the same time: it
 * is cheap enough to give away, useful enough that people come back, and its
 * output is the exact thing that makes a good screenshot.
 */
export async function POST(req: NextRequest) {
  if (!anthropicConfigured()) {
    return apiError('Scanning is not configured on this deployment.', 503)
  }

  const parsed = await readTokenInput(req)
  if ('error' in parsed) return apiError(parsed.error, 400)

  try {
    const vibe = await generateVibeCheck(parsed.input)
    return NextResponse.json(vibe)
  } catch (error: unknown) {
    console.error('vibe check failed:', error)
    const message = error instanceof Error ? error.message : 'The scan failed.'
    return apiError(message, 502)
  }
}
