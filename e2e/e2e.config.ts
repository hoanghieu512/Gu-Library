import type { E2EConfig } from 'e2e';
import { mobile } from '@e2e-dev/mobile';
import { openrouter } from '@openrouter/ai-sdk-provider';
import { DEFAULT_MODEL } from './lib/preflight.ts';

// Device by NAME (adb model), model by OpenRouter id — both overridable per run.
const DEVICE = process.env.E2E_DEVICE ?? 'UBS1';
const MODEL = process.env.E2E_MODEL ?? DEFAULT_MODEL;

// Both agents run on the QA library, which is real data: the smoke tests' agent.act steps
// (open a document, pick one for split view, back to the tabs) get the same rules as the explorer.
const READ_ONLY_RULES = `READ-ONLY. The library in this app is real data: never change it.
Never tap "Xóa", "Đổi tên", "Chuyển tới…", "Đi in", "Gom để in", "Xong", "Thêm" (button or tab), "Tạo môn mới", "Tạo thư mục mới" or "Đổi màu".
Never long-press a document row or a subject's spine on the shelf.
In "Cài đặt", never open "Folder kho", "Đồng bộ (Syncthing)" or "Dựng lại chỉ mục tìm kiếm".
Never share, import or pick a file from the phone.
Allowed: search, open documents, scroll, jump to a page, split the screen, open and close sheets, switch between the "Trang chủ" and "Tìm" tabs, go back.
If the goal seems to need a forbidden action, report that instead of doing it.`;

export default {
  targets: [
    {
      name: 'android',
      engine: mobile({ platform: 'android', device: DEVICE }),
      app: { bundleId: 'com.gulibrary.app' },
    },
  ],
  agents: {
    default: { model: openrouter(MODEL), maxSteps: 10, maxModelCalls: 10, system: READ_ONLY_RULES },
    // Only for `npm run explore`; scripts/explore.ts also checks the kho before and after as the last net.
    explorer: {
      model: openrouter(MODEL),
      maxSteps: 10,
      maxModelCalls: 10,
      context: 'Vietnamese law-document reader app on a QA library; the user is a law student.',
      system: READ_ONLY_RULES,
    },
  },
  workers: 1,
  retries: 0,
  cache: 'read-write',
  timeout: 300000,
  actionTimeout: 60000,
  assertionTimeout: 15000,
} satisfies E2EConfig;
