import { test } from 'node:test';
import { deepEqual, equal, notEqual } from 'node:assert/strict';
import { diffListing, hashListing, parseFindListing } from '../lib/fingerprint.ts';

const LISTING = [
  '1200 ./Logic/Bai 1.pdf',
  '88 ./_reading-ab12.json',
  '5 ./Logic/.stversions/Bai 1~20261001.pdf',
  '0 ./.stfolder/x',
  '310 ./_worker.log.2',
  '42 ./Logic/Bai 1.sync-conflict-20261002-1.pdf',
  '77 ./Luật Đất Đai/Luật đất đai 2024.pdf',
].join('\n');

test('parseFindListing keeps kho files by relative path and skips sync/reading noise', () =>
  deepEqual(parseFindListing(LISTING), new Map([['Logic/Bai 1.pdf', 1200], ['Luật Đất Đai/Luật đất đai 2024.pdf', 77]])));

test('parseFindListing ignores blank lines and carriage returns (adb shell output)', () =>
  deepEqual(parseFindListing('10 ./a.pdf\r\n\r\n'), new Map([['a.pdf', 10]])));

test('hashListing does not depend on line order', () =>
  equal(hashListing(new Map([['a', 1], ['b', 2]])), hashListing(new Map([['b', 2], ['a', 1]]))));

test('hashListing changes when a size changes', () =>
  notEqual(hashListing(new Map([['a', 1]])), hashListing(new Map([['a', 2]]))));

test('diffListing reports one added, one removed, one resized', () =>
  deepEqual(
    diffListing(new Map([['a', 1], ['b', 2], ['c', 3]]), new Map([['a', 1], ['b', 5], ['d', 4]])),
    { added: ['d'], removed: ['c'], resized: ['b'] },
  ));
