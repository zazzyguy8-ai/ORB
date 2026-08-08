import { NextRequest, NextResponse } from 'next/server'
import { generateArsenalPart, isArsenalPart } from '@/lib/arsenal'
import { anthropicConfigured } from '@/lib/anthropic'
import { verifyToken } from '@/lib/unlock'
import { TIERS } from '@/lib/products'
import { readBody, parseTokenInput, apiError } from '@/lib/request'

export const maxDuration = 60

/**
 * The arsenal, one part per request.
 *
 * Splitting it keeps every call well inside the serverless wall-clock limit —
 * see the note at the top of lib/arsenal.ts.
 */
export async function POST(req: NextRequest) {
  if (!anthropicConfigured()) {
    return apiError('Generation is not configured on this deployment.', 503)
  }

  const body = await readBody(req)
  if (!body) return apiError('Malformed request body.', 400)

  const unlock = verifyToken(body.token)
  if (!unlock) {
    return apiError('This unlock is missing or has expired. Re-open your receipt link.', 401)
  }

  if (!TIERS[unlock.tier].arsenal) {
    return apiError(
      `The ${TIERS[unlock.tier].name} tier does not include the arsenal. Upgrade to ${TIERS.arsenal.name}.`,
      403
    )
  }

  const part = body.part
  if (!isArsenalPart(part)) {
    return apiError('Unknown arsenal part.', 400)
  }

  const parsed = parseTokenInput(body)
  if ('error' in parsed) return apiError(parsed.error, 400)

  const context = typeof body.context === 'string' ? body.context.slice(0, 2000) : undefined

  try {
    const pack = await generateArsenalPart(part, parsed.input, context)
    return NextResponse.json(pack)
  } catch (error: unknown) {
    console.error(`arsenal part "${part}" failed:`, error)
    const message = error instanceof Error ? error.message : 'Generation failed.'
    return apiError(message, 502)
  }
}
