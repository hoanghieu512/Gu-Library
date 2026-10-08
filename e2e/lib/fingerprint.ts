// The read-only guard behind scripts/explore.ts: a listing of the QA kho on the device (path, size
// and mtime of every file) taken before and after an exploration. Any difference means the
// library changed, which exploration must never do. mtime catches a same-size rewrite (a subject's
// colour is a 7-character hex in _mon.json); Syncthing keeps mtimes, so a quiet kho keeps them too.
import { createHash } from 'node:crypto';

/**
 * Files that change without anyone editing the library: Syncthing's own folders and conflict
 * copies, the per-device reading position (the tests write it), the worker's log.
 */
export const IGNORED: RegExp[] = [
  /(^|\/)\.stversions(\/|$)/,
  /(^|\/)\.stfolder(\/|$)/,
  /(^|\/)_reading-[^/]*\.json$/,
  /(^|\/)_worker\.log[^/]*$/,
  /\.sync-conflict-/,
];

export interface FileStamp { size: number; mtime: number }

/** The `find` that produces what parseFindListing reads, run inside the kho. */
export const LISTING_CMD = "find . -type f -exec stat -c '%s %Y %n' {} +";

/**
 * Output of LISTING_CMD (one `size mtime ./path` per line) → stamp by path relative to the kho,
 * minus IGNORED.
 */
export function parseFindListing(out: string): Map<string, FileStamp> {
  const files = new Map<string, FileStamp>();
  for (const line of out.split('\n')) {
    const m = /^(\d+) (\d+) (?:\.\/)?(.+)$/.exec(line.replace(/\r$/, ''));
    if (!m || IGNORED.some((re) => re.test(m[3]))) continue;
    files.set(m[3], { size: Number(m[1]), mtime: Number(m[2]) });
  }
  return files;
}

/** sha256 of the sorted `path\tsize\tmtime` lines. */
export function hashListing(m: Map<string, FileStamp>): string {
  const lines = [...m].map(([path, f]) => `${path}\t${f.size}\t${f.mtime}`).sort();
  return createHash('sha256').update(lines.join('\n')).digest('hex');
}

export function diffListing(
  before: Map<string, FileStamp>,
  after: Map<string, FileStamp>,
): { added: string[]; removed: string[]; changed: string[] } {
  const added = [...after.keys()].filter((p) => !before.has(p)).sort();
  const removed = [...before.keys()].filter((p) => !after.has(p)).sort();
  const changed = [...after]
    .filter(([p, f]) => {
      const b = before.get(p);
      return b !== undefined && (b.size !== f.size || b.mtime !== f.mtime);
    })
    .map(([p]) => p)
    .sort();
  return { added, removed, changed };
}

/** explore.ts exit codes of its own, above `e2e explore`'s 0–4 (4 = internal runner error). */
export const EXIT_KHO_CHANGED = 10;
export const EXIT_KHO_UNCHECKED = 11;

/**
 * The exit code of a guarded exploration: the kho verdict wins over the run's own result; an
 * unchanged kho passes the run's code through (null = killed by a signal → 1).
 */
export function guardExit(runStatus: number | null, kho: 'same' | 'changed' | 'unchecked'): number {
  if (kho === 'changed') return EXIT_KHO_CHANGED;
  if (kho === 'unchecked') return EXIT_KHO_UNCHECKED;
  return runStatus ?? 1;
}
