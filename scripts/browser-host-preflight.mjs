import { pathToFileURL } from 'node:url';
import { chromium, firefox, webkit } from '@playwright/test';
import { assertSmokeEnvironment } from './browser-smoke-config.mjs';

export const PROJECT_ENGINES = Object.freeze({
  'chromium-desktop': 'chromium',
  'chromium-tablet': 'chromium',
  'chromium-mobile': 'chromium',
  'firefox-desktop': 'firefox',
  'webkit-desktop': 'webkit',
  'webkit-tablet': 'webkit',
  'webkit-mobile': 'webkit',
});

const browserTypes = { chromium, firefox, webkit };

export function selectedEngines(argumentsList) {
  const projects = argumentsList.map((argument) => {
    const match = /^--project=(.+)$/.exec(argument);
    if (!match || !Object.hasOwn(PROJECT_ENGINES, match[1])) {
      throw new Error(`Unsupported browser preflight argument: ${argument}`);
    }
    return match[1];
  });
  if (projects.length === 0) throw new Error('At least one documented --project name is required.');
  return [...new Set(projects.map((project) => PROJECT_ENGINES[project]))];
}

export async function preflight(argumentsList, env = process.env) {
  assertSmokeEnvironment(env);
  const engines = selectedEngines(argumentsList);
  for (const engine of engines) {
    let browser;
    try {
      browser = await browserTypes[engine].launch({ headless: true });
      process.stdout.write(`[browser preflight] ${engine} launched on ${process.platform}/${process.arch}.\n`);
    } catch (error) {
      const detail = error instanceof Error ? error.message.split('\n')[0] : String(error);
      const windowsFirefox = process.platform === 'win32' && engine === 'firefox'
        ? ' This Windows host cannot start Playwright Firefox; use the isolated Firefox/Linux CI gate for application coverage.'
        : '';
      throw new Error(
        `[browser preflight] ${engine} could not launch on ${process.platform}/${process.arch}: ${detail}.` +
        `${windowsFirefox} No application page was opened.`,
      );
    } finally {
      await browser?.close();
    }
  }
}

const invokedDirectly = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (invokedDirectly) await preflight(process.argv.slice(2));
