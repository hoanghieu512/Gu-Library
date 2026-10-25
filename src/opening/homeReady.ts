// Between the app and the native opening clip (spec 2026-10-25-mo-cua-video-design.md §5.5).
// Home reports it has drawn so the clip may fade once over; What's New and the crash alert wait
// for the clip's layer to leave. Native decides on its own when the clip does not play (switch
// off, share, crash, restored activity, animations removed); whenDone then resolves at once.
import { Opening } from '../plugins/opening';

let homeReported = false;
let done: Promise<void> | null = null;

/** Home has drawn. Told to native once per load; a missing plugin is not an error. */
export function markHomeReady(): void {
  if (homeReported) return;
  homeReported = true;
  Opening.homeReady().catch(() => { /* no clip to tell */ });
}

/** Resolves when the clip's layer has left; a failing plugin counts as done, nothing waits forever. */
export function whenOpeningDone(): Promise<void> {
  done ??= Opening.whenDone().catch(() => {});
  return done;
}

export function resetOpeningForTest(): void {
  homeReported = false;
  done = null;
}
