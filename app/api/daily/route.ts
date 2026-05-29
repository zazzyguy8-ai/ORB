import { NextRequest, NextResponse } from 'next/server'
import { generateDailyMessage } from '@/lib/claude'
import { getDailyMessage } from '@/lib/archetypes'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { archetype, dayNumber } = body as { archetype: string; dayNumber: number }

    if (!archetype || !dayNumber) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // If no API key, fall back to pool
    if (!process.env.ANTHROPIC_API_KEY) {
      const poolMessage = getDailyMessage(dayNumber - 1)
      return NextResponse.json(poolMessage)
    }

    try {
      const message = await generateDailyMessage(archetype, dayNumber)
      return NextResponse.json(message)
    } catch {
      // Fall back to static pool on Claude error
      const poolMessage = getDailyMessage(dayNumber - 1)
      return NextResponse.json(poolMessage)
    }
  } catch (error: unknown) {
    console.error('Daily API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
