// The read-only guard behind scripts/explore.ts: a listing of the QA kho on the device (path and
// size of every file) taken before and after an exploration. Any difference means the agent
// changed the library, which exploration must never do.
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

/**
 * Output of `cd <kho> && find . -type f -exec stat -c '%s %n' {} +` (one `size ./path` per line)
 * → size by path relative to the kho, minus IGNORED.
 */
export function parseFindListing(out: string): Map<string, number> {
  const files = new Map<string, number>();
  for (const line of out.split('\n')) {
    const m = /^(\d+) (?:\.\/)?(.+)$/.exec(line.replace(/\r$/, ''));
    if (!m || IGNORED.some((re) => re.test(m[2]))) continue;
    files.set(m[2], Number(m[1]));
  }
  return files;
}

/** sha256 of the sorted `path\tsize` lines. */
export function hashListing(m: Map<string, number>): string {
  const lines = [...m].map(([path, size]) => `${path}\t${size}`).sort();
  return createHash('sha256').update(lines.join('\n')).digest('hex');
}

export function diffListing(
  before: Map<string, number>,
  after: Map<string, number>,
): { added: string[]; removed: string[]; resized: string[] } {
  const added = [...after.keys()].filter((p) => !before.has(p)).sort();
  const removed = [...before.keys()].filter((p) => !after.has(p)).sort();
  const resized = [...after].filter(([p, size]) => before.has(p) && before.get(p) !== size).map(([p]) => p).sort();
  return { added, removed, resized };
}
