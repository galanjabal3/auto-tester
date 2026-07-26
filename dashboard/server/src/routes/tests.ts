import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import pool from '../db/database';
import { writeYamlConfig } from '../utils/yaml-generator';

const router = Router();
const AUTO_TESTER_ROOT = path.join(__dirname, '..', '..', '..', '..');
const TESTS_DIR = path.join(AUTO_TESTER_ROOT, 'tests', 'flows');

// GET /api/tests/specs/:siteId - Get all recorded specs for a site
router.get('/specs/:siteId', async (req: Request, res: Response) => {
  const result = await pool.query(
    'SELECT * FROM test_specs WHERE site_id = $1 ORDER BY created_at DESC',
    [req.params.siteId]
  );
  res.json(result.rows);
});

// POST /api/tests/generate - Save Playwright Codegen spec + add test name to YAML
router.post('/generate', async (req: Request, res: Response) => {
  const { site_id, test_name, code } = req.body;

  if (!site_id || !test_name || !code) {
    return res.status(400).json({ error: 'site_id, test_name, and code are required' });
  }

  // Fetch site
  const siteResult = await pool.query('SELECT * FROM sites WHERE id = $1', [site_id]);
  if (siteResult.rows.length === 0) return res.status(404).json({ error: 'Site not found' });

  const site = siteResult.rows[0];

  // Fix imports: @playwright/test → base.fixture
  let fixedCode = code.replace(
    /import\s*\{\s*test\s*,\s*expect\s*\}\s*from\s*['"]@playwright\/test['"]\s*;?/,
    "import { test, expect } from '../../fixtures/base.fixture';"
  );

  // Replace hardcoded base_url with process.env.BASE_URL
  if (site.base_url) {
    const escaped = site.base_url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    fixedCode = fixedCode.replace(
      new RegExp(`['"]${escaped}([^'"]*)['"]`, 'g'),
      (match: string, urlPath: string) => `\`\${process.env.BASE_URL}${urlPath}\``
    );
  }

  // Replace test title with user-provided name
  fixedCode = fixedCode.replace(
    /test\(\s*['"][^'"]*['"]\s*,/s,
    `test('${test_name}',`
  );

  // Write spec file
  fs.mkdirSync(TESTS_DIR, { recursive: true });
  const slug = test_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const specPath = path.join(TESTS_DIR, `${slug}.spec.ts`);
  fs.writeFileSync(specPath, fixedCode);

  // Add test name to site's tests array
  const currentTests = typeof site.tests === 'string' ? JSON.parse(site.tests) : (site.tests || []);
  if (!currentTests.includes(test_name)) {
    currentTests.push(test_name);
    await pool.query('UPDATE sites SET tests = $1, updated_at = NOW() WHERE id = $2', [
      JSON.stringify(currentTests),
      site_id,
    ]);
    // Regenerate YAML
    writeYamlConfig({ ...site, tests: currentTests });
  }

  // Save code to DB (upsert — overwrite if same site+test_name)
  await pool.query(`
    INSERT INTO test_specs (site_id, test_name, code, spec_file)
    VALUES ($1, $2, $3, $4)
    ON CONFLICT (site_id, test_name) DO UPDATE SET code = $3, spec_file = $4, created_at = NOW()
  `, [site_id, test_name, fixedCode, `${slug}.spec.ts`]);

  res.status(201).json({
    success: true,
    spec_file: `${slug}.spec.ts`,
    test_name,
    message: `Spec saved and test added to ${site.name}`,
  });
});

export default router;
