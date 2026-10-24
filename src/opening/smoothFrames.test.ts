import { describe, it, expect, vi } from 'vitest';
import { afterSmoothFrames, SMOOTH_CAP_MS } from './smoothFrames';

// A hand-driven requestAnimationFrame: each frame(t) runs the callbacks queued before it.
function fakeRaf() {
  let queue: { id: number; cb: FrameRequestCallback }[] = [];
  let next = 1;
  return {
    raf: (cb: FrameRequestCallback) => { queue.push({ id: next, cb }); return next++; },
    caf: (id: number) => { queue = queue.filter((q) => q.id !== id); },
    frame(t: number) { const run = queue; queue = []; for (const q of run) q.cb(t); },
    pending: () => queue.length,
  };
}

describe('afterSmoothFrames', () => {
  it('fires after six frames in a row under 50 ms apart (about 100 ms of smooth painting)', () => {
    const f = fakeRaf();
    const done = vi.fn();
    afterSmoothFrames(done, f.raf, f.caf);
    for (const t of [0, 16, 32, 48, 64, 80]) f.frame(t);
    expect(done).not.toHaveBeenCalled();
    f.frame(96);
    expect(done).toHaveBeenCalledTimes(1);
    expect(f.pending()).toBe(0);
  });

  it('a long frame starts the count again', () => {
    const f = fakeRaf();
    const done = vi.fn();
    afterSmoothFrames(done, f.raf, f.caf);
    for (const t of [0, 16, 32, 48, 64, 80, 700, 716, 732, 748, 764, 780]) f.frame(t);
    expect(done).not.toHaveBeenCalled();
    f.frame(796);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('stops waiting at the cap, 2.5 s', () => {
    expect(SMOOTH_CAP_MS).toBe(2500);
    const f = fakeRaf();
    const done = vi.fn();
    afterSmoothFrames(done, f.raf, f.caf);
    f.frame(0);
    f.frame(2499);
    expect(done).not.toHaveBeenCalled();
    f.frame(2500);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('cancel stops it for good', () => {
    const f = fakeRaf();
    const done = vi.fn();
    const cancel = afterSmoothFrames(done, f.raf, f.caf);
    f.frame(0);
    cancel();
    for (const t of [16, 32, 48, 64]) f.frame(t);
    expect(done).not.toHaveBeenCalled();
    expect(f.pending()).toBe(0);
  });
});
