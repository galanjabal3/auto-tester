import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { SiteConfig } from './types';

const CONFIGS_DIR = path.resolve(process.cwd(), 'configs/sites');

/**
 * Load a single site config by name.
 * Looks for `configs/sites/<name>.yaml`.
 */
export function loadSiteConfig(siteName: string): SiteConfig {
  const filePath = path.join(CONFIGS_DIR, `${siteName}.yaml`);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Site config not found: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const config = yaml.load(raw) as SiteConfig;

  validateConfig(config, siteName);
  return config;
}

/**
 * Load all site configs from the configs/sites directory.
 */
export function loadAllSiteConfigs(): SiteConfig[] {
  if (!fs.existsSync(CONFIGS_DIR)) {
    throw new Error(`Configs directory not found: ${CONFIGS_DIR}`);
  }

  const files = fs.readdirSync(CONFIGS_DIR).filter(f => f.endsWith('.yaml'));

  if (files.length === 0) {
    throw new Error(`No site configs found in ${CONFIGS_DIR}`);
  }

  return files.map(file => {
    const siteName = path.basename(file, '.yaml');
    return loadSiteConfig(siteName);
  });
}

/**
 * List all available site names (without loading the full config).
 */
export function listSiteNames(): string[] {
  if (!fs.existsSync(CONFIGS_DIR)) return [];
  return fs
    .readdirSync(CONFIGS_DIR)
    .filter(f => f.endsWith('.yaml'))
    .map(f => path.basename(f, '.yaml'));
}

// ─── Internal ──────────────────────────────────────────────────────────────────

function validateConfig(config: SiteConfig, siteName: string): void {
  const required: Array<keyof SiteConfig> = ['name', 'base_url', 'auth', 'thresholds', 'tests'];

  for (const key of required) {
    if (!config[key]) {
      throw new Error(`Missing required field "${key}" in config for site: ${siteName}`);
    }
  }

  const authRequired: Array<keyof SiteConfig['auth']> = [
    'login_path',
    'email_field',
    'password_field',
    'submit_button',
  ];

  for (const key of authRequired) {
    if (!config.auth[key]) {
      throw new Error(`Missing required auth field "${key}" in config for site: ${siteName}`);
    }
  }

  if (!config.thresholds.api_response_ms) {
    throw new Error(`Missing thresholds.api_response_ms in config for site: ${siteName}`);
  }
}
