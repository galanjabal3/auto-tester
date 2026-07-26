import { Page } from '@playwright/test';
import { SiteConfig } from './types';
import fs from 'fs';
import path from 'path';

const SESSION_DIR = path.resolve(process.cwd(), '.sessions');

/**
 * Log in to a site and save the browser storage state to disk.
 * On subsequent runs the saved session is reused — no login needed.
 */
export async function login(page: Page, config: SiteConfig): Promise<void> {
  const { auth, base_url } = config;

  console.log(`  → Logging in to ${config.name}...`);

  await page.goto(base_url + auth.login_path);

  await page.fill(auth.email_field, process.env.TEST_EMAIL ?? '');
  await page.fill(auth.password_field, process.env.TEST_PASSWORD ?? '');
  await page.click(auth.submit_button);

  // Wait for login to complete
  if (auth.success_selector) {
    await page.waitForSelector(auth.success_selector, { timeout: 15_000 });
  } else {
    // Fallback: wait for navigation away from the login page
    await page.waitForURL(url => !url.pathname.includes(auth.login_path), {
      timeout: 15_000,
    });
  }

  console.log(`  ✓ Login successful`);
}

/**
 * Save the current browser context state (cookies, localStorage) to disk.
 * Used by fixtures to persist the logged-in session between tests.
 */
export async function saveSession(
  page: Page,
  siteName: string
): Promise<string> {
  ensureSessionDir();
  const sessionPath = getSessionPath(siteName);
  await page.context().storageState({ path: sessionPath });
  return sessionPath;
}

/**
 * Return the path to the saved session file for a site.
 * Returns null if no saved session exists.
 */
export function getSessionPath(siteName: string): string {
  ensureSessionDir();
  return path.join(SESSION_DIR, `${siteName}.json`);
}

/**
 * Check whether a saved session file exists for a site.
 */
export function hasSession(siteName: string): boolean {
  return fs.existsSync(getSessionPath(siteName));
}

/**
 * Delete the saved session file — forces a fresh login on next run.
 */
export function clearSession(siteName: string): void {
  const sessionPath = getSessionPath(siteName);
  if (fs.existsSync(sessionPath)) {
    fs.unlinkSync(sessionPath);
    console.log(`  Session cleared for: ${siteName}`);
  }
}

// ─── Internal ──────────────────────────────────────────────────────────────────

function ensureSessionDir(): void {
  if (!fs.existsSync(SESSION_DIR)) {
    fs.mkdirSync(SESSION_DIR, { recursive: true });
  }
}
