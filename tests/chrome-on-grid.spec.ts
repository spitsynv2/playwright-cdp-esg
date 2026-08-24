import { test, expect, maximizeWindow } from '../src/fixtures';
import { currentTest } from '../src/zebrunner';
import type { Page } from '@playwright/test';

const stepPauseMs = Number(process.env.ESG_STEP_PAUSE_MS || 5000);

async function pause(page: Page) {
  if (stepPauseMs > 0) {
    await page.waitForTimeout(stepPauseMs);
  }
}

test.describe('Chrome on ESG', () => {
  test('opens Playwright docs over CDP', async ({ page, gridSession }) => {
    expect(gridSession.sessionId).toBeTruthy();
    expect(gridSession.devtoolsUrl).toContain(`/devtools/${gridSession.sessionId}/`);

    await test.step('Maximize the Chrome window', async () => {
      currentTest.log.info('Maximize the ESG Chrome window.');
      await maximizeWindow(page);
      await pause(page);
    });

    await test.step('Open Playwright home', async () => {
      currentTest.log.info('Open https://playwright.dev/.');
      await page.goto('https://playwright.dev/', { waitUntil: 'commit' });
      await expect(page).toHaveTitle(/Playwright/);
      await expect(page.getByRole('link', { name: 'Get started' })).toBeVisible();
      await pause(page);
    });

    await test.step('Open Get started', async () => {
      currentTest.log.info('Open the Get started docs page.');
      await page.getByRole('link', { name: 'Get started' }).first().click({ noWaitAfter: true });
      await page.waitForURL(/\/docs\//, { waitUntil: 'commit' });
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await pause(page);
    });

    await test.step('Open Writing tests', async () => {
      currentTest.log.info('Open the Writing tests page.');
      await page.getByRole('link', { name: 'Writing tests', exact: true }).first().click({ noWaitAfter: true });
      await page.waitForURL(/writing-tests/, { waitUntil: 'commit' });
      await expect(page.getByRole('heading', { name: /Writing tests/i })).toBeVisible();
      await pause(page);
    });

    await test.step('Open the API reference', async () => {
      currentTest.log.info('Open the Playwright API reference.');
      await page.getByRole('link', { name: 'API', exact: true }).first().click({ noWaitAfter: true });
      await page.waitForURL(/\/api\//, { waitUntil: 'commit' });
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await pause(page);
    });
  });

  test('opens example.com over CDP', async ({ page }) => {
    await test.step('Maximize the Chrome window', async () => {
      currentTest.log.info('Maximize the ESG Chrome window.');
      await maximizeWindow(page);
      await pause(page);
    });

    await test.step('Open example.com', async () => {
      currentTest.log.info('Open https://example.com/.');
      await page.goto('https://example.com/', { waitUntil: 'commit' });
      await expect(page.getByRole('heading', { name: 'Example Domain' })).toBeVisible();
      await expect(page.getByText(/This domain is for use in documentation/i)).toBeVisible();
      await pause(page);
    });

    await test.step('Open IANA example details', async () => {
      currentTest.log.info('Open the IANA example domain page.');
      await page.getByRole('link', { name: 'Learn More' }).click({ noWaitAfter: true });
      await page.waitForURL(/iana\.org/, { waitUntil: 'commit' });
      await expect(page.getByRole('heading').first()).toBeVisible();
      await pause(page);
    });

    await test.step('Return to example.com', async () => {
      currentTest.log.info('Go back to example.com.');
      await page.goBack({ waitUntil: 'commit' });
      await expect(page).toHaveURL('https://example.com/');
      await expect(page.getByRole('heading', { name: 'Example Domain' })).toBeVisible();
      await pause(page);
    });
  });
});
