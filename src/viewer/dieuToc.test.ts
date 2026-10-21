import { describe, it, expect } from 'vitest';
import { buildToc, dieuQuery, filterToc, readingEntries } from './dieuToc';
import { IMAGE_PAGE_PREFIX } from '../search/invertedIndex';
import type { Sidecar, SidecarUnit } from '../search/invertedIndex';

const d = (o: Partial<SidecarUnit>): SidecarUnit => ({ type: 'dieu', page: 1, text: '', ...o });
const toc = (units: SidecarUnit[]) => buildToc({ kind: 'legal', units });

describe('buildToc', () => {
  it('keeps only dieu units, in document order', () => {
    const t = toc([
      d({ label: 'Điều 1' }),
      { type: 'khoan', label: 'Khoản 1', page: 1, text: 'x' },
      { type: 'heading', label: '', page: 2, text: 'x' },
      d({ label: 'Điều 2', page: 3 }),
    ]);
    expect(t.map((e) => [e.i, e.label])).toEqual([[0, 'Điều 1'], [1, 'Điều 2']]);
  });

  it('reads number, title and nearest chapter', () => {
    const [e] = toc([d({
      label: 'Điều 5', path: ['Phần thứ nhất', 'Chương I', 'Mục 1', 'Điều 5'], page: 3,
      text: 'Điều 5. Nguyên tắc áp dụng\n1. Khoản một.',
    })]);
    expect(e).toEqual({ i: 0, num: '5', label: 'Điều 5', title: 'Nguyên tắc áp dụng', chapter: 'Chương I', page: 3 });
  });

  it('takes the last Chương of an odd path', () => {
    expect(toc([d({ label: 'Điều 9', path: ['Chương I', 'Chương II', 'Điều 9'] })])[0].chapter).toBe('Chương II');
    expect(toc([d({ label: 'Điều 9', path: [] })])[0].chapter).toBe('');
  });

  it('reads Ð and letter suffixes', () => {
    const [e] = toc([d({ label: 'Ðiều 10a', text: 'Ðiều 10a. Bổ sung' })]);
    expect(e.label).toBe('Điều 10a');
    expect(e.num).toBe('10a');
    expect(e.title).toBe('Bổ sung');
  });

  it('lists a label without a number', () => {
    const t = toc([d({ label: 'Điều bổ sung' })]);
    expect(t).toHaveLength(1);
    expect(t[0].num).toBe('');
  });

  it('falls back to the text for an empty label', () => {
    const [e] = toc([d({ label: '', text: 'Điều 12: Hiệu lực thi hành' })]);
    expect(e).toMatchObject({ label: 'Điều 12', num: '12', title: 'Hiệu lực thi hành' });
    expect(toc([d({ label: '', text: 'Không có số' })])).toEqual([]);
  });

  it('title of heading-only, long and image units', () => {
    expect(toc([d({ label: 'Điều 34', text: 'Điều 34.' })])[0].title).toBe('');
    expect(toc([d({ label: 'Điều 1', text: 'Điều 1. ' + 'a'.repeat(300) })])[0].title).toHaveLength(160);
    expect(toc([d({ label: 'Điều 4', text: IMAGE_PAGE_PREFIX + ' (trang 4)' })])[0].title).toBe('');
  });

  it('leaves out units without a usable page', () => {
    const pages = [0, -1, NaN, '5' as unknown as number, undefined];
    expect(toc(pages.map((page) => d({ label: 'Điều 1', page })))).toEqual([]);
  });

  it('keeps duplicate numbers', () => {
    const t = toc([d({ label: 'Điều 3', page: 1 }), d({ label: 'Điều 3', page: 128 })]);
    expect(t.map((e) => [e.i, e.num, e.page])).toEqual([[0, '3', 1], [1, '3', 128]]);
  });

  it('survives a malformed sidecar', () => {
    expect(buildToc({})).toEqual([]);
    expect(buildToc({ units: 'x' } as unknown as Sidecar)).toEqual([]);
    const odd = { type: 'dieu', label: 5, path: 'Chương I', page: 2, text: 'Điều 7. X' } as unknown as SidecarUnit;
    const t = toc([odd]);
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({ label: 'Điều 7', chapter: '' });
  });
});

describe('filterToc', () => {
  const entries = toc([
    d({ label: 'Điều 3', page: 1 }), d({ label: 'Điều 5', page: 2 }), d({ label: 'Điều 10', page: 3 }),
    d({ label: 'Điều 10a', page: 4 }), d({ label: 'Điều 30', page: 9 }), d({ label: 'Điều 35', page: 10 }),
    d({ label: 'Điều 100', page: 30 }), d({ label: 'Điều 3', page: 128 }),
  ]);
  const labels = (q: string) => filterToc(entries, q)?.map((e) => e.label);

  it('no filter for an empty query', () => {
    for (const q of ['', '   ', 'Điều', 'dieu .']) expect(filterToc(entries, q)).toBeNull();
    expect(dieuQuery('Điều')).toBe('');
  });

  it('exact number first, then numbers starting with it', () => {
    expect(filterToc(entries, '3')?.map((e) => [e.label, e.page]))
      .toEqual([['Điều 3', 1], ['Điều 3', 128], ['Điều 30', 9], ['Điều 35', 10]]);
    expect(labels('10')).toEqual(['Điều 10', 'Điều 10a', 'Điều 100']);
    expect(labels('10A')).toEqual(['Điều 10a']);
  });

  it('reads Điều 5, dieu 5, Ðiều 5 and " 5." as 5', () => {
    for (const q of ['Điều 5', 'dieu 5', 'Ðiều 5', ' 5.']) expect(labels(q)).toEqual(['Điều 5']);
    expect(dieuQuery(' 5.')).toBe('5');
  });

  it('nothing for a number the document lacks', () => {
    expect(filterToc(entries, '999')).toEqual([]);
    expect(dieuQuery('dieu 999')).toBe('999');
  });
});

describe('readingEntries', () => {
  const entries = toc([
    d({ label: 'Điều 1', page: 1 }), d({ label: 'Điều 2', page: 1 }), d({ label: 'Điều 3', page: 2 }),
    d({ label: 'Điều 4', page: 4 }), d({ label: 'Điều 5', page: 4 }), d({ label: 'Điều 6', page: 7 }),
  ]);

  it('the Điều that start on the page', () => {
    expect(readingEntries(entries, 4)).toEqual(new Set([3, 4]));
    expect(readingEntries(entries, 1)).toEqual(new Set([0, 1]));
  });

  it('the Điều running through a page where none starts', () => {
    expect(readingEntries(entries, 3)).toEqual(new Set([2]));
    expect(readingEntries(entries, 5)).toEqual(new Set([4]));
    expect(readingEntries(entries, 9)).toEqual(new Set([5]));
  });

  it('nothing before the first Điều', () => {
    expect(readingEntries(toc([d({ label: 'Điều 1', page: 3 })]), 1)).toEqual(new Set());
  });

  it('a repeated number later in the document', () => {
    const t = toc([d({ label: 'Điều 3', page: 1 }), d({ label: 'Điều 4', page: 2 }), d({ label: 'Điều 3', page: 128 })]);
    expect(readingEntries(t, 130)).toEqual(new Set([2]));
  });
});
