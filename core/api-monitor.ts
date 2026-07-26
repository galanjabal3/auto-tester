import { Page } from '@playwright/test';
import { SlowApiEntry } from './types';

// Store getter functions keyed by page to avoid duplicate monitors
const monitorStore = new WeakMap<Page, () => SlowApiEntry[]>();

/**
 * Attach a response listener to the page that tracks every API call.
 * Slow responses (above the threshold) are collected and returned.
 *
 * Call this once per test page — typically inside the base fixture.
 *
 * @returns A function that returns the list of slow API entries collected so far.
 */
export function attachApiMonitor(
  page: Page,
  thresholdMs: number
): () => SlowApiEntry[] {
  // Reuse existing monitor if already attached to this page
  const existing = monitorStore.get(page);
  if (existing) return existing;

  const slowApis: SlowApiEntry[] = [];

  page.on('response', response => {
    const request = response.request();
    const timing  = request.timing();

    // timing.responseEnd is -1 when not yet finished — skip those
    if (timing.responseEnd < 0) return;

    // Only monitor XHR / fetch calls (skip images, fonts, CSS, etc.)
    const resourceType = request.resourceType();
    if (!['xhr', 'fetch'].includes(resourceType)) return;

    const duration = Math.round(timing.responseEnd - timing.requestStart);

    if (duration > thresholdMs) {
      const entry: SlowApiEntry = {
        url:          request.url(),
        method:       request.method(),
        duration_ms:  duration,
        threshold_ms: thresholdMs,
        timestamp:    new Date().toISOString(),
      };

      slowApis.push(entry);

      console.warn(
        `  ⚠ Slow API [${duration}ms / limit ${thresholdMs}ms] ${request.method()} ${request.url()}`
      );
    }
  });

  const getter = () => [...slowApis];
  monitorStore.set(page, getter);
  return getter;
}

/**
 * Get slow API entries from an already-attached monitor on this page.
 * Returns empty array if no monitor is attached.
 */
export function getSlowApis(page: Page): SlowApiEntry[] {
  return monitorStore.get(page)?.() ?? [];
}

/**
 * Wait for a specific API call and return its response time.
 * Useful when you want to assert a single endpoint's speed inline in a test.
 *
 * @example
 * const ms = await measureApiCall(
 *   page,
 *   () => page.click('#submit'),
 *   res => res.url().includes('/api/submit')
 * );
 * expect(ms).toBeLessThan(2000);
 */
export async function measureApiCall(
  page: Page,
  trigger: () => Promise<void>,
  matcher: (response: import('@playwright/test').Response) => boolean
): Promise<number> {
  const responsePromise = page.waitForResponse(matcher);

  await trigger();

  const response = await responsePromise;
  const timing   = response.request().timing();
  return Math.round(timing.responseEnd - timing.requestStart);
}
