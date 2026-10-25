import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Opening } from '../plugins/opening';
import { markHomeReady, whenOpeningDone, resetOpeningForTest } from './homeReady';

vi.mock('../plugins/opening', () => ({ Opening: { homeReady: vi.fn(), whenDone: vi.fn() } }));

const settle = () => new Promise((r) => setTimeout(r, 0));

beforeEach(() => {
  resetOpeningForTest();
  vi.mocked(Opening.homeReady).mockReset().mockResolvedValue();
  vi.mocked(Opening.whenDone).mockReset().mockResolvedValue();
});

describe('homeReady (native opening clip)', () => {
  it('markHomeReady tells native once', () => {
    markHomeReady();
    markHomeReady();
    expect(Opening.homeReady).toHaveBeenCalledTimes(1);
  });

  it('a failing homeReady is swallowed', async () => {
    vi.mocked(Opening.homeReady).mockRejectedValue(new Error('no plugin'));
    expect(() => markHomeReady()).not.toThrow();
    await settle(); // an unhandled rejection would fail the run
  });

  it('whenOpeningDone waits for native', async () => {
    let finish: () => void = () => {};
    vi.mocked(Opening.whenDone).mockReturnValue(new Promise<void>((r) => { finish = r; }));
    const cb = vi.fn();
    whenOpeningDone().then(cb);
    await settle();
    expect(cb).not.toHaveBeenCalled();
    finish();
    await settle();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('whenOpeningDone asks native once per load', () => {
    const a = whenOpeningDone();
    const b = whenOpeningDone();
    expect(a).toBe(b);
    expect(Opening.whenDone).toHaveBeenCalledTimes(1);
  });

  // Plugin missing or broken: What's New and the crash alert must still show.
  it('a failing whenDone counts as done', async () => {
    vi.mocked(Opening.whenDone).mockRejectedValue(new Error('no plugin'));
    await expect(whenOpeningDone()).resolves.toBeUndefined();
  });

  it('reset forgets both', () => {
    markHomeReady();
    whenOpeningDone();
    resetOpeningForTest();
    markHomeReady();
    whenOpeningDone();
    expect(Opening.homeReady).toHaveBeenCalledTimes(2);
    expect(Opening.whenDone).toHaveBeenCalledTimes(2);
  });
});
