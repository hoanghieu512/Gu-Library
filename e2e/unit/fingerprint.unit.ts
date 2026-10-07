import { test } from 'node:test';
import { deepEqual, equal, notEqual } from 'node:assert/strict';
import { EXIT_KHO_CHANGED, EXIT_KHO_UNCHECKED, diffListing, guardExit, hashListing, parseFindListing } from '../lib/fingerprint.ts';

const LISTING = [
  '1200 1759800000 ./Logic/Bai 1.pdf',
  '88 1759800001 ./_reading-ab12.json',
  '5 1759800002 ./Logic/.stversions/Bai 1~20261001.pdf',
  '0 1759800003 ./.stfolder/x',
  '310 1759800004 ./_worker.log.2',
  '42 1759800005 ./Logic/Bai 1.sync-conflict-20261002-1.pdf',
  '77 1759800006 ./Luật Đất Đai/Luật đất đai 2024.pdf',
].join('\n');

const f = (size: number, mtime = 1) => ({ size, mtime });

test('parseFindListing keeps kho files by relative path and skips sync/reading noise', () =>
  deepEqual(parseFindListing(LISTING), new Map([['Logic/Bai 1.pdf', f(1200, 1759800000)], ['Luật Đất Đai/Luật đất đai 2024.pdf', f(77, 1759800006)]])));

test('parseFindListing ignores blank lines and carriage returns (adb shell output)', () =>
  deepEqual(parseFindListing('10 5 ./a.pdf\r\n\r\n'), new Map([['a.pdf', f(10, 5)]])));

test('hashListing does not depend on line order', () =>
  equal(hashListing(new Map([['a', f(1)], ['b', f(2)]])), hashListing(new Map([['b', f(2)], ['a', f(1)]]))));

test('hashListing changes when a size changes', () =>
  notEqual(hashListing(new Map([['a', f(1)]])), hashListing(new Map([['a', f(2)]]))));

test('hashListing changes on a same-size rewrite (mtime moves: a subject colour #2F4A33 → #2E4864)', () =>
  notEqual(hashListing(new Map([['Logic/_mon.json', f(19, 100)]])), hashListing(new Map([['Logic/_mon.json', f(19, 160)]]))));

test('diffListing reports one added, one removed, one changed in size, one rewritten at the same size', () =>
  deepEqual(
    diffListing(
      new Map([['a', f(1)], ['b', f(2)], ['c', f(3)], ['e', f(7, 1)]]),
      new Map([['a', f(1)], ['b', f(5)], ['d', f(4)], ['e', f(7, 9)]]),
    ),
    { added: ['d'], removed: ['c'], changed: ['b', 'e'] },
  ));

test('guardExit: a changed kho wins over the run result, with its own code', () =>
  equal(guardExit(0, 'changed'), EXIT_KHO_CHANGED));

test('guardExit: a kho that could not be read after the run is reported, not passed', () =>
  equal(guardExit(0, 'unchecked'), EXIT_KHO_UNCHECKED));

test('guardExit: an unchanged kho passes the run result through (4 = runner error stays 4)', () => {
  equal(guardExit(4, 'same'), 4);
  equal(guardExit(null, 'same'), 1);
});

test('guardExit codes do not collide with e2e explore exit codes (0–4) or each other', () => {
  const codes: number[] = [EXIT_KHO_CHANGED, EXIT_KHO_UNCHECKED];
  equal(codes.every((c) => c > 4), true);
  equal(new Set(codes).size, 2);
});
