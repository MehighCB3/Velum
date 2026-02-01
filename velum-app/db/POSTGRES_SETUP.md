# Vercel Postgres Setup Guide

## Quick Setup

### 1. Create Postgres Database
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your Velum project
3. Go to **Storage** tab
4. Click **Create Database** → **Postgres**
5. Choose region (recommended: `iad1` for US East or `fra1` for EU)
6. Click **Create**

### 2. Connect to Project
1. After creation, click **Connect Project**
2. Select your Velum project
3. Environment variables will be auto-added:
   - `POSTGRES_URL`
   - `POSTGRES_PRISMA_URL`
   - `POSTGRES_URL_NON_POOLING`
   - `POSTGRES_USER`
   - `POSTGRES_HOST`
   - `POSTGRES_PASSWORD`
   - `POSTGRES_DATABASE`

### 3. Run Migration
```bash
cd velum-app
npm install
npm run db:migrate
```

Or manually run the SQL in Vercel Dashboard → Storage → Postgres → Query Editor:
```sql
-- Run contents of db/schema.sql
```

### 4. Deploy
```bash
vercel --prod
```

## Architecture

```
┌─────────────────┐
│   Velum App     │
│  (Next.js 14)   │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐  ┌──────────┐
│Postgres│  │  Redis   │
│Primary │  │ Fallback │
└────────┘  └──────────┘
```

**Priority:**
1. Vercel Postgres (if `POSTGRES_URL` exists)
2. Upstash Redis (if configured)
3. File/Memory (fallback)

## Benefits

- **ACID compliance** — No data loss on concurrent writes
- **Persistent storage** — Data survives redeploys
- **Zero cold starts** — Connection pooling included
- **Free tier** — 256 MB storage, 60 compute hours/month
- **Automatic backups** — Daily snapshots

## Schema

### nutrition_entries
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| entry_id | VARCHAR(50) | Unique entry ID |
| date | DATE | Entry date |
| name | VARCHAR(255) | Food name |
| calories | INTEGER | Calories |
| protein | DECIMAL(6,2) | Protein (g) |
| carbs | DECIMAL(6,2) | Carbs (g) |
| fat | DECIMAL(6,2) | Fat (g) |
| entry_time | TIME | Time of entry |
| created_at | TIMESTAMP | Auto timestamp |

### nutrition_goals
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Primary key |
| date | DATE | Goal date |
| calories | INTEGER | Calorie goal |
| protein | INTEGER | Protein goal |
| carbs | INTEGER | Carbs goal |
| fat | INTEGER | Fat goal |

## Troubleshooting

### "Cannot find module '@vercel/postgres'"
```bash
npm install @vercel/postgres
```

### "POSTGRES_URL not found"
- Check Vercel Dashboard → Settings → Environment Variables
- Redeploy after adding database

### Migration fails
- Check database connection string
- Run SQL manually in Query Editor
- Check Vercel Postgres logs

## Monitoring

View in Vercel Dashboard:
- Query performance
- Connection count
- Storage usage
- Compute hours
