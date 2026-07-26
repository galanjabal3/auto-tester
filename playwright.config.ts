import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,

  // Retry failed tests once before marking as failed
  retries: 1,

  // Run tests sequentially (safer for auth-dependent tests)
  workers: 1,

  // HTML reporter — open automatically on failure
  reporter: [
    ['html', { outputFolder: 'reports/html', open: 'never' }],
    ['json', { outputFile: 'reports/results.json' }],
    ['list'],
  ],

  use: {
    baseURL: process.env.BASE_URL,

    // Capture screenshot & video on failure
    screenshot: 'only-on-failure',
    video: 'on',
    trace: 'retain-on-failure',

    // Global timeout per action (e.g. click, fill)
    actionTimeout: 10_000,

    // Global timeout per test
    navigationTimeout: 30_000,
  },

  // Global timeout per test
  timeout: 60_000,

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Uncomment to also test on Firefox / Safari:
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // { name: 'webkit',  use: { ...devices['Desktop Safari']  } },
  ],

  // Output directory for test artifacts (screenshots, videos, traces)
  outputDir: 'reports/artifacts',
});
