import fs from 'fs';
import path from 'path';
import { RunSummary, Reporter } from '../core/types';

const REPORTS_DIR = path.resolve(process.cwd(), 'reports');
const HISTORY_FILE = path.join(REPORTS_DIR, 'history.json');

export class JsonReporter implements Reporter {
  async report(summary: RunSummary): Promise<void> {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });

    // Save individual run
    const runFile = path.join(REPORTS_DIR, `run-${summary.run_id}.json`);
    fs.writeFileSync(runFile, JSON.stringify(summary, null, 2), 'utf8');

    // Append to history log
    this.appendToHistory(summary);

    console.log(`\n💾 JSON report saved: ${runFile}`);
  }

  // ─── Internal ────────────────────────────────────────────────────────────────

  private appendToHistory(summary: RunSummary): void {
    let history: object[] = [];

    if (fs.existsSync(HISTORY_FILE)) {
      try {
        history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
      } catch {
        history = [];
      }
    }

    // Keep lightweight entries in history (not full test details)
    history.push({
      run_id:           summary.run_id,
      started_at:       summary.started_at,
      overall_status:   summary.overall_status,
      total_passed:     summary.total_passed,
      total_failed:     summary.total_failed,
      total_slow_apis:  summary.total_slow_apis,
      sites:            summary.sites.map(s => s.site_name),
    });

    // Keep last 100 entries
    if (history.length > 100) history = history.slice(-100);

    fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
  }
}
