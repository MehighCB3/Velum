import { NextRequest, NextResponse } from 'next/server'
import {
  saveMemory,
  getMemories,
  getMemoryByKey,
  deleteMemory,
  deleteMemoryByKey,
  getMemoryContext,
  type MemoryCategory,
} from '../../lib/memoryStore'

export const dynamic = 'force-dynamic'

// GET /api/memory — list memories, optionally filtered
// GET /api/memory?category=preference
// GET /api/memory?category=health&key=allergy
// GET /api/memory?format=context — returns the formatted context string
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category') as MemoryCategory | null
    const key = searchParams.get('key')
    const format = searchParams.get('format')

    // Return formatted context string for agent injection
    if (format === 'context') {
      const context = await getMemoryContext()
      return NextResponse.json({ context })
    }

    // Lookup specific memory by category+key
    if (category && key) {
      const memory = await getMemoryByKey(category, key)
      return NextResponse.json({ memory })
    }

    // List all or by category
    const memories = await getMemories(category || undefined)
    return NextResponse.json({ memories, count: memories.length })
  } catch (error) {
    console.error('Memory GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch memories' }, { status: 500 })
  }
}

// POST /api/memory — create or update a memory
// Body: { category, key, value, source?, agentId?, confidence?, expiresAt? }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { category, key, value, source, agentId, confidence, expiresAt } = body

    if (!category || !key || !value) {
      return NextResponse.json(
        { error: 'category, key, and value are required' },
        { status: 400 }
      )
    }

    const memory = await saveMemory({
      category,
      key,
      value,
      source,
      agentId,
      confidence,
      expiresAt,
    })

    return NextResponse.json({ memory, saved: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save memory'
    console.error('Memory POST error:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// DELETE /api/memory?id=<memory-id>
// DELETE /api/memory?category=<cat>&key=<key>
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const category = searchParams.get('category')
    const key = searchParams.get('key')

    if (id) {
      await deleteMemory(id)
      return NextResponse.json({ deleted: true, id })
    }

    if (category && key) {
      await deleteMemoryByKey(category, key)
      return NextResponse.json({ deleted: true, category, key })
    }

    return NextResponse.json(
      { error: 'Provide id or category+key to delete' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Memory DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete memory' }, { status: 500 })
  }
}
