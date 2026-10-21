// In-memory @capacitor/preferences for tests:
//   vi.mock('@capacitor/preferences', () => import('../test/fakePreferences'));
//   import { prefs } from '../test/fakePreferences';   // clear and seed it in beforeEach
// The test's import and the mock resolve to this one module, so they share `prefs`.

export const prefs = new Map<string, string>();

export const Preferences = {
  get: async ({ key }: { key: string }) => ({ value: prefs.get(key) ?? null }),
  set: async ({ key, value }: { key: string; value: string }) => { prefs.set(key, value); },
  remove: async ({ key }: { key: string }) => { prefs.delete(key); },
};
