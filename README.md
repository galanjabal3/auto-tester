# Auto-Tester

![CI](https://github.com/galanjabal3/auto-tester/actions/workflows/ci.yml/badge.svg) ![License: MIT](https://img.shields.io/badge/license-MIT-7c3aed)

Automated web testing platform with slow API detection, live dashboard, and real-time test streaming.

Built in two phases: **CLI engine** for running Playwright tests against multiple sites, and a **self-hosted dashboard** for managing sites, viewing results, and streaming test runs live.

## Features

- **Multi-site testing** — configure unlimited websites via YAML files
- **Slow API detection** — monitors XHR/fetch response times, flags requests exceeding thresholds
- **Session persistence** — saves login sessions to avoid repeated authentication
- **Live dashboard** — React UI with real-time SSE streaming during test runs
- **Run history** — all test results stored in PostgreSQL with expandable detail view
- **Schedule management** — cron-based scheduling (UI ready, runner pending)
- **Reports** — auto-generated HTML reports, JSON run data, Telegram alerts
- **Playwright Codegen** — record test flows visually via dashboard UI, auto-fix imports + URLs + test title
- **Test selector** — choose which tests to run per site (checkbox modal)
- **Video recording** — Playwright records video for every test, viewable in Runs detail
- **Code viewer** — see recorded Playwright code directly in Runs detail view

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Test engine | Playwright, TypeScript |
| CLI | Commander.js |
| Config | YAML (js-yaml), dotenv |
| Dashboard API | Express.js, PostgreSQL, UUID |
| Dashboard UI | React 19, Vite 8, Tailwind CSS 4, React Router 7 |
| Live streaming | Server-Sent Events (SSE) |
| Notifications | Telegram Bot API |

## Quick Start

### Prerequisites

- Node.js >= 18
- PostgreSQL running on `localhost:5432`

### 1. Install dependencies

```bash
npm install
npx playwright install chromium
cd dashboard/server && npm install && cd ../..
cd dashboard/client && npm install && cd ../..
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your target site credentials:

```ini
BASE_URL=https://the-internet.herokuapp.com
TEST_EMAIL=tomsmith
TEST_PASSWORD=SuperSecretPassword!
LOGIN_PATH=/login
EMAIL_SELECTOR=[name="username"]
PASSWORD_SELECTOR=[name="password"]
SUBMIT_SELECTOR=button[type="submit"]
SLOW_API_THRESHOLD_MS=2000
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

### 3. Run tests (CLI)

```bash
npm run test:cli the-internet     # single site
npm run test:cli --all            # all sites
```

### 4. Start the dashboard

```bash
npm run dashboard
```

Opens API on `http://localhost:3001` and dashboard on `http://localhost:5173`.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dashboard` | Start API server + Vite dev server (auto-installs deps, builds if needed) |
| `npm run test:cli <site>` | Run CLI tests for a specific site |
| `npm run test:cli --all` | Run CLI tests for all sites |
| `npm run build` | Build CLI TypeScript to `dist/` |
| `npm run build:server` | Build dashboard server TypeScript |
| `npm run codegen` | Open Playwright Codegen to record test flows |

Or run scripts directly:

```bash
./scripts/start.sh              # same as npm run dashboard
./scripts/test.sh the-internet  # same as npm run test:cli the-internet
./scripts/test.sh --all         # same as npm run test:cli --all
```

The start script handles:
- Checking Node.js and PostgreSQL are running
- Installing dependencies if `node_modules` is missing
- Installing Playwright browsers if needed
- Building the server if `dist/` is outdated
- Starting both servers with color-coded output
- Graceful shutdown on `Ctrl+C`

## CLI Commands

| Command | Description |
|---------|-------------|
| `run --site <name>` | Run tests for a specific site |
| `run --all` | Run tests for all configured sites |
| `list` | List all configured site names |
| `clear-session <name>` | Delete saved login session (forces re-login) |
| `codegen <url>` | Open Playwright Codegen to record test flows |

## YAML Site Config

Each site is configured with a YAML file in `configs/sites/`:

```yaml
name: "The Internet"
base_url: "https://the-internet.herokuapp.com"
auth:
  login_path: "/login"
  email_field: '[name="username"]'
  password_field: '[name="password"]'
  submit_button: 'button[type="submit"]'
  success_selector: ".flash.success"
thresholds:
  api_response_ms: 3000
tests:
  - login
  - dynamic-controls
  - checkboxes
  - dropdown
```

### Config fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Display name for the site |
| `base_url` | Yes | Root URL of the target site |
| `auth.login_path` | Yes | Path to the login page |
| `auth.email_field` | Yes | CSS selector for username/email input |
| `auth.password_field` | Yes | CSS selector for password input |
| `auth.submit_button` | Yes | CSS selector for submit button |
| `auth.success_selector` | No | CSS selector that appears after successful login |
| `thresholds.api_response_ms` | Yes | Max acceptable API response time (ms) |
| `tests` | Yes | List of test names to run (matches `tests/flows/<name>.spec.ts`) |

### Adding a new site

**Via Dashboard (recommended):**

1. Click **Add Site** on the Sites page, fill in name, URL, auth fields
2. Click **Record** on the newly created site
3. Run the provided `npx playwright codegen <url>` command in your terminal
4. Perform your test flow in the browser (Playwright records every action)
5. Copy the generated code from Playwright Inspector
6. Paste into the dashboard textarea, give the test a name
7. Click **Generate Spec** — the `.spec.ts` file is saved, imports auto-fixed, test added to YAML
8. Click **Run** to execute

**Via CLI:**

1. Copy `configs/sites/example.yaml` to `configs/sites/<yoursite>.yaml`
2. Fill in the config fields
3. Record: `npm run codegen -- https://yourapp.com`
4. Save to `tests/flows/<name>.spec.ts`, fix imports manually
5. Add test name to YAML under `tests:`

## Test Flows

Tests live in `tests/flows/` and use the custom Playwright fixture from `fixtures/base.fixture.ts`:

```typescript
import { test, expect } from '../../fixtures/base.fixture';

test('my test flow', async ({ page, getSlowApis }) => {
  await page.goto('/my-page');
  await page.click('#my-button');
  await expect(page.locator('#result')).toBeVisible();

  const slowApis = getSlowApis();
  // slowApis contains any XHR/fetch calls that exceeded the threshold
});
```

The fixture provides:
- **Auto-login** — restores saved session or performs fresh login
- **API monitoring** — tracks all XHR/fetch response times per page
- **`getSlowApis()`** — returns list of slow API calls detected during the test

### Included test flows

| File | Tests |
|------|-------|
| `tests/common/login.spec.ts` | Valid login, wrong password |
| `tests/flows/checkboxes.spec.ts` | Check/uncheck all checkboxes |
| `tests/flows/dropdown.spec.ts` | Select dropdown options |
| `tests/flows/dynamic-controls.spec.ts` | Toggle checkbox visibility, toggle input enable/disable |
| `tests/flows/example-flow.spec.ts` | Template: form submission with `measureApiCall` |

## Reports

After each run, reports are generated in `reports/`:

```
reports/
├── report-<date>-<time>.html    ← open in browser
├── run-<date>-<time>.json       ← full run data
├── history.json                 ← last 100 runs
├── results.json                 ← latest Playwright JSON output
└── artifacts/                   ← screenshots, traces on failure
```

### Telegram notifications

Set in `.env`:
```ini
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

Alerts are sent when tests fail or slow APIs are detected.

## Dashboard

Self-hosted React dashboard for managing and monitoring test runs.

### Architecture

```
dashboard/
├── server/           Express.js API (port 3001)
│   ├── src/
│   │   ├── index.ts          Server entry
│   │   ├── db/database.ts    PostgreSQL connection + schema
│   │   ├── utils/
│   │   │   ├── yaml-generator.ts    Shared YAML read/write
│   │   │   └── parse-results.ts     Shared Playwright result parser
│   │   └── routes/
│   │       ├── sites.ts      Site CRUD + YAML sync
│   │       ├── runs.ts       Run history + stats
│   │       ├── live.ts       SSE live streaming
│   │       ├── tests.ts      Codegen spec generation
│   │       └── schedules.ts  Schedule CRUD
│   └── dist/                 Compiled JS
│
└── client/           React + Vite (port 5173)
    └── src/
        ├── App.tsx           Router + sidebar
        ├── api/client.ts     Axios API client
        ├── components/
        │   └── LiveRun.tsx   SSE live test component
        └── pages/
            ├── Dashboard.tsx Stats overview
            ├── Sites.tsx     Site management + Codegen modal + Run selector
            ├── Runs.tsx      Run history + video playback + code viewer
            └── Schedules.tsx Schedule management
```

### Pages

- **Dashboard** — 8 stat cards (total runs, successful, failed, running, passed, failed, slow APIs, avg duration) + recent runs list
- **Sites** — Add/delete sites, trigger live test runs (with test selector modal), **Record with Codegen** (auto-fix imports, URLs, test title)
- **Runs** — Expandable run history with test-level detail, **video playback**, **code viewer** (shows recorded Playwright code)
- **Schedules** — Cron schedule management with preset options

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/sites` | List all sites |
| POST | `/api/sites` | Create site |
| PUT | `/api/sites/:id` | Update site |
| DELETE | `/api/sites/:id` | Delete site |
| GET | `/api/runs` | List recent runs (last 50) |
| GET | `/api/runs/:id` | Get run with test results |
| GET | `/api/runs/stats/summary` | Aggregate stats |
| POST | `/api/live/live` | Start a test run (body: `{ site_id, tests? }`) |
| GET | `/api/live/live/:runId` | SSE stream for live progress |
| POST | `/api/tests/generate` | Save Codegen spec + auto-add to YAML |
| GET | `/api/tests/specs/:siteId` | Get recorded specs for a site |
| GET/POST/PUT/DELETE | `/api/schedules` | Schedule CRUD |

### SSE Events (live streaming)

| Event | Data | Description |
|-------|------|-------------|
| `connected` | `{ runId }` | SSE connection established |
| `testcomplete` | `{ test_name, status, duration_ms, error, index, total }` | Individual test finished |
| `runcomplete` | `{ runId, passed, failed, skipped }` | All tests finished |
| `runerror` | `{ error }` | Test execution failed |

### Database Schema

PostgreSQL database `auto_tester` with 5 tables:

```sql
sites          UUID PK, name, base_url, auth fields, tests JSONB, thresholds
runs           UUID PK, FK site_id, status, timestamps, passed/failed/skipped counts
test_results   SERIAL PK, FK run_id, test_name, status, duration_ms, error, screenshot, video
test_specs     SERIAL PK, FK site_id, test_name, code, spec_file (recorded Playwright code)
schedules      UUID PK, FK site_id, cron_expression, enabled, timestamps
```

### Dev mode

In development (`localhost:5173`), the API client connects directly to `localhost:3001` to bypass the Vite proxy. In production, it uses same-origin `/api` paths.

## Project Structure

```
auto-tester/
├── cli/
│   └── index.ts                  CLI entry (Commander.js)
├── core/
│   ├── types.ts                  TypeScript interfaces
│   ├── config-parser.ts          YAML config loader
│   ├── runner.ts                 Test orchestrator
│   ├── auth-helper.ts            Login + session persistence
│   ├── api-monitor.ts            API response time tracking
│   └── utils/
│       └── parse-results.ts      Shared Playwright result parser
├── fixtures/
│   └── base.fixture.ts           Extended Playwright fixture
├── tests/
│   ├── common/                   Auth tests
│   └── flows/                    UI flow test specs (manual + codegen)
├── reporters/
│   ├── html-reporter.ts          HTML report generator
│   ├── json-reporter.ts          JSON run data + history
│   └── telegram-reporter.ts      Telegram alerts
├── configs/sites/                YAML site configs (auto-generated from dashboard)
├── reports/                      Generated reports + Playwright output
├── scripts/
│   ├── start.sh                  Start API + dashboard servers
│   └── test.sh                   CLI test wrapper
├── dashboard/
│   ├── server/                   Express API + PostgreSQL
│   │   └── src/utils/
│   │       ├── yaml-generator.ts    Shared YAML utilities
│   │       └── parse-results.ts     Server-side result parser
│   └── client/                   React + Vite dashboard
├── .env.example                  Environment config template
├── playwright.config.ts          Playwright configuration
└── tsconfig.json                 Root TypeScript config
```

## License

MIT

---

## Full Tutorial: First Test in 5 Minutes

### 1. Start everything

```bash
# Install deps (first time only)
npm install
npx playwright install chromium
cd dashboard/server && npm install && cd ../..
cd dashboard/client && npm install && cd ../..

# Start dashboard
npm run dashboard
```

Dashboard opens at `http://localhost:5173`, API at `http://localhost:3001`.

### 2. Add a site

1. Go to **Sites** page, click **Add Site**
2. Fill in:
   - Site Name: `The Internet`
   - Base URL: `https://the-internet.herokuapp.com`
   - Tests: `login` (comma separated)
3. Click **Create**

### 3. Record a test

1. On the Sites page, click **Record** next to your site
2. In the modal, copy the command:
   ```bash
   npx playwright codegen https://the-internet.herokuapp.com
   ```
3. Run it in your terminal — a browser opens with Playwright Inspector
4. Perform your test flow:
   - Navigate to `/login`
   - Type username `tomsmith` into the username field
   - Type password `SuperSecretPassword!` into the password field
   - Click the submit button
   - Verify success message appears
5. In Playwright Inspector, click **Copy** to get the generated code
6. Back in the dashboard modal:
   - Test Name: `login`
   - Paste the code into the textarea
7. Click **Generate Spec**

The spec file is saved to `tests/flows/login.spec.ts` with:
- Import auto-fixed: `@playwright/test` → `../../fixtures/base.fixture`
- URL auto-fixed: `https://the-internet.herokuapp.com/login` → `` `${process.env.BASE_URL}/login` ``
- Test name added to site's YAML config

### 4. Run the test

Click **Run** next to your site. If the site has multiple tests, a modal appears with checkboxes — pick which tests to run. You'll see:
- Real-time test progress via SSE streaming
- Each test result as it completes
- Final summary (passed/failed/skipped)

### 5. Check results

- Go to **Runs** page → click any run to expand
- See test-level detail: status, duration, errors
- Click **Code** button to view the recorded Playwright code
- Click **Video** button to playback the test recording

### 6. (Optional) Configure auth

If your site requires login, expand **auth settings** when creating/editing a site:
- Login Path: `/login`
- Email Selector: `[name="email"]`
- Password Selector: `[name="password"]`
- Submit Button: `button[type="submit"]`
- Success Selector: `.flash.success`

The base fixture handles login automatically and caches the session.

---

## Quick Reference

### CLI

```bash
npm run test:cli the-internet     # run one site
npm run test:cli --all            # run all sites
npm run codegen -- https://url    # open Playwright Codegen
```

### Dashboard

| Page | What it does |
|------|-------------|
| Dashboard | Overview stats, recent runs |
| Sites | Add/run/record sites, select which tests to run |
| Runs | View history, expand for details + video + code |
| Schedules | Cron-based auto-run (UI ready) |

### Three ways to create tests

| Method | When to use |
|--------|-------------|
| **Dashboard → Record** | Quick visual recording, auto-fix imports |
| **CLI → codegen** | Terminal workflow, manual import fix |
| **Manual** | Write from scratch, full control |
