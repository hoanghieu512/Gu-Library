import { describe, it, expect } from 'vitest';
import { compareVersions, recentNotes, unseenNotes } from './select';
import type { ReleaseNote } from './types';

const N = (v: string): ReleaseNote => ({ version: v, date: '01/01/2026', items: [{ kind: 'fix', text: 'x' }] });
const NOTES = ['1.42.0', '1.41.1', '1.41.0', '1.40.1'].map(N);
const vs = (ns: ReleaseNote[]) => ns.map((n) => n.version);

describe('compareVersions', () => {
  it('compares by number, not text', () => {
    expect(compareVersions('1.10.0', '1.9.0')).toBeGreaterThan(0);
    expect(compareVersions('1.41.1', '1.41.0')).toBeGreaterThan(0);
    expect(compareVersions('1.41.0', '1.41.0')).toBe(0);
    expect(compareVersions('1.41', '1.41.0')).toBe(0);           // a missing part counts as 0
    expect(compareVersions('1.42.0-debug', '1.42.0')).toBe(0);   // a non-numeric tail is ignored
  });
});

describe('unseenNotes — what the sheet shows after an update', () => {
  it('skipped versions all show, newest first', () =>
    expect(vs(unseenNotes(NOTES, '1.40.1', '1.42.0'))).toEqual(['1.42.0', '1.41.1', '1.41.0']));

  it('at most 3', () =>
    expect(vs(unseenNotes(NOTES, '1.39.0', '1.42.0'))).toEqual(['1.42.0', '1.41.1', '1.41.0']));

  it('never seen anything → only the current version', () =>
    expect(vs(unseenNotes(NOTES, null, '1.42.0'))).toEqual(['1.42.0']));

  it('already seen, reinstall or downgrade → nothing', () => {
    expect(unseenNotes(NOTES, '1.42.0', '1.42.0')).toEqual([]);
    expect(unseenNotes(NOTES, '1.43.0', '1.42.0')).toEqual([]);
  });

  it('versions newer than the running app never show', () =>
    expect(vs(unseenNotes(NOTES, '1.41.0', '1.41.1'))).toEqual(['1.41.1']));

  it('running version without a note → nothing, no error', () =>
    expect(unseenNotes(NOTES, null, '1.43.0')).toEqual([]));
});

describe('recentNotes — what Settings shows', () => {
  it('the 3 latest up to the running version', () =>
    expect(vs(recentNotes(NOTES, '1.41.1'))).toEqual(['1.41.1', '1.41.0', '1.40.1']));
});
