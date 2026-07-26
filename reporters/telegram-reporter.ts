import axios from 'axios';
import { RunSummary, SlowApiEntry } from '../core/types';
import { Reporter } from '../core/types';

export class TelegramReporter implements Reporter {
  private botToken: string;
  private chatId: string;

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN ?? '';
    this.chatId   = process.env.TELEGRAM_CHAT_ID   ?? '';
  }

  async report(summary: RunSummary): Promise<void> {
    if (!this.botToken || !this.chatId) {
      console.log('  ℹ Telegram not configured — skipping notification');
      return;
    }

    // Only notify when something is wrong
    if (summary.overall_status === 'pass' && summary.total_slow_apis === 0) {
      console.log('  ✓ All tests passed, no slow APIs — Telegram notification skipped');
      return;
    }

    const message = this.buildMessage(summary);
    await this.sendMessage(message);
    console.log('  📨 Telegram notification sent');
  }

  // ─── Internal ────────────────────────────────────────────────────────────────

  private buildMessage(summary: RunSummary): string {
    const statusIcon = summary.overall_status === 'pass' ? '✅' : '🚨';
    const lines: string[] = [
      `${statusIcon} *Auto-Tester Report*`,
      `🕐 ${new Date(summary.started_at).toLocaleString()}`,
      '',
      `• Passed: ${summary.total_passed}`,
      `• Failed: ${summary.total_failed}`,
      `• Slow APIs: ${summary.total_slow_apis}`,
      '',
    ];

    // Failed tests
    const failedTests = summary.sites
      .flatMap(s => s.tests.filter(t => t.status === 'fail').map(t => ({ site: s.site_name, test: t })));

    if (failedTests.length > 0) {
      lines.push('*Failed tests:*');
      for (const { site, test } of failedTests.slice(0, 5)) {
        lines.push(`  ✗ [${site}] ${test.test_name}`);
        if (test.error) lines.push(`    \`${test.error.slice(0, 120)}\``);
      }
      if (failedTests.length > 5) lines.push(`  ...and ${failedTests.length - 5} more`);
      lines.push('');
    }

    // Slow APIs
    const allSlowApis: Array<SlowApiEntry & { site: string }> = summary.sites.flatMap(s =>
      s.tests.flatMap(t => t.slow_apis.map(a => ({ ...a, site: s.site_name })))
    );

    if (allSlowApis.length > 0) {
      lines.push('*Slow APIs:*');
      for (const api of allSlowApis.slice(0, 5)) {
        lines.push(`  ⚠ [${api.site}] ${api.method} — ${api.duration_ms}ms`);
        lines.push(`    \`${truncateUrl(api.url, 60)}\``);
      }
      if (allSlowApis.length > 5) lines.push(`  ...and ${allSlowApis.length - 5} more`);
    }

    return lines.join('\n');
  }

  private async sendMessage(text: string): Promise<void> {
    const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;

    await axios.post(url, {
      chat_id:    this.chatId,
      text,
      parse_mode: 'Markdown',
    });
  }
}

function truncateUrl(url: string, maxLen: number): string {
  return url.length > maxLen ? `${url.slice(0, maxLen)}…` : url;
}
