// When the Search screen keeps its whole-kho index in RAM, and when it lets go (spec 2026-10-21).
//
// Ionic keeps the Search page alive for the whole session, so without this the index (about
// 130 MB of heap, measured 05/09) stayed until the app was killed. The rule:
//   - leaving Search (another tab, or a result opened in the Viewer) starts a 3 minute hold; coming
//     back sooner keeps the index, so "open a result, read, back, open the next" never waits;
//   - the app going to the background releases at once: Android kills background apps that hold
//     the most first, and a WebView in the background may never run a timer set then.
// Pure: no React, no Ionic. Calling an event twice is harmless.

export const HOLD_MS = 3 * 60_000;

export interface IndexHold {
  enter(): void;       // Search is showing
  leave(): void;       // Search is no longer showing
  pause(): void;       // the app went to the background
  resume(): void;      // the app came back
  invalidate(): void;  // the stored index was cleared ("Dựng lại chỉ mục" in Settings)
  dispose(): void;
}

export function createIndexHold(
  actions: { acquire: () => void; release: () => void },
  holdMs = HOLD_MS,
): IndexHold {
  let visible = false;
  let held = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const cancel = () => { if (timer !== null) { clearTimeout(timer); timer = null; } };
  const acquire = () => { if (!held) { held = true; actions.acquire(); } };
  const release = () => { if (held) { held = false; actions.release(); } };

  return {
    enter() { visible = true; cancel(); acquire(); },
    leave() {
      visible = false;
      cancel();
      timer = setTimeout(() => { timer = null; release(); }, holdMs);
    },
    pause() { cancel(); release(); },
    resume() { if (visible) acquire(); },
    invalidate() { cancel(); release(); if (visible) acquire(); },
    dispose() { cancel(); },
  };
}
