import { test as base, chromium, expect } from '@playwright/test';
import type { Browser, BrowserContext, Page } from '@playwright/test';
import { currentTest } from '@zebrunner/javascript-agent-playwright';

import {
  closeEsgSession,
  createEsgSession,
  loadEsgConfig,
  loadEsgTimeouts,
  maximizeEsgWindow,
  reportingCapabilities,
  type EsgSession,
} from './esg';
import { maximizeWindow } from './window';

const timeouts = loadEsgTimeouts();

type GridTestFixtures = {
  gridSession: EsgSession;
  gridBrowser: Browser;
  context: BrowserContext;
  page: Page;
};

export const test = base.extend<GridTestFixtures>({
  gridSession: [
    async ({}, use) => {
      const config = loadEsgConfig();
      const session = await createEsgSession(config);
      currentTest.attachSessionCapabilities(
        reportingCapabilities(config, session.capabilities),
        session.sessionId,
      );
      await maximizeEsgWindow(session);
      try {
        await use(session);
      } finally {
        await closeEsgSession(session);
      }
    },
    { timeout: timeouts.sessionFixtureMs },
  ],

  gridBrowser: [
    async ({ gridSession }, use) => {
      const { cdpConnectMs } = loadEsgTimeouts();
      const browser = await chromium.connectOverCDP(gridSession.devtoolsUrl, {
        timeout: cdpConnectMs,
      });
      try {
        await use(browser);
      } finally {
        await browser.close().catch(() => {});
      }
    },
    { timeout: timeouts.browserFixtureMs },
  ],

  context: async ({ gridBrowser }, use) => {
    const context = gridBrowser.contexts()[0] || (await gridBrowser.newContext());
    await use(context);
  },

  page: async ({ context }, use) => {
    const page = context.pages()[0] || (await context.newPage());
    const { viewport } = loadEsgConfig();
    await page.setViewportSize(viewport).catch(() => {});
    await maximizeWindow(page).catch(() => {});
    await use(page);
  },
});

export { expect, maximizeWindow };
