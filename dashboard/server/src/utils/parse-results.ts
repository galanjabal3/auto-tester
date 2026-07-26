import fs from 'fs';

interface ParsedTest {
  test_name: string;
  status: 'pass' | 'fail' | 'skip';
  duration_ms: number;
  error: string | undefined;
  screenshot_path: string | undefined;
  video_path: string | undefined;
  slow_apis: any[];
  timestamp: string;
}

export function extractTests(suites: any[]): ParsedTest[] {
  const tests: ParsedTest[] = [];

  function walk(suites: any[]) {
    for (const suite of suites) {
      for (const spec of suite.specs ?? []) {
        for (const test of spec.tests ?? []) {
          for (const result of test.results ?? []) {
            const videoAttachment = result.attachments?.find((a: any) => a.name === 'video');
            const screenshotAttachment = result.attachments?.find((a: any) => a.name === 'screenshot');
            tests.push({
              test_name: spec.title,
              status: result.status === 'passed' ? 'pass' : result.status === 'skipped' ? 'skip' : 'fail',
              duration_ms: result.duration ?? 0,
              error: result.error?.message || result.errors?.[0]?.message || undefined,
              screenshot_path: screenshotAttachment?.path || undefined,
              video_path: videoAttachment?.path || undefined,
              slow_apis: [],
              timestamp: new Date().toISOString(),
            });
          }
        }
      }
      if (suite.suites?.length) walk(suite.suites);
    }
  }

  walk(suites);
  return tests;
}

export function parsePlaywrightResults(resultsFile: string): ParsedTest[] {
  if (!fs.existsSync(resultsFile)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
    return extractTests(raw.suites ?? []);
  } catch {
    return [];
  }
}
