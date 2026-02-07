import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const client = new Anthropic()

interface Rect { x: number; y: number; w: number; h: number }
interface Platform {
  id: string
  type: 'normal' | 'moving' | 'crumbling' | 'bounce'
  rect: Rect
  path?: { x: number; y: number }[]
  speed?: number
  crumbleDelay?: number
  respawnTime?: number
  bounceMultiplier?: number
}
interface Hazard { id: string; type: 'spikes' | 'lava'; rect: Rect }
interface Collectible { id: string; type: 'coin' | 'gem'; pos: { x: number; y: number }; value: number }
interface Decor { id: string; layer: 'far' | 'mid' | 'near'; kind: string; pos: { x: number; y: number }; size: { w: number; h: number }; parallax: number; opacity: number }
interface LevelData {
  theme: string
  levelNumber: number
  world: { width: number; height: number; gravity: number }
  spawn: { x: number; y: number }
  goal: Rect
  platforms: Platform[]
  hazards: Hazard[]
  collectibles: Collectible[]
  decor: Decor[]
}

interface RawToolInput {
  theme?: string
  levelNumber?: number
  world?: { width?: number; height?: number; gravity?: number }
  spawn?: { x?: number; y?: number }
  goal?: { x?: number; y?: number; w?: number; h?: number }
  platforms?: {
    id?: string; type?: string; x?: number; y?: number; w?: number; h?: number
    pathPoints?: { x: number; y: number }[]; speed?: number
    crumbleDelay?: number; respawnTime?: number; bounceMultiplier?: number
  }[]
  hazards?: { id?: string; type?: string; x?: number; y?: number; w?: number; h?: number }[]
  collectibles?: { id?: string; type?: string; x?: number; y?: number; value?: number }[]
  decor?: { id?: string; layer?: string; kind?: string; x?: number; y?: number; w?: number; h?: number; parallax?: number; opacity?: number }[]
}

const FALLBACK_LEVEL: LevelData = {
  theme: 'default',
  levelNumber: 1,
  world: { width: 3000, height: 800, gravity: 2200 },
  spawn: { x: 80, y: 650 },
  goal: { x: 2800, y: 620, w: 40, h: 60 },
  platforms: [
    { id: 'ground', type: 'normal', rect: { x: 0, y: 760, w: 3000, h: 40 } },
    { id: 'p1', type: 'normal', rect: { x: 300, y: 660, w: 160, h: 20 } },
    { id: 'p2', type: 'normal', rect: { x: 550, y: 580, w: 140, h: 20 } },
    { id: 'p3', type: 'bounce', rect: { x: 800, y: 640, w: 120, h: 20 }, bounceMultiplier: 1.8 },
    { id: 'p4', type: 'normal', rect: { x: 1050, y: 560, w: 180, h: 20 } },
    { id: 'p5', type: 'moving', rect: { x: 1350, y: 500, w: 120, h: 20 }, path: [{ x: 1350, y: 500 }, { x: 1350, y: 620 }], speed: 60 },
    { id: 'p6', type: 'normal', rect: { x: 1600, y: 620, w: 200, h: 20 } },
    { id: 'p7', type: 'crumbling', rect: { x: 1900, y: 580, w: 140, h: 20 }, crumbleDelay: 500, respawnTime: 3000 },
    { id: 'p8', type: 'normal', rect: { x: 2150, y: 640, w: 160, h: 20 } },
    { id: 'p9', type: 'normal', rect: { x: 2450, y: 600, w: 200, h: 20 } },
  ],
  hazards: [
    { id: 'h1', type: 'spikes', rect: { x: 700, y: 740, w: 80, h: 20 } },
    { id: 'h2', type: 'lava', rect: { x: 1800, y: 740, w: 100, h: 20 } },
  ],
  collectibles: [
    { id: 'c1', type: 'coin', pos: { x: 400, y: 630 }, value: 10 },
    { id: 'c2', type: 'coin', pos: { x: 600, y: 550 }, value: 10 },
    { id: 'c3', type: 'coin', pos: { x: 1100, y: 530 }, value: 10 },
    { id: 'c4', type: 'gem', pos: { x: 1650, y: 580 }, value: 50 },
    { id: 'c5', type: 'coin', pos: { x: 2200, y: 610 }, value: 10 },
  ],
  decor: [
    { id: 'd1', layer: 'far', kind: 'cloud', pos: { x: 200, y: 100 }, size: { w: 120, h: 60 }, parallax: 0.2, opacity: 0.5 },
    { id: 'd2', layer: 'far', kind: 'cloud', pos: { x: 900, y: 150 }, size: { w: 100, h: 50 }, parallax: 0.2, opacity: 0.4 },
    { id: 'd3', layer: 'mid', kind: 'bush', pos: { x: 500, y: 730 }, size: { w: 60, h: 30 }, parallax: 0.6, opacity: 0.8 },
    { id: 'd4', layer: 'near', kind: 'rock', pos: { x: 1500, y: 735 }, size: { w: 40, h: 25 }, parallax: 0.9, opacity: 1.0 },
  ],
}

function validateLevel(level: LevelData): boolean {
  if (!level.spawn || typeof level.spawn.x !== 'number') return false
  if (!level.goal || typeof level.goal.x !== 'number') return false
  if (!Array.isArray(level.platforms) || level.platforms.length < 5) return false
  if (!level.world || level.world.width <= 1000) return false
  return true
}

function transformToolInput(raw: RawToolInput): LevelData {
  const world = {
    width: raw.world?.width ?? 3000,
    height: raw.world?.height ?? 800,
    gravity: raw.world?.gravity ?? 2200,
  }

  const spawn = {
    x: raw.spawn?.x ?? 80,
    y: raw.spawn?.y ?? 650,
  }

  const goal: Rect = {
    x: raw.goal?.x ?? world.width - 200,
    y: raw.goal?.y ?? 620,
    w: raw.goal?.w ?? 40,
    h: raw.goal?.h ?? 60,
  }

  const platforms: Platform[] = (raw.platforms ?? []).map((p, i) => ({
    id: p.id ?? `p${i}`,
    type: (p.type as Platform['type']) ?? 'normal',
    rect: { x: p.x ?? 0, y: p.y ?? 0, w: p.w ?? 100, h: p.h ?? 20 },
    ...(p.pathPoints ? { path: p.pathPoints } : {}),
    ...(p.speed != null ? { speed: p.speed } : {}),
    ...(p.crumbleDelay != null ? { crumbleDelay: p.crumbleDelay } : {}),
    ...(p.respawnTime != null ? { respawnTime: p.respawnTime } : {}),
    ...(p.bounceMultiplier != null ? { bounceMultiplier: p.bounceMultiplier } : {}),
  }))

  const hazards: Hazard[] = (raw.hazards ?? []).map((h, i) => ({
    id: h.id ?? `h${i}`,
    type: (h.type as Hazard['type']) ?? 'spikes',
    rect: { x: h.x ?? 0, y: h.y ?? 0, w: h.w ?? 60, h: h.h ?? 20 },
  }))

  const collectibles = (raw.collectibles ?? []).map((c, i) => ({
    id: c.id ?? `c${i}`,
    type: (c.type as 'coin' | 'gem') ?? 'coin',
    pos: { x: c.x ?? 0, y: c.y ?? 0 },
    value: c.value ?? 10,
  }))

  const decor = (raw.decor ?? []).map((d, i) => ({
    id: d.id ?? `d${i}`,
    layer: (d.layer as 'far' | 'mid' | 'near') ?? 'mid',
    kind: d.kind ?? 'bush',
    pos: { x: d.x ?? 0, y: d.y ?? 0 },
    size: { w: d.w ?? 60, h: d.h ?? 40 },
    parallax: d.parallax ?? 0.5,
    opacity: d.opacity ?? 1.0,
  }))

  return {
    theme: raw.theme ?? 'default',
    levelNumber: raw.levelNumber ?? 1,
    world,
    spawn,
    goal,
    platforms,
    hazards,
    collectibles,
    decor,
  }
}

const returnLevelTool: Anthropic.Tool = {
  name: 'return_level',
  description: 'Return a structured platformer level with platforms, hazards, collectibles, and decor.',
  input_schema: {
    type: 'object' as const,
    properties: {
      theme: { type: 'string' },
      levelNumber: { type: 'number' },
      world: {
        type: 'object',
        properties: {
          width: { type: 'number' },
          height: { type: 'number' },
          gravity: { type: 'number' },
        },
        required: ['width', 'height', 'gravity'],
      },
      spawn: {
        type: 'object',
        properties: {
          x: { type: 'number' },
          y: { type: 'number' },
        },
        required: ['x', 'y'],
      },
      goal: {
        type: 'object',
        properties: {
          x: { type: 'number' },
          y: { type: 'number' },
          w: { type: 'number' },
          h: { type: 'number' },
        },
        required: ['x', 'y', 'w', 'h'],
      },
      platforms: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string', enum: ['normal', 'moving', 'crumbling', 'bounce'] },
            x: { type: 'number' },
            y: { type: 'number' },
            w: { type: 'number' },
            h: { type: 'number' },
            pathPoints: { type: 'array', items: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' } }, required: ['x', 'y'] } },
            speed: { type: 'number' },
            crumbleDelay: { type: 'number' },
            respawnTime: { type: 'number' },
            bounceMultiplier: { type: 'number' },
          },
          required: ['id', 'type', 'x', 'y', 'w', 'h'],
        },
      },
      hazards: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string', enum: ['spikes', 'lava'] },
            x: { type: 'number' },
            y: { type: 'number' },
            w: { type: 'number' },
            h: { type: 'number' },
          },
          required: ['id', 'type', 'x', 'y', 'w', 'h'],
        },
      },
      collectibles: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string', enum: ['coin', 'gem'] },
            x: { type: 'number' },
            y: { type: 'number' },
            value: { type: 'number' },
          },
          required: ['id', 'type', 'x', 'y', 'value'],
        },
      },
      decor: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            layer: { type: 'string', enum: ['far', 'mid', 'near'] },
            kind: { type: 'string' },
            x: { type: 'number' },
            y: { type: 'number' },
            w: { type: 'number' },
            h: { type: 'number' },
            parallax: { type: 'number' },
            opacity: { type: 'number' },
          },
          required: ['id', 'layer', 'kind', 'x', 'y', 'w', 'h', 'parallax', 'opacity'],
        },
      },
    },
    required: ['theme', 'levelNumber', 'world', 'spawn', 'goal', 'platforms', 'hazards', 'collectibles', 'decor'],
  },
}

export async function POST(request: Request) {
  try {
    const { theme, levelNumber } = await request.json()

    const t = Math.min((levelNumber - 1) / 15, 1)
    const worldWidth = Math.round(3000 + t * 5000)
    const worldHeight = 800
    const hazardCount = Math.round(2 + t * 10)
    const platformCount = Math.round(12 + t * 18)
    const collectibleCount = Math.round(5 + t * 10)
    const movingPlatformPercent = Math.round(t * 30)
    const crumblingPlatformPercent = Math.round(t * 20)
    const bouncePlatformPercent = Math.round(5 + t * 15)
    const maxGap = Math.round(140 + t * 80)

    const systemPrompt = [
      'You are a platformer level designer creating levels for a retro-style game.',
      `The level scrolls horizontally. Ground is at y=${worldHeight - 60}. Lower y = higher on screen.`,
      'Player can jump about 100px high and 160px far normally.',
      'Place spawn on the left side, goal on the right side.',
      'First 400px should be safe (no hazards).',
      'Ensure the level is traversable - don\'t place impossible gaps.',
      'Include theme-appropriate decorative elements.',
      `The theme is "${theme}", level ${levelNumber}, difficulty parameters:`,
      `worldWidth=${worldWidth}, worldHeight=${worldHeight}, hazardCount=${hazardCount}, platformCount=${platformCount},`,
      `collectibleCount=${collectibleCount}, movingPlatformPercent=${movingPlatformPercent}%, crumblingPlatformPercent=${crumblingPlatformPercent}%,`,
      `bouncePlatformPercent=${bouncePlatformPercent}%, maxGap=${maxGap}px.`,
    ].join(' ')

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: systemPrompt,
      tools: [returnLevelTool],
      tool_choice: { type: 'tool', name: 'return_level' },
      messages: [
        {
          role: 'user',
          content: `Generate level ${levelNumber} with theme '${theme}'. Call the return_level tool.`,
        },
      ],
    })

    const toolBlock = message.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
    )

    if (toolBlock) {
      const raw = toolBlock.input as RawToolInput
      const level = transformToolInput(raw)

      if (validateLevel(level)) {
        return NextResponse.json({ level })
      }
    }

    return NextResponse.json({ level: { ...FALLBACK_LEVEL, theme, levelNumber } })
  } catch {
    return NextResponse.json({ level: FALLBACK_LEVEL })
  }
}
