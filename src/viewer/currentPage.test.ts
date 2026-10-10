import { describe, it, expect } from 'vitest';
import { mostVisiblePage, pageHold } from './currentPage';

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

describe('pageHold — a jump holds its page until the user drags (v1.41.1)', () => {
  it('no jump → the most visible page', () =>
    expect(pageHold().current(4)).toBe(4));

  it('a jump holds its page whatever the scroll does on its own (keyboard closing clamps the scroll at the end)', () => {
    const h = pageHold();
    h.jump(8);
    expect(h.current(7)).toBe(8);   // bottom of a slide deck: 7 and 8 fully visible, 7 is "most visible"
    expect(h.current(7)).toBe(8);   // still 8 after another scroll event the user did not cause
  });

  it('the user dragging (or a zoom re-anchor) releases it', () => {
    const h = pageHold();
    h.jump(8);
    h.release();
    expect(h.current(7)).toBe(7);
  });

  it('a new jump replaces the old one', () => {
    const h = pageHold();
    h.jump(8); h.jump(3);
    expect(h.current(4)).toBe(3);
  });
});
