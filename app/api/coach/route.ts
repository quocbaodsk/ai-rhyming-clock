import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const client = new Anthropic()

interface Suggestion {
  principle: string
  severity: 'high' | 'medium' | 'low'
  line?: number
  issue: string
  fix: string
}

interface CodeReview {
  score: number
  summary: string
  suggestions: Suggestion[]
  strengths: string[]
}

const reviewTool: Anthropic.Tool = {
  name: 'return_code_review',
  description: 'Return a structured code review with score, summary, suggestions, and strengths.',
  input_schema: {
    type: 'object' as const,
    properties: {
      score: {
        type: 'number',
        minimum: 0,
        maximum: 100,
        description: 'Overall code quality score from 0-100',
      },
      summary: {
        type: 'string',
        description: 'A 2-3 sentence overall assessment of the code quality',
      },
      suggestions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            principle: {
              type: 'string',
              enum: [
                'Descriptive Names',
                'Function Size',
                'Explicit Dependencies',
                'Error Handling',
                'Nesting Depth',
                'Side Effects',
                'Magic Numbers',
              ],
            },
            severity: {
              type: 'string',
              enum: ['high', 'medium', 'low'],
            },
            line: {
              type: 'number',
              description: 'Approximate line number where the issue occurs, if applicable',
            },
            issue: {
              type: 'string',
              description: 'Clear description of the problem found',
            },
            fix: {
              type: 'string',
              description: 'Specific suggestion on how to fix it',
            },
          },
          required: ['principle', 'severity', 'issue', 'fix'],
        },
      },
      strengths: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of things the code does well',
      },
    },
    required: ['score', 'summary', 'suggestions', 'strengths'],
  },
}

const SYSTEM_PROMPT = `You are an expert code reviewer focused on production readiness and maintainability. Evaluate code using these 7 principles:

1) DESCRIPTIVE NAMES — Classes, functions, and variables should have clear, descriptive names that convey purpose.
2) FUNCTION SIZE — Functions should be focused. Flag functions over ~200 lines. Also flag tiny functions (<5 lines) that are only called once, unless they are public class methods.
3) EXPLICIT DEPENDENCIES — Avoid global state and hidden dependencies. Dependencies should be passed explicitly (parameters, constructor injection, etc.).
4) ERROR HANDLING — Avoid blanket swallowing errors with empty try/catch blocks. Errors should be logged, re-thrown, or handled meaningfully.
5) NESTING DEPTH — More than 2-3 levels of nested control structures is hard to follow. Suggest early returns, guard clauses, or extraction.
6) SIDE EFFECTS — Side effects should be obvious and well-documented. Flag functions that unexpectedly modify external state.
7) MAGIC NUMBERS — Numeric literals should be named constants when their purpose is not immediately obvious from context.

Scoring guide:
- 90-100: Excellent. Production-ready with minor polish suggestions.
- 75-89: Good. Solid code with some areas for improvement.
- 60-74: Fair. Functional but has notable maintainability concerns.
- 40-59: Needs work. Multiple significant issues that should be addressed.
- 0-39: Poor. Fundamental issues with readability and maintainability.

Be specific: reference line numbers, give concrete examples of better names or refactored code in your suggestions. Be constructive, not harsh. Always note strengths too.`

function validateReview(review: CodeReview): boolean {
  if (typeof review.score !== 'number' || review.score < 0 || review.score > 100) return false
  if (typeof review.summary !== 'string' || !review.summary) return false
  if (!Array.isArray(review.suggestions)) return false
  if (!Array.isArray(review.strengths)) return false
  return true
}

export async function POST(request: Request) {
  try {
    const { code, filename } = await request.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'No code provided' }, { status: 400 })
    }

    if (code.length > 50000) {
      return NextResponse.json({ error: 'File too large (max 50KB)' }, { status: 400 })
    }

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: [reviewTool],
      tool_choice: { type: 'tool', name: 'return_code_review' },
      messages: [
        {
          role: 'user',
          content: `Review this code file${filename ? ` (${filename})` : ''}:\n\n\`\`\`\n${code}\n\`\`\`\n\nCall the return_code_review tool with your evaluation.`,
        },
      ],
    })

    const toolBlock = message.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use',
    )

    if (toolBlock) {
      const review = toolBlock.input as CodeReview
      if (validateReview(review)) {
        return NextResponse.json({ review })
      }
    }

    return NextResponse.json({
      review: {
        score: 50,
        summary: 'Unable to fully evaluate the code. Please try again.',
        suggestions: [],
        strengths: ['Code was submitted successfully.'],
      },
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to evaluate code. Please try again.' },
      { status: 500 },
    )
  }
}
