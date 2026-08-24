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

## Idle timeout

`ESG_IDLE_TIMEOUT` sets the farm session idle timeout in seconds.
The create-session request sends this value in `zebrunner:options.idleTimeout`.
The default is `120`.

Set `ESG_IDLE_TIMEOUT` near the default, or lower.
Do not send a very large idle timeout.

If Playwright crashes, the fixture cannot send `DELETE /session`.
If a task abort stops the run in the middle, the fixture also cannot close the session.
ESG then waits until the idle timeout ends.
Then ECS stops the browser task.

A large idle timeout keeps that browser task on ECS for a long time.

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

## CDP stress

The stress suite holds many CDP connections at the same time.
Each test explores Playwright docs for 60 seconds.
The test can attach a screenshot after each page open and after each scroll.
`ESG_STRESS_SCREENSHOTS` caps screenshots per test. The default is `20`.
Set `ESG_STRESS_SCREENSHOTS=0` to attach no screenshots.

`currentTest.attachScreenshot` keeps PNG. The reporter writes each PNG to disk.
It uploads the file during the test. It deletes the file after a successful
upload. The reporter does not keep all PNG bytes in RAM until test end.
Keep that reporter behavior.

Client RAM peak follows Playwright worker count, not screenshot count.
15 workers on a 4 GB client reached about 98% RAM.
0, 1, and 20, 50 screenshots per test had almost the same peak.
Chrome on ESG does not use RAM on the Playwright client.
About 10–12 workers left headroom on 4 GB.

```bash
npm run test:stress
```

Each farm session uses `ESG_CPU=2048` and `ESG_MEMORY=2048` unless you set those variables.
It starts 8 workers and 8 tests by default.

Set `ESG_STRESS_WORKERS` and `ESG_STRESS_TESTS` to the same value to raise the CDP count.
The default suite skips the stress tests.

## Zebrunner launcher

A Zebrunner launcher can set `ZEBRUNNER_HUB_URL`.
The project reads the user, password, and host from that URL.
You do not need `ESG_USER` or `ESG_PASSWORD` in that case.

`REPORTING_*` values from the launcher go to the reporter.
`E3S_URL` is not the Selenium hub.
