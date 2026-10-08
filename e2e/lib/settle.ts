// Waiting for a reading to settle on a device screen, kept pure (clock and sleep injectable) so the
// rule is unit-tested: the Viewer shows its saved page first and applies a jump a moment later, and
// a broken jump can land and then be pulled back by the resume.

export interface SettleOptions {
  timeoutMs: number;
  holdMs: number;
  stepMs: number;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
}

/**
 * Read until `ok(value)`, then read once more after `holdMs` and return that reading: a value that
 * holds has settled, one that moved away is returned for the caller to fail on. Gives up at
 * `timeoutMs` with the last reading.
 */
export async function settleOn<T>(read: () => Promise<T>, ok: (v: T) => boolean, o: SettleOptions): Promise<T> {
  const sleep = o.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const now = o.now ?? Date.now;
  const end = now() + o.timeoutMs;
  let v = await read();
  while (!ok(v) && now() < end) {
    await sleep(o.stepMs);
    v = await read();
  }
  if (!ok(v)) return v;
  await sleep(o.holdMs);
  return read();
}
