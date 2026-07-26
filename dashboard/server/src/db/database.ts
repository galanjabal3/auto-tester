import { Pool } from 'pg';

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'auto_tester',
  user: 'admin',
  password: '',
});

// Create tables
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS sites (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        base_url TEXT NOT NULL,
        login_path TEXT DEFAULT '/login',
        email_field TEXT DEFAULT '[name="email"]',
        password_field TEXT DEFAULT '[name="password"]',
        submit_button TEXT DEFAULT 'button[type="submit"]',
        success_selector TEXT,
        api_threshold_ms INTEGER DEFAULT 2000,
        tests JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS runs (
        id UUID PRIMARY KEY,
        site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
        status TEXT DEFAULT 'pending',
        started_at TIMESTAMP,
        finished_at TIMESTAMP,
        total_duration_ms INTEGER,
        passed INTEGER DEFAULT 0,
        failed INTEGER DEFAULT 0,
        skipped INTEGER DEFAULT 0,
        slow_api_count INTEGER DEFAULT 0,
        error_log TEXT
      );

      CREATE TABLE IF NOT EXISTS test_results (
        id SERIAL PRIMARY KEY,
        run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
        test_name TEXT NOT NULL,
        status TEXT NOT NULL,
        duration_ms INTEGER DEFAULT 0,
        error TEXT,
        screenshot_path TEXT,
        video_path TEXT,
        slow_apis JSONB DEFAULT '[]',
        timestamp TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS schedules (
        id UUID PRIMARY KEY,
        site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
        cron_expression TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
        last_run TIMESTAMP,
        next_run TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS test_specs (
        id SERIAL PRIMARY KEY,
        site_id UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
        test_name TEXT NOT NULL,
        code TEXT NOT NULL,
        spec_file TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(site_id, test_name)
      );
    `);

      // Migration: add video_path column if missing
      await client.query(`
        DO $$ BEGIN
          ALTER TABLE test_results ADD COLUMN IF NOT EXISTS video_path TEXT;
        EXCEPTION WHEN duplicate_column THEN null;
        END $$;
      `);

    console.log('  PostgreSQL tables initialized');
  } finally {
    client.release();
  }
}

initDB().catch(console.error);

export default pool;
