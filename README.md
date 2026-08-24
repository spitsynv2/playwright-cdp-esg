# Playwright CDP on ESG

This project starts Chrome on the Zebrunner Selenium Grid (ESG).
Playwright then attaches to that Chrome through the ESG DevTools endpoint.

Read [Chrome over CDP](docs/chrome-over-cdp.md) for wait rules, video, and reporter limits.

## Flow

1. Each test sends `POST /session` and starts its own Chrome on ESG.
2. ESG returns a `sessionId` for that test.
3. The fixture calls `currentTest.attachSessionCapabilities` with that `sessionId`.
4. Playwright calls `chromium.connectOverCDP` on `wss://<host>/devtools/<sessionId>/`.
5. The fixture sends `DELETE /session/<sessionId>` after the test.

`ESG_WORKERS` sets how many tests run at the same time.
Each parallel test has its own ESG session.

## Setup

1. Copy `.env.example` to `.env`.
2. Set `ESG_USER` and `ESG_PASSWORD`.
3. Set `REPORTING_SERVER_HOSTNAME` and `REPORTING_SERVER_ACCESS_TOKEN` for Zebrunner.
4. Run `npm install`.

Do not commit `.env`. That file holds credentials.

## Run tests

```bash
npx playwright test
```

Import `test` and `expect` from `src/fixtures`.
Use `page` or `gridBrowser` from that fixture.
Do not use the built-in `browser` fixture.

To run the retry demo only:

```bash
npm run test:retry
```

That command sets `ESG_RETRY_DEMO=1` and selects `@retry-demo`.
A default run skips the retry demo and does not start an ESG session for it.

To run the CDP stress suite:

```bash
npm run test:stress
```

That command starts 8 parallel tests by default.
Each test explores Playwright docs for 60 seconds.
Each test takes screenshots and attaches them to Zebrunner.
Each ESG session requests 4 CPU and 4 GB.

Set `ESG_STRESS_WORKERS` and `ESG_STRESS_TESTS` to change the session count.
A default run skips the stress suite.

## Zebrunner reporter

This project pins `@zebrunner/javascript-agent-playwright` to the GitHub fork `spitsynv2/javascript-agent-playwright`.

The published npm package and older reporter builds may not bind the ESG session during the test.
Use the pinned fork so logs, VNC, and farm video line up with the test.

## Video

ESG farm records video when `ESG_ENABLE_VIDEO` is `true`.

Keep Playwright `use.video` at `off` in `playwright.config.ts`.
Playwright video does not apply to a browser that CDP attach opens.

## Environment

Grid:

| Variable | Purpose |
| --- | --- |
| `ESG_HOST` | ESG base URL. Default: `https://engine.zebrunner.dev` |
| `ESG_USER` | Basic-auth user for `POST /session` |
| `ESG_PASSWORD` | Basic-auth password for `POST /session` |
| `ESG_BROWSER_NAME` | Browser name. Default: `chrome` |
| `ESG_BROWSER_VERSION` | Browser version. Default: `latest` |
| `ESG_PLATFORM_NAME` | Platform name. Default: `linux` |
| `ESG_WORKERS` | Parallel test count. Default: `2` |
| `ESG_RETRY_DEMO` | Set `1` or `true` to run the retry demo. Default: skip |
| `ESG_STRESS_TEST` | Set `1` or `true` to run the CDP stress suite. Default: skip |
| `ESG_STRESS_TESTS` | Stress test count. Default: `8` |
| `ESG_STRESS_WORKERS` | Stress worker count for `npm run test:stress`. Default: `8` |
| `ESG_STRESS_DURATION_MS` | Explore time per stress test. Default: `60000` |

Farm session:

| Variable | Purpose |
| --- | --- |
| `ESG_ENABLE_VIDEO` | Farm session video. Default: `true` |
| `ESG_ENABLE_LOG` | Farm session log. Default: `true` |
| `ESG_ENABLE_VNC` | Live VNC. Default: `true` |
| `ESG_ENABLE_DEBUG` | Farm debug. Default: `false` |
| `ESG_CPU` | Session CPU units. Default: `2048` |
| `ESG_MEMORY` | Session memory units. Default: `2048` |
| `ESG_IDLE_TIMEOUT` | Idle timeout in seconds. Default: `120` |
| `ESG_MAX_TIMEOUT` | Max session time in seconds. Default: `3600` |
| `ESG_SCREEN_RESOLUTION` | Screen size. Default: `1920x1080x24` |
| `ESG_VIDEO_SCREEN_SIZE` | Farm video size. Default: `1920x1080` |
| `ESG_FRAME_RATE` | Farm video frame rate. Default: `12` |
| `ESG_TIME_ZONE` | Session time zone. Default: `UTC` |
| `ESG_STEP_PAUSE_MS` | Pause after each demo step. Default: `5000`. Set `0` to disable |

Timeouts (milliseconds):

| Variable | Purpose |
| --- | --- |
| `ESG_SESSION_CREATE_TIMEOUT_MS` | `POST /session` timeout. Default: `600000` |
| `ESG_SESSION_CLOSE_TIMEOUT_MS` | `DELETE /session` timeout. Default: `30000` |
| `ESG_WINDOW_MAXIMIZE_TIMEOUT_MS` | Window maximize timeout. Default: `30000` |
| `ESG_SESSION_FIXTURE_TIMEOUT_MS` | Session fixture timeout. Default: `660000` |
| `ESG_CDP_CONNECT_TIMEOUT_MS` | CDP connect timeout. Default: `60000` |
| `ESG_BROWSER_FIXTURE_TIMEOUT_MS` | Browser fixture timeout. Default: `70000` |
| `ESG_TEST_TIMEOUT_MS` | Playwright test timeout. Default: `120000` |

Zebrunner reporter:

| Variable | Purpose |
| --- | --- |
| `REPORTING_ENABLED` | Set `true` to send results to Zebrunner |
| `REPORTING_PROJECT_KEY` | Zebrunner project key. Default: `DEF` |
| `REPORTING_SERVER_HOSTNAME` | Zebrunner reporting URL |
| `REPORTING_SERVER_ACCESS_TOKEN` | Zebrunner access token |
| `REPORTING_LAUNCH_DISPLAY_NAME` | Launch name. Default: `Playwright Chrome on ESG` |
| `REPORTING_LAUNCH_BUILD` | Launch build. Default: `1.0.0` |
| `REPORTING_LAUNCH_ENVIRONMENT` | Launch environment. Default: `grid` |
| `REPORTING_LOGS_FLUSH_INTERVAL_MS` | Live log flush interval. Default: `1000` |

Playwright connects to the browser WebSocket:

`wss://<host>/devtools/<sessionId>/`

That path does not use basic auth.
`POST /session` and `DELETE /session/<id>` still use `ESG_USER` and `ESG_PASSWORD`.
