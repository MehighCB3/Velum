import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Normalize text for comparison: lowercase, strip accents, trim punctuation/whitespace
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, '')
    .trim()
}

export async function POST(request: NextRequest) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY

  if (!OPENAI_API_KEY) {
    return NextResponse.json({ error: 'not_configured', message: 'STT not available' })
  }

  try {
    const formData = await request.formData()
    const audio = formData.get('audio') as File | null
    const expected = formData.get('expected') as string | null

    if (!audio || !expected) {
      return NextResponse.json({ error: 'Missing audio or expected field' }, { status: 400 })
    }

    // Guard against oversized audio files (max 5MB)
    const MAX_AUDIO_SIZE = 5 * 1024 * 1024
    if (audio.size > MAX_AUDIO_SIZE) {
      return NextResponse.json(
        { error: 'Audio file too large. Maximum size is 5 MB.' },
        { status: 413 },
      )
    }

    // Validate expected text length to prevent abuse
    if (expected.length > 500) {
      return NextResponse.json(
        { error: 'Expected text too long (max 500 characters)' },
        { status: 400 },
      )
    }

    // Forward to OpenAI Whisper API
    const whisperForm = new FormData()
    whisperForm.append('file', audio, audio.name || 'recording.m4a')
    whisperForm.append('model', 'gpt-4o-mini-transcribe')
    whisperForm.append('language', 'es')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: whisperForm,
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('OpenAI Whisper error:', response.status, err)
      return NextResponse.json({ error: 'Transcription failed' }, { status: 502 })
    }

    const data = await response.json()
    const transcription = (data.text || '').trim()
    const match = normalize(transcription) === normalize(expected)

    return NextResponse.json({ transcription, expected, match })
  } catch (error) {
    console.error('Pronounce error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
