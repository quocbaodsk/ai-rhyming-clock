import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const client = new Anthropic()

export async function POST(request: Request) {
  const { time } = await request.json()

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 150,
    messages: [
      {
        role: 'user',
        content: `Bây giờ là ${time}. Viết một bài thơ lục bát hoặc thơ vần 2-4 câu, thanh thoát và tinh tế, nói rõ giờ phút hiện tại một cách sáng tạo. Chỉ trả lời bài thơ, không tiêu đề, không dấu ngoặc kép, không giải thích.`,
      },
    ],
  })

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  return NextResponse.json({ poem: text.trim() })
}
