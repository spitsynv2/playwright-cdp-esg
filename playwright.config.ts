import { defineConfig } from '@playwright/test';
import { config as loadEnv } from 'dotenv';

import { loadEsgTimeouts } from './src/esg';

loadEnv({ quiet: true });

const reportingEnabled =
  String(process.env.REPORTING_ENABLED).toLowerCase() === 'true' &&
  Boolean(process.env.REPORTING_SERVER_HOSTNAME && process.env.REPORTING_SERVER_ACCESS_TOKEN);

const workers = Number(process.env.ESG_WORKERS || process.env.ESG_STRESS_WORKERS || 2) || 2;
const timeouts = loadEsgTimeouts();

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers,
  retries: 0,
  timeout: timeouts.testMs,
  use: {
    video: 'off',
    screenshot: 'off',
    trace: 'off',
  },
  projects: [
    {
      name: 'chrome-esg',
    },
  ],
  reporter: [
    ['list'],
    [
      '@zebrunner/javascript-agent-playwright',
      {
        enabled: reportingEnabled,
        projectKey: process.env.REPORTING_PROJECT_KEY ?? 'DEF',
        server: {
          hostname: process.env.REPORTING_SERVER_HOSTNAME,
          accessToken: process.env.REPORTING_SERVER_ACCESS_TOKEN,
        },
        launch: {
          displayName: process.env.REPORTING_LAUNCH_DISPLAY_NAME ?? 'Playwright Chrome on ESG',
          build: process.env.REPORTING_LAUNCH_BUILD ?? '1.0.0',
          environment: process.env.REPORTING_LAUNCH_ENVIRONMENT ?? 'grid',
        },
        logs: {
          flushIntervalMs: process.env.REPORTING_LOGS_FLUSH_INTERVAL_MS ?? 1000,
        },
      },
    ],
  ],
});
