import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

const usePostgres = !!process.env.POSTGRES_URL

// Goal types
interface Goal {
  id: string
  title: string
  area: string
  objective: string
  keyMetric: string
  targetValue: number
  currentValue: number
  unit: string
  horizon: 'year' | '3years' | '5years' | '10years' | 'bucket'
  createdAt: string
  completedAt?: string
}

// In-memory fallback
let fallbackGoals: Goal[] = []

// Initialize Postgres tables
async function initializeTables(): Promise<void> {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS goals (
        id VARCHAR(50) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        area VARCHAR(100) NOT NULL,
        objective TEXT NOT NULL,
        key_metric VARCHAR(255) NOT NULL,
        target_value DECIMAL(10,2) NOT NULL DEFAULT 0,
        current_value DECIMAL(10,2) NOT NULL DEFAULT 0,
        unit VARCHAR(50) NOT NULL DEFAULT '',
        horizon VARCHAR(20) NOT NULL DEFAULT 'year',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_goals_horizon ON goals(horizon)`
  } catch (error) {
    console.error('Failed to initialize goals table:', error)
  }
}

// GET all goals or filter by horizon
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const horizon = searchParams.get('horizon')
    const id = searchParams.get('id')

    if (usePostgres) {
      await initializeTables()
      
      if (id) {
        const result = await sql`SELECT * FROM goals WHERE id = ${id}`
        return NextResponse.json({ goal: result.rows[0] || null })
      }
      
      if (horizon) {
        const result = await sql`SELECT * FROM goals WHERE horizon = ${horizon} ORDER BY created_at DESC`
        return NextResponse.json({ goals: result.rows })
      }
      
      const result = await sql`SELECT * FROM goals ORDER BY horizon, created_at DESC`
      return NextResponse.json({ goals: result.rows })
    }
    
    // Fallback
    let goals = fallbackGoals
    if (horizon) {
      goals = goals.filter(g => g.horizon === horizon)
    }
    if (id) {
      const goal = goals.find(g => g.id === id)
      return NextResponse.json({ goal: goal || null })
    }
    
    return NextResponse.json({ goals })
  } catch (error) {
    console.error('GET goals error:', error)
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 })
  }
}

// POST create or update goal
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      id, 
      title, 
      area, 
      objective, 
      keyMetric, 
      targetValue = 0, 
      currentValue = 0, 
      unit = '',
      horizon = 'year' 
    } = body

    if (!title || !area) {
      return NextResponse.json({ error: 'Title and area are required' }, { status: 400 })
    }

    const goalId = id || `goal-${Date.now()}`

    if (usePostgres) {
      await initializeTables()
      
      await sql`
        INSERT INTO goals (id, title, area, objective, key_metric, target_value, current_value, unit, horizon)
        VALUES (${goalId}, ${title}, ${area}, ${objective}, ${keyMetric}, ${targetValue}, ${currentValue}, ${unit}, ${horizon})
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          area = EXCLUDED.area,
          objective = EXCLUDED.objective,
          key_metric = EXCLUDED.key_metric,
          target_value = EXCLUDED.target_value,
          current_value = EXCLUDED.current_value,
          unit = EXCLUDED.unit,
          horizon = EXCLUDED.horizon
      `
      
      const result = await sql`SELECT * FROM goals WHERE id = ${goalId}`
      return NextResponse.json({ goal: result.rows[0], storage: 'postgres' })
    }
    
    // Fallback
    const existingIndex = fallbackGoals.findIndex(g => g.id === goalId)
    const newGoal: Goal = {
      id: goalId,
      title,
      area,
      objective: objective || '',
      keyMetric: keyMetric || '',
      targetValue: Number(targetValue) || 0,
      currentValue: Number(currentValue) || 0,
      unit: unit || '',
      horizon: horizon as Goal['horizon'],
      createdAt: new Date().toISOString()
    }
    
    if (existingIndex >= 0) {
      fallbackGoals[existingIndex] = { ...fallbackGoals[existingIndex], ...newGoal }
    } else {
      fallbackGoals.push(newGoal)
    }
    
    return NextResponse.json({ goal: newGoal, storage: 'fallback' })
  } catch (error) {
    console.error('POST goals error:', error)
    return NextResponse.json({ error: 'Failed to save goal' }, { status: 500 })
  }
}

// PATCH update progress
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, currentValue, completed } = body

    if (!id) {
      return NextResponse.json({ error: 'Goal ID required' }, { status: 400 })
    }

    if (usePostgres) {
      await initializeTables()
      
      if (completed !== undefined) {
        await sql`
          UPDATE goals 
          SET current_value = target_value, completed_at = ${completed ? new Date().toISOString() : null}
          WHERE id = ${id}
        `
      } else if (currentValue !== undefined) {
        await sql`
          UPDATE goals 
          SET current_value = ${currentValue}
          WHERE id = ${id}
        `
      }
      
      const result = await sql`SELECT * FROM goals WHERE id = ${id}`
      return NextResponse.json({ goal: result.rows[0] })
    }
    
    // Fallback
    const goalIndex = fallbackGoals.findIndex(g => g.id === id)
    if (goalIndex >= 0) {
      if (completed !== undefined) {
        fallbackGoals[goalIndex].currentValue = fallbackGoals[goalIndex].targetValue
        fallbackGoals[goalIndex].completedAt = completed ? new Date().toISOString() : undefined
      } else if (currentValue !== undefined) {
        fallbackGoals[goalIndex].currentValue = Number(currentValue)
      }
      return NextResponse.json({ goal: fallbackGoals[goalIndex] })
    }
    
    return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
  } catch (error) {
    console.error('PATCH goals error:', error)
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 })
  }
}

// DELETE goal
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Goal ID required' }, { status: 400 })
    }

    if (usePostgres) {
      await sql`DELETE FROM goals WHERE id = ${id}`
      return NextResponse.json({ success: true })
    }
    
    // Fallback
    fallbackGoals = fallbackGoals.filter(g => g.id !== id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('DELETE goals error:', error)
    return NextResponse.json({ error: 'Failed to delete goal' }, { status: 500 })
  }
}
