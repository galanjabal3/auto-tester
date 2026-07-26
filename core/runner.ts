import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { SiteConfig, RunSummary, SiteResult, TestResult } from './types';
import { parsePlaywrightResults } from './utils/parse-results';
import { HtmlReporter } from '../reporters/html-reporter';
import { TelegramReporter } from '../reporters/telegram-reporter';
import { JsonReporter } from '../reporters/json-reporter';

export interface RunOptions {
  /** Called when each test completes — useful for live streaming */
  onTestComplete?: (test: TestResult, index: number, total: number) => void;
}

/**
 * Run all configured tests for a given site config.
 * Executes Playwright and parses the JSON results file.
 */
export async function runSite(config: SiteConfig, options?: RunOptions): Promise<SiteResult> {
  const startedAt = new Date().toISOString();
  const start     = Date.now();

  console.log(`\n🌐 Testing: ${config.name} (${config.base_url})`);
  console.log(`   Tests: ${config.tests.join(', ')}`);

  // Set env vars so playwright.config.ts and tests pick them up
  process.env.BASE_URL               = config.base_url;
  process.env.SLOW_API_THRESHOLD_MS  = String(config.thresholds.api_response_ms);

  // Build grep pattern to only run tests listed in this site's config
  const grepPattern = config.tests.join('|');

  const resultsFile = path.resolve(process.cwd(), 'reports', 'results.json');
  fs.mkdirSync(path.dirname(resultsFile), { recursive: true });

  // Clean previous results so we don't read stale data
  if (fs.existsSync(resultsFile)) fs.unlinkSync(resultsFile);

  try {
    execSync(
      `npx playwright test --grep "${grepPattern}"`,
      {
        env:   { ...process.env },
        stdio: 'inherit',
      }
    );
  } catch {
    // Playwright exits with non-zero on test failures — that's expected, continue
  }

  const tests     = parsePlaywrightResults(resultsFile);
  const passed    = tests.filter(t => t.status === 'pass').length;
  const failed    = tests.filter(t => t.status === 'fail').length;
  const skipped   = tests.filter(t => t.status === 'skip').length;
  const slowApis  = tests.reduce((sum, t) => sum + t.slow_apis.length, 0);

  // Emit per-test results for live streaming
  if (options?.onTestComplete) {
    tests.forEach((test, i) => options.onTestComplete!(test, i, tests.length));
  }

  return {
    site_name:         config.name,
    base_url:          config.base_url,
    started_at:        startedAt,
    finished_at:       new Date().toISOString(),
    total_duration_ms: Date.now() - start,
    passed,
    failed,
    skipped,
    slow_api_count:    slowApis,
    tests,
  };
}

/**
 * Run tests for multiple sites and generate all reports.
 */
export async function runAll(configs: SiteConfig[]): Promise<RunSummary> {
  const runId     = generateRunId();
  const startedAt = new Date().toISOString();

  console.log(`\n🚀 Auto-Tester starting — Run ${runId}`);
  console.log(`   Sites: ${configs.map(c => c.name).join(', ')}`);

  const siteResults: SiteResult[] = [];

  for (const config of configs) {
    const result = await runSite(config);
    siteResults.push(result);
  }

  const summary: RunSummary = {
    run_id:           runId,
    started_at:       startedAt,
    finished_at:      new Date().toISOString(),
    sites:            siteResults,
    total_passed:     siteResults.reduce((sum, s) => sum + s.passed,         0),
    total_failed:     siteResults.reduce((sum, s) => sum + s.failed,         0),
    total_slow_apis:  siteResults.reduce((sum, s) => sum + s.slow_api_count, 0),
    overall_status:   siteResults.every(s => s.failed === 0) ? 'pass' : 'fail',
  };

  // Run all reporters
  const reporters = [new HtmlReporter(), new JsonReporter(), new TelegramReporter()];
  for (const reporter of reporters) {
    await reporter.report(summary);
  }

  printSummary(summary);
  return summary;
}

// ─── Internal ──────────────────────────────────────────────────────────────────

function generateRunId(): string {
  const now = new Date();
  return `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
}

function printSummary(summary: RunSummary): void {
  const icon = summary.overall_status === 'pass' ? '✅' : '❌';
  console.log(`\n${icon} Run complete — ${summary.overall_status.toUpperCase()}`);
  console.log(`   Passed:     ${summary.total_passed}`);
  console.log(`   Failed:     ${summary.total_failed}`);
  console.log(`   Slow APIs:  ${summary.total_slow_apis}`);
  console.log(`   Duration:   ${summary.sites.reduce((a, s) => a + s.total_duration_ms, 0)}ms\n`);
}
