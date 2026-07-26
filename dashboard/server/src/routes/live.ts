import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import pool from '../db/database';
import { extractTests } from '../utils/parse-results';
import { writeYamlConfig } from '../utils/yaml-generator';

const router = Router();
const AUTO_TESTER_ROOT = path.join(__dirname, '..', '..', '..', '..');

// Store active SSE connections per run
const liveClients = new Map<string, Set<Response>>();

// POST /api/live/live - Start a run, return runId
router.post('/live', async (req: Request, res: Response) => {
  const { site_id, tests } = req.body;

  if (!site_id) return res.status(400).json({ error: 'site_id is required' });

  const siteResult = await pool.query('SELECT * FROM sites WHERE id = $1', [site_id]);
  if (siteResult.rows.length === 0) return res.status(404).json({ error: 'Site not found' });

  const site = siteResult.rows[0];
  const runId = uuidv4();

  // Create run record
  await pool.query(`
    INSERT INTO runs (id, site_id, status, started_at)
    VALUES ($1, $2, 'running', NOW())
  `, [runId, site_id]);

  // Return runId immediately — client connects to SSE separately
  res.status(201).json({ runId, status: 'running' });

  // Write YAML config with selected tests (or all if not specified)
  const testsToRun = (tests && tests.length > 0) ? tests : (site.tests || []);
  writeYamlConfig({ ...site, tests: testsToRun });

  const siteSlug = site.name.toLowerCase().replace(/\s+/g, '-');

  // Run tests in background
  runTestsInBackground(runId, siteSlug, site.name);
});

// GET /api/live/live/:runId - SSE stream for a run
router.get('/live/:runId', async (req: Request, res: Response) => {
  const runId = req.params.runId as string;

  // Check if run exists
  const runResult = await pool.query('SELECT * FROM runs WHERE id = $1', [runId]);
  if (runResult.rows.length === 0) return res.status(404).json({ error: 'Run not found' });

  const run = runResult.rows[0];

  // Setup SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // If run already completed, send stored results and close
  if (run.status !== 'running') {
    const tests = await pool.query('SELECT * FROM test_results WHERE run_id = $1 ORDER BY id', [runId]);
    for (const test of tests.rows) {
      sendEvent(res, 'testcomplete', {
        test_name: test.test_name,
        status: test.status,
        duration_ms: test.duration_ms,
        error: test.error,
        index: tests.rows.indexOf(test) + 1,
        total: tests.rows.length,
      });
    }
    sendEvent(res, 'runcomplete', { runId, passed: run.passed, failed: run.failed, skipped: run.skipped });
    res.end();
    return;
  }

  // Run still in progress — join live stream
  if (!liveClients.has(runId)) liveClients.set(runId, new Set());
  liveClients.get(runId)!.add(res);

  // Send initial event so client knows it's connected
  sendEvent(res, 'connected', { runId });

  req.on('close', () => {
    const clients = liveClients.get(runId);
    if (clients) clients.delete(res);
  });
});

// Background test runner
async function runTestsInBackground(runId: string, siteSlug: string, siteName: string) {
  const runStartTime = Date.now();
  try {
    await new Promise<void>((resolve, reject) => {
      const proc = spawn('npx', ['ts-node', 'cli/index.ts', 'run', '--site', siteSlug], {
        cwd: AUTO_TESTER_ROOT,
        stdio: 'pipe',
        timeout: 300000,
      });
      let stderr = '';
      proc.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(stderr || `Process exited with code ${code}`));
      });
      proc.on('error', reject);
    });

    // Parse results using shared utility
    const resultsFile = path.join(AUTO_TESTER_ROOT, 'reports', 'results.json');
    const testRows = extractTests(
      fs.existsSync(resultsFile)
        ? JSON.parse(fs.readFileSync(resultsFile, 'utf8')).suites ?? []
        : []
    );

    // Send each test result as SSE event
    for (let i = 0; i < testRows.length; i++) {
      const test = testRows[i];
      broadcast(runId, 'testcomplete', {
        test_name: test.test_name,
        status: test.status,
        duration_ms: test.duration_ms,
        error: test.error,
        index: i + 1,
        total: testRows.length,
      });

      // Save to DB
      await pool.query(`
        INSERT INTO test_results (run_id, test_name, status, duration_ms, error, screenshot_path, video_path, slow_apis)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [runId, test.test_name, test.status, test.duration_ms, test.error, test.screenshot_path, test.video_path, JSON.stringify(test.slow_apis)]);

      // Small delay so frontend can see each event
      await new Promise(r => setTimeout(r, 100));
    }

    const passed = testRows.filter(t => t.status === 'pass').length;
    const failed = testRows.filter(t => t.status === 'fail').length;
    const skipped = testRows.filter(t => t.status === 'skip').length;
    const durationMs = Date.now() - runStartTime;

    await pool.query(`
      UPDATE runs SET
        status = 'completed',
        finished_at = NOW(),
        total_duration_ms = $1,
        passed = $2,
        failed = $3,
        skipped = $4
      WHERE id = $5
    `, [durationMs, passed, failed, skipped, runId]);

    // Send run completed event
    broadcast(runId, 'runcomplete', { runId, passed, failed, skipped });

  } catch (err: any) {
    await pool.query(`
      UPDATE runs SET status = 'failed', error_log = $1, finished_at = NOW()
      WHERE id = $2
    `, [err.message, runId]);

    broadcast(runId, 'runerror', { error: err.message });
  } finally {
    // Clean up connections after a delay
    setTimeout(() => {
      const clients = liveClients.get(runId);
      if (clients) {
        clients.forEach(client => {
          try { client.end(); } catch {}
        });
        liveClients.delete(runId);
      }
    }, 2000);
  }
}

function sendEvent(res: Response, event: string, data: any) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function broadcast(runId: string, event: string, data: any) {
  const clients = liveClients.get(runId);
  if (clients) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    clients.forEach(client => {
      try { client.write(payload); } catch {}
    });
  }
}

export default router;
