// The bookcase doors shown on a cold start (spec 2026-10-24-mo-cua-tu-sach). Pure: no DOM, no timers.
//   cover    plain cream, same as the splash, while the switch and the images are read
//   closed   doors shut, panda in front, waiting for Home to draw and for MIN_SHOWN_MS
//   opening  doors swing open and the overlay fades into Home (OPEN_MS)
//   fastOpen skipped by a tap, back, a share or a crash flag (FAST_MS)
//   done     overlay gone for good in this WebView load

export const MIN_SHOWN_MS = 400;
export const DEADLINE_MS = 4000; // spec said 2500; Home needs 2.8 to 3.0 s on UBS1 (Docs/perf/2026-10-24-opening-doors.md)
export const OPEN_MS = 1000;
export const FAST_MS = 200;
export const DOORS_FADE_IN_MS = 150;
/** Fallback timers wait this much longer than the animation, in case animationend never fires. */
export const FALLBACK_SLACK_MS = 300;

export type OpeningState = 'cover' | 'closed' | 'opening' | 'fastOpen' | 'done';
export type SkipReason = 'tap' | 'back' | 'share' | 'crash';
export type OpeningEvent =
  | { type: 'start'; play: boolean }
  | { type: 'homeReady' }
  | { type: 'minElapsed' }
  | { type: 'deadline' }
  | { type: 'skip'; reason: SkipReason }
  | { type: 'animEnd' };

export interface OpeningModel {
  state: OpeningState;
  homeReady: boolean;
  minElapsed: boolean;
}

export function initialModel(): OpeningModel {
  return { state: 'cover', homeReady: false, minElapsed: false };
}

export function step(m: OpeningModel, e: OpeningEvent): OpeningModel {
  if (m.state === 'done') return m;
  const next = transition(m, e);
  // Both conditions met while shut: open. Flags set before the doors showed still count.
  if (next.state === 'closed' && next.homeReady && next.minElapsed) return { ...next, state: 'opening' };
  return next;
}

function transition(m: OpeningModel, e: OpeningEvent): OpeningModel {
  switch (e.type) {
    case 'start':
      if (m.state !== 'cover') return m;
      return { ...m, state: e.play ? 'closed' : 'done' };
    case 'homeReady':
      return { ...m, homeReady: true };
    case 'minElapsed':
      return { ...m, minElapsed: true };
    case 'deadline':
      if (m.state === 'cover') return { ...m, state: 'done' };
      if (m.state === 'closed') return { ...m, state: 'opening' };
      return m;
    case 'skip':
      if (m.state === 'cover') return { ...m, state: 'done' };
      if (m.state === 'closed' || m.state === 'opening') return { ...m, state: 'fastOpen' };
      return m;
    case 'animEnd':
      if (m.state === 'opening' || m.state === 'fastOpen') return { ...m, state: 'done' };
      return m;
  }
}
