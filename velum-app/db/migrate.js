// Migration script to seed Postgres with existing nutrition data
// Run: DATABASE_URL=postgresql://... node db/migrate.js

const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!connectionString) {
  console.error('Set DATABASE_URL or POSTGRES_URL to run migrations');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: connectionString.includes('sslmode=require') || connectionString.includes('vercel')
    ? { rejectUnauthorized: false }
    : undefined,
});

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
};

async function migrate() {
  console.log('Starting Postgres migration...\n');

  try {
    // Create tables
    console.log('Creating tables...');
    await pool.query(`
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
        photo_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
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
    `);

    // Create indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_nutrition_entries_date ON nutrition_entries(date)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_nutrition_entries_entry_id ON nutrition_entries(entry_id)');

    console.log('Tables created\n');

    // Seed data
    console.log('Seeding data...');
    for (const [date, data] of Object.entries(SEED_DATA)) {
      await pool.query(
        `INSERT INTO nutrition_goals (date, calories, protein, carbs, fat)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (date) DO UPDATE SET
           calories = EXCLUDED.calories, protein = EXCLUDED.protein,
           carbs = EXCLUDED.carbs, fat = EXCLUDED.fat`,
        [date, data.goals.calories, data.goals.protein, data.goals.carbs, data.goals.fat]
      );

      for (const entry of data.entries) {
        await pool.query(
          `INSERT INTO nutrition_entries (entry_id, date, name, calories, protein, carbs, fat, entry_time)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (entry_id) DO UPDATE SET
             name = EXCLUDED.name, calories = EXCLUDED.calories,
             protein = EXCLUDED.protein, carbs = EXCLUDED.carbs,
             fat = EXCLUDED.fat, entry_time = EXCLUDED.entry_time`,
          [entry.id, entry.date, entry.name, entry.calories, entry.protein, entry.carbs, entry.fat, entry.time]
        );
      }

      console.log(`Migrated ${data.entries.length} entries for ${date}`);
    }

    // Create view
    await pool.query(`
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
    `);

    console.log('\nMigration complete!');

  } catch (error) {
    console.error('\nMigration failed:', error);
    process.exit(1);
  }

  await pool.end();
  process.exit(0);
}

migrate();
