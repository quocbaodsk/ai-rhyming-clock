import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const client = new Anthropic()

type DrumInstrument = 'kick' | 'snare' | 'hihat_closed' | 'hihat_open' | 'clap' | 'tom_low' | 'tom_high'
type DrumTrack = { id: DrumInstrument; label: string; steps: boolean[] }
type DrumPattern = { bpm: number; tracks: DrumTrack[] }

const VALID_INSTRUMENTS: DrumInstrument[] = [
  'kick', 'snare', 'hihat_closed', 'hihat_open', 'clap', 'tom_low', 'tom_high',
]

const DEFAULT_PATTERN: DrumPattern = {
  bpm: 120,
  tracks: [
    { id: 'kick', label: 'Kick', steps: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false] },
    { id: 'snare', label: 'Snare', steps: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false] },
    { id: 'hihat_closed', label: 'Hi-Hat', steps: [true, false, true, false, true, false, true, false, true, false, true, false, true, false, true, false] },
  ],
}

function validatePattern(pattern: DrumPattern): boolean {
  if (typeof pattern.bpm !== 'number' || pattern.bpm < 70 || pattern.bpm > 170) return false
  if (!Array.isArray(pattern.tracks) || pattern.tracks.length === 0) return false
  for (const track of pattern.tracks) {
    if (!VALID_INSTRUMENTS.includes(track.id)) return false
    if (typeof track.label !== 'string') return false
    if (!Array.isArray(track.steps) || track.steps.length !== 16) return false
    if (!track.steps.every((s: unknown) => typeof s === 'boolean')) return false
  }
  return true
}

const drumPatternTool: Anthropic.Tool = {
  name: 'return_drum_pattern',
  description: 'Return a structured drum pattern with BPM and track data.',
  input_schema: {
    type: 'object' as const,
    properties: {
      bpm: { type: 'number', minimum: 70, maximum: 170, description: 'Tempo in BPM (70-170)' },
      tracks: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', enum: ['kick', 'snare', 'hihat_closed', 'hihat_open', 'clap', 'tom_low', 'tom_high'] },
            label: { type: 'string' },
            steps: { type: 'array', items: { type: 'boolean' }, minItems: 16, maxItems: 16 },
          },
          required: ['id', 'label', 'steps'],
        },
      },
    },
    required: ['bpm', 'tracks'],
  },
}

export async function POST(request: Request) {
  try {
    const { description } = await request.json()

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: 'You are a drum machine pattern generator. Given a description of a drum beat, generate a realistic drum pattern. Map the description to appropriate rhythmic patterns. Always use exactly 16 steps (one bar of 16th notes). Use musical knowledge to create authentic patterns.',
      tools: [drumPatternTool],
      tool_choice: { type: 'tool', name: 'return_drum_pattern' },
      messages: [
        {
          role: 'user',
          content: `Generate a drum pattern for: ${description}. Call the return_drum_pattern tool with the pattern.`,
        },
      ],
    })

    const toolBlock = message.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
    )

    if (toolBlock) {
      const pattern = toolBlock.input as DrumPattern
      if (validatePattern(pattern)) {
        return NextResponse.json({ pattern })
      }
    }

    return NextResponse.json({ pattern: DEFAULT_PATTERN })
  } catch {
    return NextResponse.json({ pattern: DEFAULT_PATTERN })
  }
}
