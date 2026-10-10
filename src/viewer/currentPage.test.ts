import { describe, it, expect } from 'vitest';
import { mostVisiblePage, pageAfterScroll } from './currentPage';

// PdfView's offsets: offsets[0] = 0, offsets[n] = top of page n+1 (slot heights incl. GAP).
const offs = (heights: number[]): number[] => heights.reduce((a, h) => [...a, a[a.length - 1] + h], [0]);

describe('mostVisiblePage — the page taking the most of the screen (v1.41.1)', () => {
  it('a page taller than the viewport fills it → that page', () =>
    expect(mostVisiblePage(offs([1000, 1000, 1000]), 3, 1200, 600)).toBe(2));

  it('two equal pages share the viewport → same page as the centre rule', () => {
    const o = offs(Array(6).fill(510)); const vh = 580;
    for (const top of [0, 37, 100, 250, 333, 600, 777, 1000, 1500, 2000]) {
      const centre = o.findIndex((y, i) => i > 0 && y > top + vh / 2);
      expect(mostVisiblePage(o, 6, top, vh)).toBe(centre);
    }
  });

  it('slide deck: page 3 at the top, 3 and 4 fully visible → 3 (the centre rule said 4)', () =>
    expect(mostVisiblePage(offs(Array(8).fill(276)), 8, 276 * 2, 580)).toBe(3));

  it('equal visible share → the upper page', () =>
    expect(mostVisiblePage(offs([300, 300]), 2, 0, 600)).toBe(1));

  it('mixed heights: 500 px of a tall page beats a fully visible 300 px page below it', () =>
    expect(mostVisiblePage(offs([800, 300, 800]), 3, 300, 800)).toBe(1));

  it('one page / no pages → 1', () => {
    expect(mostVisiblePage(offs([700]), 1, 0, 580)).toBe(1);
    expect(mostVisiblePage([0], 0, 0, 580)).toBe(1);
  });
});

describe('pageAfterScroll — a jump holds its page until the user scrolls', () => {
  it('pin holds while scrollTop stays within 1 px (bottom-clamped jump to the last page)', () =>
    expect(pageAfterScroll({ page: 8, top: 1628 }, 1628.5, 7)).toEqual({ page: 8, pin: { page: 8, top: 1628 } }));

  it('a move of more than 1 px (user scroll, zoom re-anchor) drops the pin', () =>
    expect(pageAfterScroll({ page: 8, top: 1628 }, 1640, 7)).toEqual({ page: 7, pin: null }));

  it('no pin → the visible page', () =>
    expect(pageAfterScroll(null, 500, 4)).toEqual({ page: 4, pin: null }));
});
