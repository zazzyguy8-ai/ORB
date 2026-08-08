import { NextRequest, NextResponse } from 'next/server'
import type { TokenInput } from './cultscan'

/**
 * Request parsing and validation shared by every generation endpoint.
 * Untrusted input gets bounded here, once, rather than in four routes.
 */

const LIMITS = {
  ticker: 24,
  name: 120,
  pitch: 4000,
  chain: 40,
} as const

export function apiError(message: string, status: number): NextResponse {
  return NextResponse.json({ error: message }, { status })
}

function cleanString(value: unknown, max: number): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, max)
}

export type ParsedInput = { input: TokenInput } | { error: string }

export async function readBody(req: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json()
    if (typeof body !== 'object' || body === null || Array.isArray(body)) return null
    return body as Record<string, unknown>
  } catch {
    return null
  }
}

export function parseTokenInput(body: Record<string, unknown>): ParsedInput {
  const ticker = cleanString(body.ticker, LIMITS.ticker)
  const name = cleanString(body.name, LIMITS.name)
  const pitch = cleanString(body.pitch, LIMITS.pitch)
  const chain = cleanString(body.chain, LIMITS.chain)

  if (!ticker) return { error: 'A ticker is required.' }
  if (pitch.length < 20) {
    return {
      error: 'Give the scan something to read — at least a sentence or two about what this is.',
    }
  }

  return {
    input: {
      ticker,
      name: name || ticker,
      pitch,
      ...(chain ? { chain } : {}),
    },
  }
}

export async function readTokenInput(req: NextRequest): Promise<ParsedInput> {
  const body = await readBody(req)
  if (!body) return { error: 'Malformed request body.' }
  return parseTokenInput(body)
}
