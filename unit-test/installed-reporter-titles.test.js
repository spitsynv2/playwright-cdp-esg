const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const helpers = require(path.join(
  path.dirname(require.resolve('@zebrunner/javascript-agent-playwright')),
  'helpers',
));

const options = {
  ignorePlaywrightSteps: false,
  includeHooks: false,
  includeFixtures: false,
  includeBridgeActions: true,
  format: 'playwright-title',
  includeDuration: false,
  includeLocation: false,
  maxSourceLines: 4,
  maxMessageLength: 8000,
};

const withSource = (lines, run) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zbr-installed-titles-'));
  const sourcePath = path.join(dir, 'sample.spec.ts');
  fs.writeFileSync(sourcePath, `${lines.join('\n')}\n`);
  try {
    return run(sourcePath);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

test('installed reporter restores the launch 4184 title gaps', () => {
  withSource(
    [
      "const TEXT_TARGET = 'https://example.com/';",
      "const JSON_API = 'https://jsonplaceholder.typicode.com';",
      'const res = await request.get(TEXT_TARGET);',
      'const userResponse = await request.get(`${JSON_API}/users/1`);',
      'const created = await request.post(`${JSON_API}/users`, { data: { name: "John Doe" } });',
      'expect(err, `should reject`).toBeInstanceOf(Error);',
      'await device.wait({ text }, { timeout });',
      'await device.tap({ text });',
    ],
    (sourcePath) => {
      const logs = helpers.getTestLogs(
        [
          { title: 'GET "/"', line: 3 },
          { title: 'GET "/users/1"', line: 4 },
          { title: 'POST "/users"', line: 5 },
          { title: 'Expect "toBeInstanceOf"', category: 'expect', line: 6 },
          { title: 'Wait', line: 7 },
          { title: 'Tap', line: 8 },
        ].map((step) => ({
          category: step.category || 'pw:api',
          startTime: new Date(1),
          duration: 1,
          location: { file: sourcePath, line: step.line, column: 1 },
          steps: [],
          title: step.title,
        })),
        1,
        options,
      );
      assert.deepEqual(
        logs.map((entry) => entry.message),
        [
          'GET "https://example.com/"',
          'GET "https://jsonplaceholder.typicode.com/users/1"',
          'POST "https://jsonplaceholder.typicode.com/users"',
          'Expect err to be instance of Error',
          'Wait for text',
          'Tap text',
        ],
      );
    },
  );
});
