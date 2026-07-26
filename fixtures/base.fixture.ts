import { test as base, expect } from '@playwright/test';
import dotenv from 'dotenv';
import { login, saveSession, getSessionPath, hasSession } from '../core/auth-helper';
import { attachApiMonitor, getSlowApis as getSlowApisFn } from '../core/api-monitor';
import { SlowApiEntry, SiteConfig } from '../core/types';

dotenv.config();

// ─── Extended test fixtures ────────────────────────────────────────────────────

/**
 * Base fixture that:
 * 1. Reuses a saved login session (or logs in fresh if none exists)
 * 2. Attaches API response time monitoring to every page
 * 3. Exposes getSlowApis() so tests can assert on slow calls
 */
export const test = base.extend<{
  getSlowApis: () => SlowApiEntry[];
  siteConfig: SiteConfig | null;
}>({
  // Default siteConfig — override per project via test.use({ siteConfig: ... })
  siteConfig: [null, { option: true }],

  // Wrap the built-in page fixture
  page: async ({ page, siteConfig, context }, use) => {
    const thresholdMs = Number(process.env.SLOW_API_THRESHOLD_MS ?? 2000);

    // Attach API monitor before anything loads — stores results globally
    attachApiMonitor(page, thresholdMs);

    // Restore session if available
    if (siteConfig) {
      const siteName = siteConfig.name.toLowerCase().replace(/\s+/g, '-');

      if (hasSession(siteName)) {
        // Session exists — restore cookies/localStorage from disk
        await context.addCookies(
          JSON.parse(
            require('fs').readFileSync(getSessionPath(siteName), 'utf8')
          ).cookies ?? []
        );
      } else {
        // No session — do a full login and save it
        await login(page, siteConfig);
        await saveSession(page, siteName);
      }
    }

    await use(page);
  },

  // Expose the slow API getter — reuses the same monitor attached in page fixture
  getSlowApis: async ({ page }, use) => {
    await use(() => getSlowApisFn(page));
  },
});

export { expect };
