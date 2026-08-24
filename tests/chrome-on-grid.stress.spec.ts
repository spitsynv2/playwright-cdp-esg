import { test, expect, maximizeWindow } from '../src/fixtures';
import { currentTest } from '../src/zebrunner';
import type { Page } from '@playwright/test';

const stressEnabled = ['1', 'true'].includes(String(process.env.ESG_STRESS_TEST || '').toLowerCase());
const stressTests = Math.max(1, Number(process.env.ESG_STRESS_TESTS || 8) || 8);
const durationMs = Math.max(1_000, Number(process.env.ESG_STRESS_DURATION_MS || 60_000) || 60_000);
const maxScreenshots = Math.max(0, Number(process.env.ESG_STRESS_SCREENSHOTS || 20) || 20);

const docsPages = [
  'https://playwright.dev/',
  'https://playwright.dev/docs/intro',
  'https://playwright.dev/docs/writing-tests',
  'https://playwright.dev/docs/running-tests',
  'https://playwright.dev/docs/test-configuration',
  'https://playwright.dev/docs/locators',
  'https://playwright.dev/docs/actions',
  'https://playwright.dev/docs/input',
  'https://playwright.dev/docs/assertions',
  'https://playwright.dev/docs/screenshots',
  'https://playwright.dev/docs/navigations',
  'https://playwright.dev/docs/api/class-page',
];

async function attachScreenshot(page: Page) {
  const image = await page.screenshot({ type: 'png' });
  currentTest.attachScreenshot(image);
}

async function openDocs(page: Page, url: string) {
  await page.goto(url, { waitUntil: 'commit' });
  await expect(page.locator('body')).toBeVisible();
}

test.describe('Chrome on ESG CDP stress', () => {
  test.skip(!stressEnabled, 'Skipped unless ESG_STRESS_TEST=1');
  test.describe.configure({ mode: 'parallel' });

  for (let index = 1; index <= stressTests; index += 1) {
    test(`explores Playwright docs for 1 min @stress-cdp ${index}`, async ({ page, gridSession }, testInfo) => {
      test.setTimeout(durationMs + 90_000);
      expect(gridSession.sessionId).toBeTruthy();

      currentTest.attachLabel('stress', 'cdp-screenshots');
      currentTest.attachLabel('stressIndex', String(index));
      currentTest.log.info(
        `Stress ${index} worker ${testInfo.workerIndex} session ${gridSession.sessionId} durationMs ${durationMs}`,
      );

      await maximizeWindow(page);
      const deadline = Date.now() + durationMs;
      let shot = 0;
      let pageIndex = 0;

      while (Date.now() < deadline) {
        const url = docsPages[pageIndex % docsPages.length];
        await openDocs(page, url);
        if (shot < maxScreenshots) {
          shot += 1;
          await attachScreenshot(page);
        }
        await page.evaluate(() => window.scrollBy(0, 800));
        if (shot < maxScreenshots) {
          shot += 1;
          await attachScreenshot(page);
        }
        pageIndex += 1;
      }

      currentTest.log.info(`Stress ${index} attached ${shot} screenshots`);
      expect(shot).toBeGreaterThan(0);
    });
  }
});
