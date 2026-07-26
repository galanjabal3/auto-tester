import path from 'path';
import fs from 'fs';

const AUTO_TESTER_ROOT = path.join(__dirname, '..', '..', '..', '..');
const CONFIGS_DIR = path.join(AUTO_TESTER_ROOT, 'configs', 'sites');

export function generateYaml(site: any): string {
  const tests = typeof site.tests === 'string' ? JSON.parse(site.tests) : (site.tests || []);
  return `name: "${site.name}"
base_url: "${site.base_url}"
auth:
  login_path: "${site.login_path || '/login'}"
  email_field: '${site.email_field || '[name="email"]'}'
  password_field: '${site.password_field || '[name="password"]'}'
  submit_button: '${site.submit_button || 'button[type="submit"]'}'
  success_selector: "${site.success_selector || ''}"
thresholds:
  api_response_ms: ${site.api_threshold_ms || 2000}
tests:
${tests.map((t: string) => `  - ${t}`).join('\n')}`;
}

export function writeYamlConfig(site: any): void {
  fs.mkdirSync(CONFIGS_DIR, { recursive: true });
  const slug = site.name.toLowerCase().replace(/\s+/g, '-');
  const configPath = path.join(CONFIGS_DIR, `${slug}.yaml`);
  fs.writeFileSync(configPath, generateYaml(site));
}

export function removeYamlConfig(siteName: string): void {
  const slug = siteName.toLowerCase().replace(/\s+/g, '-');
  const configPath = path.join(CONFIGS_DIR, `${slug}.yaml`);
  if (fs.existsSync(configPath)) fs.unlinkSync(configPath);
}
