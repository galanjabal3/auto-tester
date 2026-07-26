import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../db/database';
import { writeYamlConfig, removeYamlConfig } from '../utils/yaml-generator';

const router = Router();

// GET /api/sites - List all sites
router.get('/', async (_req: Request, res: Response) => {
  const result = await pool.query('SELECT * FROM sites ORDER BY created_at DESC');
  res.json(result.rows);
});

// GET /api/sites/:id - Get single site
router.get('/:id', async (req: Request, res: Response) => {
  const result = await pool.query('SELECT * FROM sites WHERE id = $1', [req.params.id]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'Site not found' });
  res.json(result.rows[0]);
});

// POST /api/sites - Create site
router.post('/', async (req: Request, res: Response) => {
  const {
    name, base_url, login_path, email_field, password_field,
    submit_button, success_selector, api_threshold_ms, tests
  } = req.body;

  if (!name || !base_url) {
    return res.status(400).json({ error: 'name and base_url are required' });
  }

  const id = uuidv4();
  const siteData = {
    name,
    base_url,
    login_path: login_path || '/login',
    email_field: email_field || '[name="email"]',
    password_field: password_field || '[name="password"]',
    submit_button: submit_button || 'button[type="submit"]',
    success_selector: success_selector || null,
    api_threshold_ms: api_threshold_ms || 2000,
    tests: tests || [],
  };

  const result = await pool.query(`
    INSERT INTO sites (id, name, base_url, login_path, email_field, password_field, submit_button, success_selector, api_threshold_ms, tests)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
  `, [id, siteData.name, siteData.base_url, siteData.login_path, siteData.email_field, siteData.password_field, siteData.submit_button, siteData.success_selector, siteData.api_threshold_ms, JSON.stringify(siteData.tests)]);

  // Auto-generate YAML config
  try {
    writeYamlConfig({ ...siteData, id });
    console.log(`  YAML config created: ${siteData.name.toLowerCase().replace(/\s+/g, '-')}.yaml`);
  } catch (err: any) {
    console.error('Failed to generate YAML config:', err.message);
  }

  res.status(201).json(result.rows[0]);
});

// PUT /api/sites/:id - Update site
router.put('/:id', async (req: Request, res: Response) => {
  const {
    name, base_url, login_path, email_field, password_field,
    submit_button, success_selector, api_threshold_ms, tests
  } = req.body;

  // Get current site name for YAML removal
  const oldResult = await pool.query('SELECT name FROM sites WHERE id = $1', [req.params.id]);
  const oldName = oldResult.rows[0]?.name;

  const result = await pool.query(`
    UPDATE sites SET
      name = COALESCE($1, name),
      base_url = COALESCE($2, base_url),
      login_path = COALESCE($3, login_path),
      email_field = COALESCE($4, email_field),
      password_field = COALESCE($5, password_field),
      submit_button = COALESCE($6, submit_button),
      success_selector = $7,
      api_threshold_ms = COALESCE($8, api_threshold_ms),
      tests = COALESCE($9, tests),
      updated_at = NOW()
    WHERE id = $10
    RETURNING *
  `, [name, base_url, login_path, email_field, password_field, submit_button, success_selector ?? null, api_threshold_ms, tests ? JSON.stringify(tests) : null, req.params.id]);

  if (result.rows.length === 0) return res.status(404).json({ error: 'Site not found' });

  // Regenerate YAML config
  try {
    if (oldName && oldName !== name) removeYamlConfig(oldName);
    writeYamlConfig(result.rows[0]);
    console.log(`  YAML config updated: ${result.rows[0].name.toLowerCase().replace(/\s+/g, '-')}.yaml`);
  } catch (err: any) {
    console.error('Failed to update YAML config:', err.message);
  }

  res.json(result.rows[0]);
});

// DELETE /api/sites/:id - Delete site
router.delete('/:id', async (req: Request, res: Response) => {
  // Get site name for YAML removal
  const siteResult = await pool.query('SELECT name FROM sites WHERE id = $1', [req.params.id]);
  const siteName = siteResult.rows[0]?.name;

  const result = await pool.query('DELETE FROM sites WHERE id = $1', [req.params.id]);
  if (result.rowCount === 0) return res.status(404).json({ error: 'Site not found' });

  // Remove YAML config
  if (siteName) {
    try {
      removeYamlConfig(siteName);
      console.log(`  YAML config removed: ${siteName.toLowerCase().replace(/\s+/g, '-')}.yaml`);
    } catch (err: any) {
      console.error('Failed to remove YAML config:', err.message);
    }
  }

  res.json({ success: true });
});

export default router;
