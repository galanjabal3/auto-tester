import fs from 'fs';
import path from 'path';
import { RunSummary, SiteResult, TestResult } from '../core/types';
import { Reporter } from '../core/types';

const REPORTS_DIR = path.resolve(process.cwd(), 'reports');

export class HtmlReporter implements Reporter {
  async report(summary: RunSummary): Promise<void> {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });

    const html     = buildHtml(summary);
    const filePath = path.join(REPORTS_DIR, `report-${summary.run_id}.html`);

    fs.writeFileSync(filePath, html, 'utf8');
    console.log(`\n📄 HTML report saved: ${filePath}`);
  }
}

// ─── HTML builder ──────────────────────────────────────────────────────────────

function buildHtml(summary: RunSummary): string {
  const statusColor = summary.overall_status === 'pass' ? '#16a34a' : '#dc2626';
  const statusLabel = summary.overall_status === 'pass' ? '✓ All Passed' : '✗ Failures Detected';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Auto-Tester Report — ${summary.run_id}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 960px; margin: 40px auto; padding: 0 20px; color: #111; background: #f9fafb; }
    h1 { font-size: 1.5rem; font-weight: 600; margin-bottom: 4px; }
    .meta { color: #6b7280; font-size: .875rem; margin-bottom: 32px; }
    .summary-bar { display: flex; gap: 16px; margin-bottom: 32px; flex-wrap: wrap; }
    .stat { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px 24px; min-width: 100px; }
    .stat-value { font-size: 2rem; font-weight: 700; line-height: 1; }
    .stat-label { font-size: .75rem; color: #6b7280; margin-top: 4px; text-transform: uppercase; letter-spacing: .05em; }
    .pass  { color: #16a34a; }
    .fail  { color: #dc2626; }
    .slow  { color: #d97706; }
    .site  { background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 24px; overflow: hidden; }
    .site-header { padding: 16px 20px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
    .site-name { font-weight: 600; }
    .badge { font-size: .75rem; padding: 2px 10px; border-radius: 999px; font-weight: 500; }
    .badge-pass { background: #dcfce7; color: #15803d; }
    .badge-fail { background: #fee2e2; color: #b91c1c; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px 20px; text-align: left; font-size: .875rem; border-bottom: 1px solid #f3f4f6; }
    th { background: #f9fafb; color: #6b7280; font-weight: 500; }
    .slow-apis { padding: 12px 20px; background: #fffbeb; border-top: 1px solid #fde68a; font-size: .8125rem; }
    .slow-api-item { margin: 4px 0; color: #92400e; }
  </style>
</head>
<body>
  <h1>Auto-Tester Report</h1>
  <div class="meta">
    Run ID: ${summary.run_id} &nbsp;·&nbsp;
    ${new Date(summary.started_at).toLocaleString()} &nbsp;·&nbsp;
    Duration: ${((summary.sites.reduce((a, s) => a + s.total_duration_ms, 0)) / 1000).toFixed(1)}s
  </div>

  <div style="margin-bottom:24px;padding:12px 20px;background:#fff;border:1.5px solid ${statusColor};border-radius:8px;color:${statusColor};font-weight:600;font-size:1.1rem">
    ${statusLabel}
  </div>

  <div class="summary-bar">
    <div class="stat"><div class="stat-value pass">${summary.total_passed}</div><div class="stat-label">Passed</div></div>
    <div class="stat"><div class="stat-value fail">${summary.total_failed}</div><div class="stat-label">Failed</div></div>
    <div class="stat"><div class="stat-value slow">${summary.total_slow_apis}</div><div class="stat-label">Slow APIs</div></div>
    <div class="stat"><div class="stat-value">${summary.sites.length}</div><div class="stat-label">Sites</div></div>
  </div>

  ${summary.sites.map(renderSite).join('\n')}
</body>
</html>`;
}

function renderSite(site: SiteResult): string {
  const status      = site.failed > 0 ? 'fail' : 'pass';
  const badgeClass  = `badge badge-${status}`;
  const badgeLabel  = status === 'pass' ? 'Passed' : 'Failed';
  const allSlowApis = site.tests.flatMap(t => t.slow_apis);

  return `
  <div class="site">
    <div class="site-header">
      <div>
        <span class="site-name">${site.site_name}</span>
        <span style="color:#6b7280;font-size:.8125rem;margin-left:8px">${site.base_url}</span>
      </div>
      <span class="${badgeClass}">${badgeLabel}</span>
    </div>
    <table>
      <thead><tr><th>Test</th><th>Status</th><th>Duration</th><th>Slow APIs</th></tr></thead>
      <tbody>
        ${site.tests.map(renderTestRow).join('\n')}
      </tbody>
    </table>
    ${allSlowApis.length > 0 ? `
    <div class="slow-apis">
      <strong>⚠ Slow APIs detected:</strong>
      ${allSlowApis.map(a => `<div class="slow-api-item">${a.method} ${a.url} — ${a.duration_ms}ms</div>`).join('')}
    </div>` : ''}
  </div>`;
}

function renderTestRow(test: TestResult): string {
  const icon  = test.status === 'pass' ? '✓' : test.status === 'fail' ? '✗' : '–';
  const color = test.status === 'pass' ? '#16a34a' : test.status === 'fail' ? '#dc2626' : '#6b7280';

  return `<tr>
    <td>${test.test_name}${test.error ? `<br><span style="color:#dc2626;font-size:.75rem">${test.error}</span>` : ''}</td>
    <td style="color:${color};font-weight:500">${icon} ${test.status}</td>
    <td>${test.duration_ms}ms</td>
    <td>${test.slow_apis.length > 0 ? `<span class="slow">${test.slow_apis.length} slow</span>` : '—'}</td>
  </tr>`;
}
