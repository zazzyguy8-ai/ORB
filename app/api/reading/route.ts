import { NextRequest, NextResponse } from 'next/server'
import { generateReading } from '@/lib/claude'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { answers, hesitationTimes, questionTexts } = body as {
      answers: string[]
      hesitationTimes: number[]
      questionTexts: string[]
    }

    if (!answers || !hesitationTimes || !questionTexts) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY is not configured' },
        { status: 500 }
      )
    }

    const reading = await generateReading(answers, hesitationTimes, questionTexts)
    return NextResponse.json(reading)
  } catch (error: unknown) {
    console.error('Reading API error:', error)
    const message = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
