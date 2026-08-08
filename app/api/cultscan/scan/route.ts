import { NextRequest, NextResponse } from 'next/server'
import { generateScan } from '@/lib/cultscan'
import { anthropicConfigured } from '@/lib/anthropic'
import { verifyToken } from '@/lib/unlock'
import { readBody, parseTokenInput, apiError } from '@/lib/request'

export const maxDuration = 60

/** The paid scan. Both tiers include it. */
export async function POST(req: NextRequest) {
  if (!anthropicConfigured()) {
    return apiError('Scanning is not configured on this deployment.', 503)
  }

  const body = await readBody(req)
  if (!body) return apiError('Malformed request body.', 400)

  const unlock = verifyToken(body.token)
  if (!unlock) {
    return apiError('This unlock is missing or has expired. Re-open your receipt link.', 401)
  }

  const parsed = parseTokenInput(body)
  if ('error' in parsed) return apiError(parsed.error, 400)

  try {
    const scan = await generateScan(parsed.input)
    return NextResponse.json(scan)
  } catch (error: unknown) {
    console.error('scan failed:', error)
    const message = error instanceof Error ? error.message : 'The scan failed.'
    return apiError(message, 502)
  }
}
