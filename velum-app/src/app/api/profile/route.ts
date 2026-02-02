import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@vercel/postgres'

// Create user profile table
async function initializeProfileTable() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS user_profiles (
        id SERIAL PRIMARY KEY,
        birth_date DATE NOT NULL,
        country VARCHAR(100),
        life_expectancy INTEGER DEFAULT 85,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `
  } catch (error) {
    console.error('Failed to create profile table:', error)
  }
}

// GET user profile
export async function GET() {
  try {
    await initializeProfileTable()
    
    const result = await sql`SELECT * FROM user_profiles ORDER BY id DESC LIMIT 1`
    
    if (result.rows.length === 0) {
      return NextResponse.json({ profile: null })
    }
    
    const profile = result.rows[0]
    const birthDate = new Date(profile.birth_date)
    const now = new Date()
    
    // Calculate life stats
    const ageInWeeks = Math.floor((now.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 7))
    const totalWeeks = profile.life_expectancy * 52
    const weeksRemaining = totalWeeks - ageInWeeks
    const currentAge = Math.floor(ageInWeeks / 52)
    const percentLived = (ageInWeeks / totalWeeks) * 100
    
    return NextResponse.json({
      profile: {
        ...profile,
        ageInWeeks,
        totalWeeks,
        weeksRemaining,
        currentAge,
        percentLived: Math.round(percentLived * 10) / 10,
        yearsRemaining: profile.life_expectancy - currentAge
      }
    })
  } catch (error) {
    console.error('GET profile error:', error)
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 })
  }
}

// POST/PUT update profile
export async function POST(request: NextRequest) {
  try {
    await initializeProfileTable()
    
    const { birthDate, country, lifeExpectancy = 85 } = await request.json()
    
    if (!birthDate) {
      return NextResponse.json({ error: 'Birth date required' }, { status: 400 })
    }
    
    // Check if profile exists
    const existing = await sql`SELECT id FROM user_profiles LIMIT 1`
    
    if (existing.rows.length > 0) {
      // Update existing
      await sql`
        UPDATE user_profiles 
        SET birth_date = ${birthDate}, 
            country = ${country || null}, 
            life_expectancy = ${lifeExpectancy},
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ${existing.rows[0].id}
      `
    } else {
      // Create new
      await sql`
        INSERT INTO user_profiles (birth_date, country, life_expectancy)
        VALUES (${birthDate}, ${country || null}, ${lifeExpectancy})
      `
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('POST profile error:', error)
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 })
  }
}
