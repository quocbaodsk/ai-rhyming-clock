import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const client = new Anthropic()

export async function POST(request: Request) {
  const { stars } = await request.json() as {
    stars: Array<{ x: number; y: number }>
  }

  const starDescriptions = stars
    .map((s, i) => {
      const hRegion = s.x < 0.33 ? 'left' : s.x < 0.66 ? 'center' : 'right'
      const vRegion = s.y < 0.33 ? 'top' : s.y < 0.66 ? 'middle' : 'bottom'
      return `Star ${i + 1}: ${vRegion}-${hRegion} (${(s.x * 100).toFixed(0)}%, ${(s.y * 100).toFixed(0)}%)`
    })
    .join('\n')

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    messages: [
      {
        role: 'user',
        content: `You are a whimsical celestial storyteller. A user has placed ${stars.length} stars on a night sky canvas. Here are their positions (0,0 is top-left, 100%,100% is bottom-right):

${starDescriptions}

Consider the spatial arrangement and the shape formed by connecting these stars in order. Based on the geometry and pattern:

1. Give the constellation a whimsical, relatable everyday name (like "The Dancing Umbrella", "The Sleepy Cat", "The Lost Teacup", "The Running Scissors"). Be creative and specific.
2. Write a short mystical story (2-3 sentences) about this constellation — how it came to be in the sky, what it means to those who see it.

Respond ONLY with valid JSON in this exact format:
{"name": "The ...", "story": "..."}`,
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : '{}'
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : '{}')

  return NextResponse.json({
    name: parsed.name || 'The Unnamed Star',
    story: parsed.story || 'A mysterious pattern appeared in the night sky...',
  })
}
