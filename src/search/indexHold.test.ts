import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createIndexHold, HOLD_MS } from './indexHold';

let acquire: ReturnType<typeof vi.fn<() => void>>;
let release: ReturnType<typeof vi.fn<() => void>>;
beforeEach(() => {
  vi.useFakeTimers();
  acquire = vi.fn<() => void>();
  release = vi.fn<() => void>();
});
afterEach(() => { vi.useRealTimers(); });

const hold = (ms?: number) => createIndexHold({ acquire, release }, ms);

describe('createIndexHold', () => {
  it('holds for three minutes', () => {
    expect(HOLD_MS).toBe(180_000);
  });

  it('enter acquires once, however often it is called', () => {
    const h = hold();
    h.enter(); h.enter();
    expect(acquire).toHaveBeenCalledTimes(1);
  });

  it('leaving for HOLD_MS releases once', () => {
    const h = hold();
    h.enter(); h.leave();
    vi.advanceTimersByTime(HOLD_MS - 1);
    expect(release).toHaveBeenCalledTimes(0);
    vi.advanceTimersByTime(1);
    expect(release).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(HOLD_MS);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('coming back before HOLD_MS keeps the index', () => {
    const h = hold();
    h.enter(); h.leave();
    vi.advanceTimersByTime(HOLD_MS - 1);
    h.enter();
    vi.advanceTimersByTime(HOLD_MS);
    expect(release).toHaveBeenCalledTimes(0);
    expect(acquire).toHaveBeenCalledTimes(1);
  });

  it('leaving twice keeps one timer', () => {
    const h = hold();
    h.enter(); h.leave();
    vi.advanceTimersByTime(60_000);
    h.leave();
    vi.advanceTimersByTime(HOLD_MS - 60_000);
    expect(release).toHaveBeenCalledTimes(0);
    vi.advanceTimersByTime(60_000);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('entering after a release acquires again', () => {
    const h = hold();
    h.enter(); h.leave();
    vi.advanceTimersByTime(HOLD_MS);
    h.enter();
    expect(acquire).toHaveBeenCalledTimes(2);
  });

  it('pause releases at once, even on Search', () => {
    const h = hold();
    h.enter(); h.pause();
    expect(release).toHaveBeenCalledTimes(1);
    h.pause();
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('resume acquires only on Search', () => {
    const h = hold();
    h.enter(); h.pause(); h.resume();
    expect(acquire).toHaveBeenCalledTimes(2);
    h.leave(); h.pause(); h.resume();
    expect(acquire).toHaveBeenCalledTimes(2);
  });

  it('pause cancels a pending timer', () => {
    const h = hold();
    h.enter(); h.leave(); h.pause();
    expect(release).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(HOLD_MS);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('invalidate releases, and acquires again on Search', () => {
    const h = hold();
    h.enter(); h.invalidate();
    expect(release).toHaveBeenCalledTimes(1);
    expect(acquire).toHaveBeenCalledTimes(2);
    h.leave(); h.invalidate();
    expect(release).toHaveBeenCalledTimes(2);
    expect(acquire).toHaveBeenCalledTimes(2);
    h.enter();
    expect(acquire).toHaveBeenCalledTimes(3);
  });

  it('invalidate with nothing held only re-acquires on Search', () => {
    hold().invalidate();
    expect(release).toHaveBeenCalledTimes(0);
    expect(acquire).toHaveBeenCalledTimes(0);
  });

  it('dispose cancels the timer', () => {
    const h = hold();
    h.enter(); h.leave(); h.dispose();
    vi.advanceTimersByTime(HOLD_MS);
    expect(release).toHaveBeenCalledTimes(0);
  });

  it('a custom hold time', () => {
    const h = hold(1000);
    h.enter(); h.leave();
    vi.advanceTimersByTime(1000);
    expect(release).toHaveBeenCalledTimes(1);
  });
});
