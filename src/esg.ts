export type EsgSession = {
  sessionId: string;
  capabilities: Record<string, unknown>;
  host: URL;
  user: string;
  password: string;
  devtoolsUrl: string;
};

export type ZebrunnerSessionOptions = {
  enableVideo: boolean;
  enableLog: boolean;
  enableVNC: boolean;
  enableDebug: boolean;
  cpu: number;
  memory: number;
  idleTimeout: number;
  maxTimeout: number;
  screenResolution: string;
  videoScreenSize: string;
  frameRate: number;
  timeZone: string;
};

export type EsgTimeouts = {
  sessionCreateMs: number;
  sessionCloseMs: number;
  windowMaximizeMs: number;
  sessionFixtureMs: number;
  cdpConnectMs: number;
  browserFixtureMs: number;
  testMs: number;
};

export type EsgConfig = {
  host: URL;
  user: string;
  password: string;
  browserName: string;
  browserVersion: string;
  platformName: string;
  zebrunnerOptions: ZebrunnerSessionOptions;
  timeouts: EsgTimeouts;
  viewport: { width: number; height: number };
};

export function loadEsgTimeouts(): EsgTimeouts {
  const cdpConnectMs = envNumber('ESG_CDP_CONNECT_TIMEOUT_MS', 60_000);
  return {
    sessionCreateMs: envNumber('ESG_SESSION_CREATE_TIMEOUT_MS', 10 * 60 * 1000),
    sessionCloseMs: envNumber('ESG_SESSION_CLOSE_TIMEOUT_MS', 30_000),
    windowMaximizeMs: envNumber('ESG_WINDOW_MAXIMIZE_TIMEOUT_MS', 30_000),
    sessionFixtureMs: envNumber('ESG_SESSION_FIXTURE_TIMEOUT_MS', 11 * 60 * 1000),
    cdpConnectMs,
    browserFixtureMs: envNumber('ESG_BROWSER_FIXTURE_TIMEOUT_MS', cdpConnectMs + 10_000),
    testMs: envNumber('ESG_TEST_TIMEOUT_MS', 120_000),
  };
}

export function loadZebrunnerOptions(): ZebrunnerSessionOptions {
  return {
    enableVideo: envBoolean('ESG_ENABLE_VIDEO', true),
    enableLog: envBoolean('ESG_ENABLE_LOG', true),
    enableVNC: envBoolean('ESG_ENABLE_VNC', true),
    enableDebug: envBoolean('ESG_ENABLE_DEBUG', false),
    cpu: envNumber('ESG_CPU', 2048),
    memory: envNumber('ESG_MEMORY', 2048),
    idleTimeout: envNumber('ESG_IDLE_TIMEOUT', 120),
    maxTimeout: envNumber('ESG_MAX_TIMEOUT', 3600),
    screenResolution: envString('ESG_SCREEN_RESOLUTION', '1920x1080x24'),
    videoScreenSize: envString('ESG_VIDEO_SCREEN_SIZE', '1920x1080'),
    frameRate: envNumber('ESG_FRAME_RATE', 12),
    timeZone: envString('ESG_TIME_ZONE', 'UTC'),
  };
}

export function loadEsgConfig(): EsgConfig {
  const user = requiredEnv('ESG_USER');
  const password = requiredEnv('ESG_PASSWORD');
  const zebrunnerOptions = loadZebrunnerOptions();
  return {
    host: parseEsgHost(process.env.ESG_HOST || 'https://engine.zebrunner.dev'),
    user,
    password,
    browserName: envString('ESG_BROWSER_NAME', 'chrome'),
    browserVersion: envString('ESG_BROWSER_VERSION', 'latest'),
    platformName: envString('ESG_PLATFORM_NAME', 'linux'),
    zebrunnerOptions,
    timeouts: loadEsgTimeouts(),
    viewport: viewportFromResolution(zebrunnerOptions.screenResolution),
  };
}

export function sessionCapabilities(config: EsgConfig) {
  return {
    alwaysMatch: {
      browserName: config.browserName,
      browserVersion: config.browserVersion,
      platformName: config.platformName,
      'goog:chromeOptions': {
        args: ['--start-maximized'],
      },
      'zebrunner:options': { ...config.zebrunnerOptions },
    },
  };
}

export function reportingCapabilities(
  config: EsgConfig,
  sessionCaps: Record<string, unknown> = {},
) {
  const browserName = stringCap(sessionCaps.browserName) || config.browserName;
  const browserVersion = stringCap(sessionCaps.browserVersion) || config.browserVersion;
  const platformName = stringCap(sessionCaps.platformName) || config.platformName;
  const caps: {
    browserName: string;
    platformName: string;
    browserVersion?: string;
    'zebrunner:provider': string;
  } = {
    browserName,
    platformName,
    'zebrunner:provider': 'ZEBRUNNER',
  };
  if (browserVersion && browserVersion !== 'latest') {
    caps.browserVersion = browserVersion;
  }
  return caps;
}

export async function createEsgSession(config: EsgConfig = loadEsgConfig()): Promise<EsgSession> {
  const sessionUrl = new URL('/session', config.host);
  const response = await fetch(sessionUrl, {
    method: 'POST',
    headers: {
      Authorization: basicAuthHeader(config.user, config.password),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ capabilities: sessionCapabilities(config) }),
    signal: AbortSignal.timeout(config.timeouts.sessionCreateMs),
  });

  const body = await readJson(response);
  const errorMessage = seleniumError(body);
  if (!response.ok || errorMessage) {
    throw new Error(
      `ESG session create failed (${response.status}): ${errorMessage || JSON.stringify(body)}`,
    );
  }

  const sessionId = extractSessionId(body);
  if (!sessionId) {
    throw new Error(`ESG session create returned no sessionId: ${JSON.stringify(body)}`);
  }

  const capabilities = extractCapabilities(body);
  return {
    sessionId,
    capabilities,
    host: config.host,
    user: config.user,
    password: config.password,
    devtoolsUrl: devtoolsWebSocketUrl(config.host, sessionId),
  };
}

export async function maximizeEsgWindow(
  session: Pick<EsgSession, 'host' | 'sessionId' | 'user' | 'password'>,
) {
  const { windowMaximizeMs } = loadEsgTimeouts();
  const maximizeUrl = new URL(`/session/${session.sessionId}/window/maximize`, session.host);
  try {
    const response = await fetch(maximizeUrl, {
      method: 'POST',
      headers: {
        Authorization: basicAuthHeader(session.user, session.password),
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: '{}',
      signal: AbortSignal.timeout(windowMaximizeMs),
    });
    const body = await readJson(response);
    const errorMessage = seleniumError(body);
    if (!response.ok || errorMessage) {
      console.warn(
        `ESG window maximize failed for ${session.sessionId}: ${errorMessage || `HTTP ${response.status}`}`,
      );
    }
  } catch (error) {
    console.warn(`ESG window maximize failed for ${session.sessionId}: ${(error as Error).message}`);
  }
}

export async function closeEsgSession(session: Pick<EsgSession, 'host' | 'sessionId' | 'user' | 'password'>) {
  const { sessionCloseMs } = loadEsgTimeouts();
  const closeUrl = new URL(`/session/${session.sessionId}`, session.host);
  try {
    await fetch(closeUrl, {
      method: 'DELETE',
      headers: {
        Authorization: basicAuthHeader(session.user, session.password),
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(sessionCloseMs),
    });
  } catch (error) {
    console.warn(`ESG session close failed for ${session.sessionId}: ${(error as Error).message}`);
  }
}

export function devtoolsWebSocketUrl(host: URL, sessionId: string): string {
  const ws = new URL(host);
  ws.protocol = host.protocol === 'http:' ? 'ws:' : 'wss:';
  ws.pathname = `/devtools/${sessionId}/`;
  ws.search = '';
  ws.hash = '';
  ws.username = '';
  ws.password = '';
  return ws.toString();
}

function viewportFromResolution(resolution: string): { width: number; height: number } {
  const match = /^(\d+)x(\d+)/.exec(resolution);
  if (!match) {
    return { width: 1920, height: 1080 };
  }
  return { width: Number(match[1]), height: Number(match[2]) };
}

function parseEsgHost(raw: string): URL {
  const value = raw.trim();
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  const url = new URL(withScheme);
  if (!url.pathname || url.pathname === '/') {
    url.pathname = '';
  }
  return url;
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`${name} is required. Copy .env.example to .env and set the ESG credentials.`);
  }
  return value.trim();
}

function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  if (!value || !value.trim()) {
    return undefined;
  }
  return value.trim();
}

function envString(name: string, fallback: string): string {
  return optionalEnv(name) ?? fallback;
}

function envNumber(name: string, fallback: number): number {
  const raw = optionalEnv(name);
  if (raw === undefined) {
    return fallback;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a non-negative number. Received '${raw}'.`);
  }
  return value;
}

function envBoolean(name: string, fallback: boolean): boolean {
  const raw = optionalEnv(name);
  if (raw === undefined) {
    return fallback;
  }
  const normalized = raw.toLowerCase();
  if (normalized === 'true' || normalized === '1') {
    return true;
  }
  if (normalized === 'false' || normalized === '0') {
    return false;
  }
  throw new Error(`${name} must be true or false. Received '${raw}'.`);
}

function basicAuthHeader(user: string, password: string): string {
  return `Basic ${Buffer.from(`${user}:${password}`, 'utf8').toString('base64')}`;
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const text = (await response.text()).trim();
  if (!text) {
    return {};
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error(`ESG returned non-JSON (${response.status}): ${text.slice(0, 500)}`);
  }
}

function extractSessionId(body: Record<string, unknown>): string | undefined {
  if (typeof body.sessionId === 'string' && body.sessionId) {
    return body.sessionId;
  }
  const value = asObject(body.value);
  if (typeof value?.sessionId === 'string' && value.sessionId) {
    return value.sessionId;
  }
  return undefined;
}

function extractCapabilities(body: Record<string, unknown>): Record<string, unknown> {
  const value = asObject(body.value);
  return asObject(value?.capabilities) || asObject(body.capabilities) || {};
}

function seleniumError(body: Record<string, unknown>): string | undefined {
  const value = asObject(body.value);
  if (!value) {
    return undefined;
  }
  if (typeof value.error === 'string' && value.error) {
    return typeof value.message === 'string' ? `${value.error}: ${value.message}` : value.error;
  }
  return undefined;
}

function asObject(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function stringCap(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}
