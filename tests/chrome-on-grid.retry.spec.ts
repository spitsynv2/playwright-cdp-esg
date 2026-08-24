import { test, expect } from '../src/fixtures';
import { currentTest } from '../src/zebrunner';

const retryDemoEnabled = ['1', 'true'].includes(String(process.env.ESG_RETRY_DEMO || '').toLowerCase());

test.describe('Chrome on ESG retries', () => {
  test.skip(!retryDemoEnabled, 'Skipped unless ESG_RETRY_DEMO=1');
  test.describe.configure({ retries: 1 });

  test('fails on first try then passes @retry-demo', async ({ page, gridSession }, testInfo) => {
    expect(gridSession.sessionId).toBeTruthy();
    currentTest.log.info(`Retry demo try ${testInfo.retry} session ${gridSession.sessionId}`);

    await page.goto('https://example.com/', { waitUntil: 'commit' });
    await expect(page.getByRole('heading', { name: 'Example Domain' })).toBeVisible();

    if (testInfo.retry === 0) {
      currentTest.log.warn('Fail try 0 on purpose to start a retry.');
      throw new Error('Retry demo: fail try 0');
    }

    currentTest.log.info('Pass try 1 after a new ESG session.');
  });
});
