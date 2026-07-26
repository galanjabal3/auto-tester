// ─── Site configuration (loaded from YAML) ─────────────────────────────────────

export interface AuthConfig {
  /** URL path to the login page, e.g. "/login" */
  login_path: string;

  /** CSS selector for the email/username input */
  email_field: string;

  /** CSS selector for the password input */
  password_field: string;

  /** CSS selector for the submit button */
  submit_button: string;

  /** Selector to verify login succeeded, e.g. ".dashboard" or "text=Welcome" */
  success_selector?: string;
}

export interface ThresholdConfig {
  /** Maximum allowed API response time in milliseconds */
  api_response_ms: number;

  /** Maximum allowed full page load time in milliseconds */
  page_load_ms?: number;
}

export interface SiteConfig {
  /** Human-readable site name, used in reports and notifications */
  name: string;

  /** Base URL, e.g. "https://yourapp.com" */
  base_url: string;

  auth: AuthConfig;
  thresholds: ThresholdConfig;

  /** List of test names to run for this site */
  tests: string[];
}

// ─── Test results ───────────────────────────────────────────────────────────────

export type TestStatus = 'pass' | 'fail' | 'skip';

export interface SlowApiEntry {
  url: string;
  method: string;
  duration_ms: number;
  threshold_ms: number;
  timestamp: string;
}

export interface TestResult {
  test_name: string;
  status: TestStatus;
  duration_ms: number;
  error?: string;
  screenshot_path?: string;
  slow_apis: SlowApiEntry[];
  timestamp: string;
}

export interface SiteResult {
  site_name: string;
  base_url: string;
  started_at: string;
  finished_at: string;
  total_duration_ms: number;
  passed: number;
  failed: number;
  skipped: number;
  slow_api_count: number;
  tests: TestResult[];
}

export interface RunSummary {
  run_id: string;
  started_at: string;
  finished_at: string;
  sites: SiteResult[];
  total_passed: number;
  total_failed: number;
  total_slow_apis: number;
  overall_status: 'pass' | 'fail';
}

// ─── Reporter interface ─────────────────────────────────────────────────────────

export interface Reporter {
  /** Called once after all sites have finished */
  report(summary: RunSummary): Promise<void>;
}
