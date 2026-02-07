import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const SYSTEM_PROMPT = `You are a master children's storyteller. You create beautiful, engaging bedtime stories that captivate children's imaginations while subtly teaching important life lessons.

Guidelines:
- Write stories appropriate for the child's age
- Use vivid, sensory language that paints pictures in the mind
- Include a clear beginning, middle, and satisfying end
- Weave the lesson naturally into the narrative — never preach
- Match the requested style (funny, adventurous, gentle, etc.)
- Incorporate the child's interests naturally into the story world
- Use simple vocabulary for younger children, richer language for older ones
- Keep stories between 400-700 words — perfect bedtime length
- End with a warm, comforting conclusion that eases into sleep
- Give the story a creative title

Format the story with a title on the first line (preceded by no label), then a blank line, then the story text. Use paragraph breaks for readability.`

export async function POST(request: Request) {
  try {
    const { language, age, gender, interests, style, lesson } = await request.json()

    const languageInstruction = language === 'vi' ? 'You MUST write the entire story in Vietnamese (Tiếng Việt). Use natural, fluent Vietnamese appropriate for children.' : 'Write the story in English.'

    if (!age || !interests || !style || !lesson) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const genderContext = gender && gender !== 'prefer-not-to-say' ? `The main character should be a ${gender}.` : 'Use a gender-neutral main character.'

    const prompt = `Create a bedtime story for a ${age}-year-old child.

${genderContext}

The child is interested in: ${Array.isArray(interests) ? interests.join(', ') : interests}

Story style: ${style}

The story should teach this lesson: ${lesson}

${languageInstruction}

Write the story now.`

    const stream = await client.messages.stream({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(event.delta.text))
            }
          }
          controller.close()
        } catch {
          controller.error(new Error('Stream interrupted'))
        }
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
      },
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Failed to generate story' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
