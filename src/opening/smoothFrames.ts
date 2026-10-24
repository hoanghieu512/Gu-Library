// Wait until the WebView paints smoothly again. Right after Home first draws, its shelf work blocks
// the main thread for about 1.4 s on UBS1 (Docs/perf/2026-10-24-opening-doors.md), and an Android
// WebView paints nothing meanwhile, CSS animations included: doors opened then would never be seen.
// A second, shorter spell (about 0.4 s) can follow a few frames later, so the doors open only after
// about 100 ms of smooth painting: SMOOTH_FRAMES gaps in a row under SMOOTH_FRAME_MS, or after
// SMOOTH_CAP_MS whatever happens (UBS1: 1.5 s, a few frames, then 0.4 s).

export const SMOOTH_FRAME_MS = 50;
export const SMOOTH_FRAMES = 6;
export const SMOOTH_CAP_MS = 2500;

/** Calls `done` once; returns a cancel function. raf/caf are injectable for tests. */
export function afterSmoothFrames(
  done: () => void,
  raf: (cb: FrameRequestCallback) => number = requestAnimationFrame,
  caf: (id: number) => void = cancelAnimationFrame,
): () => void {
  let start: number | null = null;
  let last: number | null = null;
  let streak = 0;
  let id = 0;
  const tick = (t: number) => {
    if (start === null) start = t;
    if (last !== null) streak = t - last < SMOOTH_FRAME_MS ? streak + 1 : 0;
    last = t;
    if (streak >= SMOOTH_FRAMES || t - start >= SMOOTH_CAP_MS) { id = 0; done(); return; }
    id = raf(tick);
  };
  id = raf(tick);
  return () => { if (id) caf(id); id = 0; };
}
