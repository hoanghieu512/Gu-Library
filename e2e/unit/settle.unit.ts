import { test } from 'node:test';
import { equal } from 'node:assert/strict';
import { settleOn } from '../lib/settle.ts';

/** A fake clock: sleep advances it, read returns the next scripted value (the last one repeats). */
function script(values: number[]) {
  let t = 0;
  let i = 0;
  return {
    read: async () => values[Math.min(i++, values.length - 1)],
    opts: { timeoutMs: 15000, holdMs: 2500, stepMs: 500, sleep: async (ms: number) => { t += ms; }, now: () => t },
  };
}

test('settleOn returns the target once it holds', async () => {
  const s = script([25, 24, 24]);
  equal(await settleOn(s.read, (p) => p === 24, s.opts), 24);
});

test('settleOn returns the drifted reading when the target does not hold (jump lands, then resume pulls back)', async () => {
  const s = script([25, 24, 25]);
  equal(await settleOn(s.read, (p) => p === 24, s.opts), 25);
});

test('settleOn gives up at the timeout with the last reading', async () => {
  const s = script([25]);
  equal(await settleOn(s.read, (p) => p === 24, s.opts), 25);
});
