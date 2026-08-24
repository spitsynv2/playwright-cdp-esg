import { currentLaunch, currentTest as zbrCurrentTest } from '@zebrunner/javascript-agent-playwright';

type SessionCapabilities = Parameters<typeof zbrCurrentTest.attachSessionCapabilities>[0];

export const currentTest = {
  ...zbrCurrentTest,
  attachText(name: string, text: string) {
    zbrCurrentTest.attachArtifact(Buffer.from(text, 'utf8'), name);
  },
  attachSessionCapabilities(capabilities: Record<string, unknown> | SessionCapabilities, sessionId?: string) {
    zbrCurrentTest.attachSessionCapabilities(capabilities as SessionCapabilities, sessionId);
  },
};

export { currentLaunch };
