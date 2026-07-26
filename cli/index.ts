#!/usr/bin/env ts-node

import { Command } from 'commander';
import dotenv from 'dotenv';
import { loadSiteConfig, loadAllSiteConfigs, listSiteNames } from '../core/config-parser';
import { runAll } from '../core/runner';
import { clearSession } from '../core/auth-helper';

dotenv.config();

const program = new Command();

program
  .name('auto-tester')
  .description('Automated web app testing — slow API detection & feature testing')
  .version('1.0.0');

// ─── run ──────────────────────────────────────────────────────────────────────

program
  .command('run')
  .description('Run tests for one or all configured sites')
  .option('--site <name>',  'Run tests for a specific site (matches configs/sites/<n>.yaml)')
  .option('--all',          'Run tests for all configured sites')
  .action(async (opts: { site?: string; all?: boolean }) => {
    if (!opts.site && !opts.all) {
      console.error('Error: specify --site <name> or --all');
      process.exit(1);
    }

    const configs = opts.all
      ? loadAllSiteConfigs()
      : [loadSiteConfig(opts.site!)];

    const summary = await runAll(configs);
    process.exit(summary.overall_status === 'pass' ? 0 : 1);
  });

// ─── list ─────────────────────────────────────────────────────────────────────

program
  .command('list')
  .description('List all configured sites')
  .action(() => {
    const sites = listSiteNames();
    if (sites.length === 0) {
      console.log('No sites configured. Add a YAML file to configs/sites/');
    } else {
      console.log('\nConfigured sites:');
      sites.forEach(s => console.log(`  • ${s}`));
    }
  });

// ─── clear-session ────────────────────────────────────────────────────────────

program
  .command('clear-session')
  .description('Delete the saved login session for a site (forces re-login)')
  .argument('<site>', 'Site name')
  .action((site: string) => {
    clearSession(site);
  });

// ─── codegen ──────────────────────────────────────────────────────────────────

program
  .command('codegen')
  .description('Open Playwright Codegen to record tests for a site')
  .argument('<url>', 'URL to open in the browser')
  .action((url: string) => {
    const { execSync } = require('child_process');
    execSync(`npx playwright codegen ${url}`, { stdio: 'inherit' });
  });

program.parse(process.argv);
