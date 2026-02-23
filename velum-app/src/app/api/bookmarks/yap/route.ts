import { NextRequest, NextResponse } from 'next/server';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export async function POST(req: NextRequest) {
  const { text, author } = await req.json();
  if (!text) return NextResponse.json({ bullets: [] });

  // Fallback: split into up to 3 sentences if no API key
  if (!OPENROUTER_API_KEY) {
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map((s: string) => s.trim())
      .filter(Boolean)
      .slice(0, 3);
    return NextResponse.json({ bullets: sentences });
  }

  const prompt = `Summarize this saved post in exactly 3 bullet points. Each bullet must be under 15 words. Capture the core insight. Output only 3 lines, each starting with •

@${author}: ${text}`;

  try {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://velum-five.vercel.app',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-haiku-3-5',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
      }),
    });

    const data = await res.json();
    const raw: string = data.choices?.[0]?.message?.content ?? '';
    const bullets = raw
      .split('\n')
      .map((l: string) => l.trim())
      .filter((l: string) => l.length > 0)
      .slice(0, 3);

    return NextResponse.json({ bullets });
  } catch {
    return NextResponse.json({ bullets: [] });
  }
}
