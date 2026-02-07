import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const client = new Anthropic()

export async function POST(request: Request) {
  try {
    const { code, sourceLanguage, targetLanguage } = await request.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'No code provided' }, { status: 400 })
    }

    if (code.length > 50000) {
      return NextResponse.json({ error: 'Code too large (max 50KB)' }, { status: 400 })
    }

    if (!sourceLanguage || !targetLanguage) {
      return NextResponse.json({ error: 'Languages not specified' }, { status: 400 })
    }

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: `Convert the following ${sourceLanguage} code to ${targetLanguage}. Output ONLY the converted code with no explanation, no markdown fences, and no extra text.\n\n${code}`,
        },
      ],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''

    return NextResponse.json({ code: text.trim() })
  } catch {
    return NextResponse.json(
      { error: 'Failed to convert code. Please try again.' },
      { status: 500 },
    )
  }
}
