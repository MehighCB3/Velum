import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

export const dynamic = 'force-dynamic'

const SEED_DATA = {
  "2026-02-01": {
    "date": "2026-02-01",
    "entries": [
      { "id": "20260201-001", "name": "Matcha latte", "calories": 70, "protein": 4, "carbs": 8, "fat": 2, "time": "08:00", "date": "2026-02-01" },
      { "id": "20260201-002", "name": "Huevos rancheros", "calories": 203, "protein": 12, "carbs": 18, "fat": 10, "time": "09:30", "date": "2026-02-01" },
      { "id": "20260201-003", "name": "Patatas bravas", "calories": 280, "protein": 4, "carbs": 35, "fat": 14, "time": "13:00", "date": "2026-02-01" },
      { "id": "20260201-004", "name": "Grilled seafood platter", "calories": 220, "protein": 28, "carbs": 5, "fat": 8, "time": "14:30", "date": "2026-02-01" },
      { "id": "20260201-005", "name": "Fideuà with seafood", "calories": 420, "protein": 24, "carbs": 58, "fat": 10, "time": "15:00", "date": "2026-02-01" },
      { "id": "20260201-006", "name": "Coke (can)", "calories": 139, "protein": 0, "carbs": 35, "fat": 0, "time": "16:00", "date": "2026-02-01" },
      { "id": "20260201-007", "name": "Cinnamon roll", "calories": 220, "protein": 4, "carbs": 32, "fat": 8, "time": "17:00", "date": "2026-02-01" }
    ],
    "totals": { "calories": 1552, "protein": 76, "carbs": 191, "fat": 52 },
    "goals": { "calories": 2600, "protein": 160, "carbs": 310, "fat": 80 }
  }
}

export async function POST(request: NextRequest) {
  const results: string[] = []
  
  try {
    // Check auth (simple secret check)
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    
    if (secret !== process.env.MIGRATE_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    results.push('🗄️ Starting migration...')
    
    // Create tables
    await sql`
      CREATE TABLE IF NOT EXISTS nutrition_entries (
        id SERIAL PRIMARY KEY,
        entry_id VARCHAR(50) UNIQUE NOT NULL,
        date DATE NOT NULL,
        name VARCHAR(255) NOT NULL,
        calories INTEGER NOT NULL DEFAULT 0,
        protein DECIMAL(6,2) NOT NULL DEFAULT 0,
        carbs DECIMAL(6,2) NOT NULL DEFAULT 0,
        fat DECIMAL(6,2) NOT NULL DEFAULT 0,
        entry_time TIME NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    results.push('✅ Created nutrition_entries table')
    
    await sql`
      CREATE TABLE IF NOT EXISTS nutrition_goals (
        id SERIAL PRIMARY KEY,
        date DATE UNIQUE NOT NULL,
        calories INTEGER NOT NULL DEFAULT 2600,
        protein INTEGER NOT NULL DEFAULT 160,
        carbs INTEGER NOT NULL DEFAULT 310,
        fat INTEGER NOT NULL DEFAULT 80,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
    results.push('✅ Created nutrition_goals table')
    
    // Create indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_nutrition_entries_date ON nutrition_entries(date)`
    await sql`CREATE INDEX IF NOT EXISTS idx_nutrition_entries_entry_id ON nutrition_entries(entry_id)`
    results.push('✅ Created indexes')
    
    // Seed data
    for (const [date, data] of Object.entries(SEED_DATA)) {
      // Insert goals
      await sql`
        INSERT INTO nutrition_goals (date, calories, protein, carbs, fat)
        VALUES (${date}, ${data.goals.calories}, ${data.goals.protein}, ${data.goals.carbs}, ${data.goals.fat})
        ON CONFLICT (date) DO UPDATE SET
          calories = EXCLUDED.calories,
          protein = EXCLUDED.protein,
          carbs = EXCLUDED.carbs,
          fat = EXCLUDED.fat
      `
      
      // Insert entries
      for (const entry of data.entries) {
        await sql`
          INSERT INTO nutrition_entries (entry_id, date, name, calories, protein, carbs, fat, entry_time)
          VALUES (${entry.id}, ${entry.date}, ${entry.name}, ${entry.calories}, ${entry.protein}, ${entry.carbs}, ${entry.fat}, ${entry.time})
          ON CONFLICT (entry_id) DO UPDATE SET
            name = EXCLUDED.name,
            calories = EXCLUDED.calories,
            protein = EXCLUDED.protein,
            carbs = EXCLUDED.carbs,
            fat = EXCLUDED.fat,
            entry_time = EXCLUDED.entry_time
        `
      }
      
      results.push(`✅ Migrated ${data.entries.length} entries for ${date}`)
    }
    
    // Create view
    await sql`
      CREATE OR REPLACE VIEW daily_nutrition_summary AS
      SELECT 
        date,
        COUNT(*) as meal_count,
        SUM(calories) as total_calories,
        SUM(protein) as total_protein,
        SUM(carbs) as total_carbs,
        SUM(fat) as total_fat
      FROM nutrition_entries
      GROUP BY date
      ORDER BY date DESC
    `
    results.push('✅ Created daily_nutrition_summary view')

    // Add photo_url column to nutrition_entries if it doesn't exist
    try {
      await sql`ALTER TABLE nutrition_entries ADD COLUMN IF NOT EXISTS photo_url TEXT`
      results.push('✅ Added photo_url column to nutrition_entries')
    } catch (error) {
      results.push('⚠️ photo_url column may already exist')
    }

    // Agent memories table for persistent memory across sessions
    await sql`
      CREATE TABLE IF NOT EXISTS agent_memories (
        id VARCHAR(50) PRIMARY KEY,
        category VARCHAR(50) NOT NULL,
        key VARCHAR(255) NOT NULL,
        value TEXT NOT NULL,
        source VARCHAR(50) DEFAULT 'agent',
        agent_id VARCHAR(50),
        confidence DECIMAL(3,2) DEFAULT 1.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        UNIQUE(category, key)
      )
    `
    await sql`CREATE INDEX IF NOT EXISTS idx_memories_category ON agent_memories(category)`
    await sql`CREATE INDEX IF NOT EXISTS idx_memories_updated ON agent_memories(updated_at DESC)`
    results.push('✅ Created agent_memories table')

    return NextResponse.json({
      success: true,
      results,
      message: 'Migration complete! Postgres is ready.'
    })
    
  } catch (error) {
    console.error('Migration error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { 
        error: 'Migration failed', 
        details: errorMessage,
        results 
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Migration API - Use POST with ?secret=YOUR_SECRET to run migration',
    note: 'Set MIGRATE_SECRET env var in Vercel dashboard first'
  })
}
