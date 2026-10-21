// "Mục lục Điều" (tier 1 of spec §8): the Điều of one legal document, read from its sidecar.
// Pure, no DOM, no SAF. The sidecar is flat (`units[]` with a `path` of ancestors), so the table
// is the `dieu` units in reading order; Chương comes from `path`, not from a tree.

import { fold } from '../search/tokenize';
import { isReadableText } from '../search/invertedIndex';
import type { Sidecar } from '../search/invertedIndex';

export interface TocEntry {
  i: number;        // position in the table (document order): stable id for marks and keys
  num: string;      // folded article number, "5" or "10a"; "" when the label carries none
  label: string;    // "Điều 5"
  title: string;    // first line of the text without its "Điều N." lead, at most 160 chars
  chapter: string;  // nearest "Chương ..." in path, "" when none
  page: number;     // 1-based start page
}

const TITLE_MAX = 160;
// OCR reads Đ/đ as the eth letter (U+00D0/U+00F0); fold() would then split that "Điều" into "ieu".
// Worker v0.20.0+ already writes Đ, older sidecars may not.
const fixEth = (s: string) => s.normalize('NFC').replace(/\u00D0/g, 'Đ').replace(/\u00F0/g, 'đ');
const LEAD = /^Điều\s*\d+[a-zđ]*/iu;
const NUM = /^dieu\s*(\d+[a-z]*)/;
const CHAPTER = /^Chương\s/iu;

const str = (v: unknown) => (typeof v === 'string' ? fixEth(v).trim() : '');

export function buildToc(sidecar: Sidecar): TocEntry[] {
  const units = Array.isArray(sidecar?.units) ? sidecar.units : [];
  const out: TocEntry[] = [];
  for (const u of units) {
    if (u?.type !== 'dieu') continue;
    const page = u.page;
    if (typeof page !== 'number' || !Number.isInteger(page) || page < 1) continue;   // nowhere to jump
    const line = isReadableText(u.text) ? fixEth(u.text).split('\n')[0].trim() : '';
    const label = str(u.label) || (line.match(LEAD)?.[0] ?? '');
    if (!label) continue;
    const path = Array.isArray(u.path) ? u.path.map(str) : [];
    out.push({
      i: out.length,
      num: fold(label).match(NUM)?.[1] ?? '',
      label,
      title: line.replace(LEAD, '').replace(/^\s*[.:]?\s*/, '').slice(0, TITLE_MAX),
      chapter: path.findLast((p) => CHAPTER.test(p)) ?? '',
      page,
    });
  }
  return out;
}

/** The article number in what was typed: "Điều 5", "dieu 5", its eth form and " 5." all give "5". */
export function dieuQuery(raw: string): string {
  return fold(fixEth(raw)).trim().replace(/^dieu/, '').replace(/[^a-z0-9]/g, '');
}

/**
 * The exact number first, then numbers that start with it ("3": 3, 30..39, 300...), each group in
 * document order, like the in-document search since v1.42.2. `null` = nothing to filter by.
 */
export function filterToc(entries: TocEntry[], raw: string): TocEntry[] | null {
  const q = dieuQuery(raw);
  if (!q) return null;
  return [
    ...entries.filter((e) => e.num === q),
    ...entries.filter((e) => e.num !== q && e.num.startsWith(q)),
  ];
}

/**
 * The Điều being read on `page`: those starting on it, or else the one running through it (the
 * last to start before it). Empty before the first Điều.
 */
export function readingEntries(entries: TocEntry[], page: number): Set<number> {
  const on = entries.filter((e) => e.page === page);
  if (on.length > 0) return new Set(on.map((e) => e.i));
  let best: TocEntry | null = null;
  for (const e of entries) if (e.page < page && (!best || e.page >= best.page)) best = e;
  return new Set(best ? [best.i] : []);
}
