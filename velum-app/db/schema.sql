-- Vercel Postgres Schema for Velum Nutrition Data
-- Run this in Vercel Dashboard > Storage > Postgres > Query Editor

-- Create nutrition entries table
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
);

-- Create daily goals table
CREATE TABLE IF NOT EXISTS nutrition_goals (
  id SERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  calories INTEGER NOT NULL DEFAULT 2000,
  protein INTEGER NOT NULL DEFAULT 150,
  carbs INTEGER NOT NULL DEFAULT 200,
  fat INTEGER NOT NULL DEFAULT 65,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster date queries
CREATE INDEX IF NOT EXISTS idx_nutrition_entries_date ON nutrition_entries(date);
CREATE INDEX IF NOT EXISTS idx_nutrition_entries_entry_id ON nutrition_entries(entry_id);

-- Insert default goals for today if not exists
INSERT INTO nutrition_goals (date, calories, protein, carbs, fat)
VALUES (CURRENT_DATE, 2000, 150, 200, 65)
ON CONFLICT (date) DO NOTHING;

-- View for daily summaries
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
ORDER BY date DESC;
