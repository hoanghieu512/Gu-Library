import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { OpeningEvent } from './openingMachine';
import {
  markHomeReady, skipOpening, subscribeOpening, finishOpening, whenOpeningDone, resetOpeningForTest,
} from './homeReady';

beforeEach(() => resetOpeningForTest());

describe('homeReady signals', () => {
  it('replays homeReady to a late subscriber, once', () => {
    markHomeReady();
    markHomeReady();
    const seen: OpeningEvent[] = [];
    subscribeOpening((e) => seen.push(e));
    expect(seen).toEqual([{ type: 'homeReady' }]);
  });

  it('replays the first skip reason to a late subscriber', () => {
    skipOpening('share');
    skipOpening('crash');
    const seen: OpeningEvent[] = [];
    subscribeOpening((e) => seen.push(e));
    expect(seen).toEqual([{ type: 'skip', reason: 'share' }]);
  });

  it('delivers live events and stops after unsubscribe', () => {
    const seen: OpeningEvent[] = [];
    const off = subscribeOpening((e) => seen.push(e));
    skipOpening('tap');
    off();
    markHomeReady();
    expect(seen).toEqual([{ type: 'skip', reason: 'tap' }]);
  });

  it('a live homeReady reaches the subscriber only the first time', () => {
    const seen: OpeningEvent[] = [];
    subscribeOpening((e) => seen.push(e));
    markHomeReady();
    markHomeReady();
    expect(seen).toEqual([{ type: 'homeReady' }]);
  });

  it('whenOpeningDone resolves once, on the first finishOpening', async () => {
    const cb = vi.fn();
    whenOpeningDone().then(cb);
    await Promise.resolve();
    expect(cb).not.toHaveBeenCalled();
    finishOpening();
    finishOpening();
    await whenOpeningDone();
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('reset gives a fresh pending promise and clears the flags', async () => {
    markHomeReady();
    skipOpening('crash');
    finishOpening();
    resetOpeningForTest();
    const seen: OpeningEvent[] = [];
    subscribeOpening((e) => seen.push(e));
    expect(seen).toEqual([]);
    const cb = vi.fn();
    whenOpeningDone().then(cb);
    await Promise.resolve();
    expect(cb).not.toHaveBeenCalled();
  });
});
