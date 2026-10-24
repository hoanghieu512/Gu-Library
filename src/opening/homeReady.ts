// Signals between the app and the opening doors (spec 2026-10-24-mo-cua-tu-sach §5.2).
// Home says it has drawn; ShareReceiver and CrashNotice say to skip; What's New and the crash alert
// wait for the doors to be gone. Flags are kept so a listener that subscribes late still hears
// what already happened.
import type { OpeningEvent, SkipReason } from './openingMachine';

type Listener = (e: OpeningEvent) => void;

let homeReady = false;
let firstSkip: SkipReason | null = null;
let listeners = new Set<Listener>();
let finished = false;
let resolveDone: () => void = () => {};
let done = newDone();

function newDone(): Promise<void> {
  return new Promise<void>((resolve) => { resolveDone = resolve; });
}

function emit(e: OpeningEvent): void {
  for (const l of [...listeners]) l(e);
}

export function markHomeReady(): void {
  if (homeReady) return;
  homeReady = true;
  emit({ type: 'homeReady' });
}

export function skipOpening(reason: SkipReason): void {
  if (firstSkip === null) firstSkip = reason;
  emit({ type: 'skip', reason });
}

/** Replays homeReady and the first skip synchronously, then delivers live events. */
export function subscribeOpening(listener: Listener): () => void {
  listeners.add(listener);
  if (homeReady) listener({ type: 'homeReady' });
  if (firstSkip !== null) listener({ type: 'skip', reason: firstSkip });
  return () => { listeners.delete(listener); };
}

export function finishOpening(): void {
  if (finished) return;
  finished = true;
  resolveDone();
}

export function whenOpeningDone(): Promise<void> {
  return done;
}

export function resetOpeningForTest(): void {
  homeReady = false;
  firstSkip = null;
  listeners = new Set();
  finished = false;
  done = newDone();
}
