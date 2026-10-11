import type { ReleaseNote } from './types';

/** x.y.z compared part by part as numbers (1.10.0 > 1.9.0); a missing or non-numeric part is 0. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.'), pb = b.split('.');
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (parseInt(pa[i] ?? '0', 10) || 0) - (parseInt(pb[i] ?? '0', 10) || 0);
    if (d !== 0) return d;
  }
  return 0;
}

const newestFirst = (notes: ReleaseNote[]) => [...notes].sort((x, y) => compareVersions(y.version, x.version));

/**
 * What the sheet shows after an update: every version Pé has not seen up to the running one —
 * skipped versions included — newest first, at most `max`. Never seen anything (first launch with
 * this feature) → only the running version: older ones were told by hand.
 */
export function unseenNotes(notes: ReleaseNote[], lastSeen: string | null, current: string, max = 3): ReleaseNote[] {
  const upTo = newestFirst(notes).filter((n) => compareVersions(n.version, current) <= 0);
  const fresh = lastSeen === null
    ? upTo.filter((n) => compareVersions(n.version, current) === 0)
    : upTo.filter((n) => compareVersions(n.version, lastSeen) > 0);
  return fresh.slice(0, max);
}

/** What Settings shows: the `max` latest versions up to the running one. */
export function recentNotes(notes: ReleaseNote[], current: string, max = 3): ReleaseNote[] {
  return newestFirst(notes).filter((n) => compareVersions(n.version, current) <= 0).slice(0, max);
}
