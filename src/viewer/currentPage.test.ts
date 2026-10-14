import { describe, it, expect } from 'vitest';
import { mostVisiblePage, pageHold, pageInView } from './currentPage';

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

describe('pageInView — the end of the document reads as the last page (v1.42.1)', () => {
  // Slide deck on UBS1: 8 slots of 276 px, 580 px viewport → the scroll ends at 2208 − 580 = 1628.
  const deck = offs(Array(8).fill(276)); const vh = 580; const maxTop = 8 * 276 - vh;

  it('scrolled to the end: 7 and 8 fully visible → 8 (the most visible page alone says 7)', () => {
    expect(mostVisiblePage(deck, 8, maxTop, vh)).toBe(7);
    expect(pageInView(deck, 8, maxTop, vh, maxTop)).toBe(8);
  });

  it('a fraction of a pixel short of the end still counts as the end', () =>
    expect(pageInView(deck, 8, maxTop - 0.6, vh, maxTop)).toBe(8));

  it('not at the end → the most visible page', () =>
    expect(pageInView(deck, 8, maxTop - 100, vh, maxTop)).toBe(mostVisiblePage(deck, 8, maxTop - 100, vh)));

  it('a document that fits the screen cannot scroll → page 1, not "read to the end" on opening', () =>
    expect(pageInView(offs([276, 276]), 2, 0, vh, 0)).toBe(1));

  it('portrait pages: the end was already the last page → unchanged', () => {
    const o = offs([1000, 1000, 1000]);
    expect(pageInView(o, 3, 3000 - vh, vh, 3000 - vh)).toBe(3);
  });
});

describe('pageHold — a jump holds its page until the user drags (v1.41.1)', () => {
  it('a jump to 7 near the end: the scroll stops at the end, where the page in view reads 8 → still 7', () => {
    const h = pageHold();
    h.jump(7);
    expect(h.current(8)).toBe(7);
  });

  it('reopening on a short page: the jump puts it at the top, the next page is the more visible one → still the jumped page', () => {
    // A landscape page 3 (250 px) between portrait pages: at the top of the screen, page 4 fills more of it.
    const o = offs([800, 800, 250, 800]);
    expect(mostVisiblePage(o, 4, 1600, 580)).toBe(4);
    const h = pageHold();
    h.jump(3);
    expect(h.current(mostVisiblePage(o, 4, 1600, 580))).toBe(3);
  });

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
