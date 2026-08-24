# Chrome over CDP on ESG

This project attaches Playwright to Chrome on Zebrunner Selenium Grid (ESG).
The attach uses the Chrome DevTools Protocol (CDP) on the ESG DevTools WebSocket.

ESG Chrome often does not emit a Playwright `load` event.
`goBack` and a back-forward cache make a `load` event less likely.

Do not wait for `load` or `networkidle`.
A wait for those events can hang until the test timeout.

## Recommended wait

Wait until navigation `commit`. Then wait until the target element is visible.

```ts
await page.goto(url, { waitUntil: 'commit' });
await expect(page.getByRole('heading', { name: 'Example Domain' })).toBeVisible();
```

For a click that opens a new URL:

```ts
await page.getByRole('link', { name: 'Learn More' }).click({ noWaitAfter: true });
await page.waitForURL(/iana\.org/, { waitUntil: 'commit' });
await expect(page.getByRole('heading').first()).toBeVisible();
```

`noWaitAfter: true` skips the Playwright wait for `load` after the click.
`expect(...).toBeVisible()` then waits until the element is in the page.

## Video

ESG farm records session video when `ESG_ENABLE_VIDEO` is `true`.

Keep Playwright `use.video` at `off` in `playwright.config.ts`.
Playwright video needs a browser that Playwright starts.
`chromium.connectOverCDP` does not start that browser.

This project also sets `screenshot` and `trace` to `off`.

## Zebrunner reporter

Live session attach needs a reporter that starts the Zebrunner test session during the test.

This project pins `@zebrunner/javascript-agent-playwright` to the GitHub fork `spitsynv2/javascript-agent-playwright`.

The published npm package and older reporter builds can start the session only at test end.
Logs then appear before the session card.
VNC and farm video can attach late or not at all for that test.

Use `currentTest.attachSessionCapabilities` as soon as ESG returns the `sessionId`.
Call it before the CDP connect.

## Retries

Each Playwright try starts a new ESG session.
Set `ESG_RETRY_DEMO=1` to run the retry demo test.
The default suite skips that test.
