import type { E2EConfig } from 'e2e';
import { mobile } from '@e2e-dev/mobile';
import { openrouter } from '@openrouter/ai-sdk-provider';

// Device by NAME (adb model), model by OpenRouter id — both overridable per run.
const DEVICE = process.env.E2E_DEVICE ?? 'UBS1';
const MODEL = process.env.E2E_MODEL ?? 'anthropic/claude-haiku-4.5';

export default {
  targets: [
    {
      name: 'android',
      engine: mobile({ platform: 'android', device: DEVICE }),
      app: { bundleId: 'com.gulibrary.app' },
    },
  ],
  agents: {
    default: { model: openrouter(MODEL), maxSteps: 10, maxModelCalls: 10 },
  },
  workers: 1,
  retries: 0,
  cache: 'read-write',
  timeout: 300000,
  actionTimeout: 60000,
  assertionTimeout: 15000,
} satisfies E2EConfig;
