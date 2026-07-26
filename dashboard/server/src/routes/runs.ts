import { Router, Request, Response } from 'express';
import pool from '../db/database';

const router = Router();

// GET /api/runs - List all runs
router.get('/', async (req: Request, res: Response) => {
  const siteId = req.query.site_id as string;
  let result;

  if (siteId) {
    result = await pool.query(`
      SELECT r.*, s.name as site_name, s.base_url
      FROM runs r
      JOIN sites s ON r.site_id = s.id
      WHERE r.site_id = $1
      ORDER BY r.started_at DESC
      LIMIT 50
    `, [siteId]);
  } else {
    result = await pool.query(`
      SELECT r.*, s.name as site_name, s.base_url
      FROM runs r
      JOIN sites s ON r.site_id = s.id
      ORDER BY r.started_at DESC
      LIMIT 50
    `);
  }

  res.json(result.rows);
});

// GET /api/runs/:id - Get single run with test results
router.get('/:id', async (req: Request, res: Response) => {
  const runResult = await pool.query(`
    SELECT r.*, s.name as site_name, s.base_url
    FROM runs r
    JOIN sites s ON r.site_id = s.id
    WHERE r.id = $1
  `, [req.params.id]);

  if (runResult.rows.length === 0) return res.status(404).json({ error: 'Run not found' });

  const testsResult = await pool.query('SELECT * FROM test_results WHERE run_id = $1', [req.params.id]);
  res.json({ ...runResult.rows[0], tests: testsResult.rows });
});

// GET /api/runs/stats/summary - Get stats summary
router.get('/stats/summary', async (_req: Request, res: Response) => {
  const result = await pool.query(`
    SELECT
      COUNT(*)::int as total_runs,
      SUM(CASE WHEN status = 'completed' AND failed = 0 THEN 1 ELSE 0 END)::int as successful_runs,
      SUM(CASE WHEN (status = 'completed' AND failed > 0) OR status = 'error' THEN 1 ELSE 0 END)::int as failed_runs,
      SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END)::int as running_runs,
      AVG(total_duration_ms)::int as avg_duration_ms,
      SUM(passed)::int as total_passed,
      SUM(failed)::int as total_failed,
      SUM(slow_api_count)::int as total_slow_apis
    FROM runs
  `);

  res.json(result.rows[0]);
});

export default router;
