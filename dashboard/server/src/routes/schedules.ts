import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db/database';

const router = Router();

// GET /api/schedules - List all schedules
router.get('/', async (_req: Request, res: Response) => {
  const result = await pool.query(`
    SELECT sc.*, s.name as site_name, s.base_url
    FROM schedules sc
    JOIN sites s ON sc.site_id = s.id
    ORDER BY sc.created_at DESC
  `);
  res.json(result.rows);
});

// POST /api/schedules - Create schedule
router.post('/', async (req: Request, res: Response) => {
  const { site_id, cron_expression } = req.body;

  if (!site_id || !cron_expression) {
    return res.status(400).json({ error: 'site_id and cron_expression are required' });
  }

  const siteResult = await pool.query('SELECT * FROM sites WHERE id = $1', [site_id]);
  if (siteResult.rows.length === 0) return res.status(404).json({ error: 'Site not found' });

  const id = uuidv4();
  const result = await pool.query(`
    INSERT INTO schedules (id, site_id, cron_expression)
    VALUES ($1, $2, $3)
    RETURNING *
  `, [id, site_id, cron_expression]);

  res.status(201).json(result.rows[0]);
});

// PUT /api/schedules/:id - Update schedule
router.put('/:id', async (req: Request, res: Response) => {
  const { cron_expression, enabled } = req.body;

  const result = await pool.query(`
    UPDATE schedules SET
      cron_expression = COALESCE($1, cron_expression),
      enabled = COALESCE($2, enabled)
    WHERE id = $3
    RETURNING *
  `, [cron_expression, enabled, req.params.id]);

  if (result.rows.length === 0) return res.status(404).json({ error: 'Schedule not found' });
  res.json(result.rows[0]);
});

// DELETE /api/schedules/:id - Delete schedule
router.delete('/:id', async (req: Request, res: Response) => {
  const result = await pool.query('DELETE FROM schedules WHERE id = $1', [req.params.id]);
  if (result.rowCount === 0) return res.status(404).json({ error: 'Schedule not found' });
  res.json({ success: true });
});

export default router;
