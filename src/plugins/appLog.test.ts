import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SafNative } from './safNative';
import { logWarn } from './appLog';

vi.mock('./safNative', () => ({ SafNative: {} }));

beforeEach(() => {
  for (const k of Object.keys(SafNative)) delete (SafNative as unknown as Record<string, unknown>)[k];
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});
afterEach(() => { vi.restoreAllMocks(); });

describe('logWarn', () => {
  it('writes to the console, for tests and debug builds', () => {
    const boom = new Error('write failed: disk full');
    Object.assign(SafNative, { logWarn: async () => {} });
    logWarn('recordProgress failed', boom);
    expect(console.warn).toHaveBeenCalledWith('recordProgress failed', boom);
  });

  // Review of 20/10: a release build prints no console output, so the warning has to reach logcat
  // through the plugin to be seen at all.
  it('sends one line to the native log, for release builds', () => {
    const native = vi.fn(async () => {});
    Object.assign(SafNative, { logWarn: native });
    logWarn('recordProgress failed', new Error('write failed: disk full'));
    expect(native).toHaveBeenCalledWith({ message: 'recordProgress failed: Error: write failed: disk full' });
  });

  it('says what a rejection that is not an Error was', () => {
    const native = vi.fn(async () => {});
    Object.assign(SafNative, { logWarn: native });
    logWarn('recordProgress failed', { code: 'X' });
    expect(native).toHaveBeenCalledWith({ message: 'recordProgress failed: {"code":"X"}' });
  });

  // On the web, in tests without a fake, or with an older plugin there is no native log.
  it('never throws when the native log is missing or fails', async () => {
    expect(() => logWarn('recordProgress failed', new Error('x'))).not.toThrow();
    Object.assign(SafNative, { logWarn: async () => { throw new Error('not implemented'); } });
    expect(() => logWarn('recordProgress failed', new Error('x'))).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));   // an unhandled rejection would fail the run
  });
});
