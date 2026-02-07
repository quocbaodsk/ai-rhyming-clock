import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(request: Request) {
  const { time } = await request.json();

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 150,
    messages: [
      {
        role: "user",
        content: `The current time is ${time}. Write a short, elegant 2-4 line rhyming poem that tells this exact time in a creative way. The poem must clearly communicate the time. Only respond with the poem, nothing else. No title, no quotes, no extra formatting.`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  return NextResponse.json({ poem: text.trim() });
}
