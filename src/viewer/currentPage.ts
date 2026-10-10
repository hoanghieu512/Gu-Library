// Which page the Viewer is "on" — what the footer shows and what resume saves (v1.41.1).
//
// Before: the page under the viewport's CENTRE, while every jump (resume, "Tới trang", a sheet row)
// puts the target page's TOP at the viewport top. A page shorter than half the viewport (a slide
// deck) then put the centre on the next page: resume saved p+1, the next resume scrolled to p+1 and
// saved p+2 — one page of drift per leave/reopen (UBS1, 08/10: 3 → 4 → 5 → 6).

/**
 * The page taking the most of the screen (visible CSS px of its slot); ties → the upper page.
 * `offsets` is PdfView's: offsets[0] = 0, offsets[n] = top of page n+1. With equal page heights this
 * is the page under the centre, so reading a portrait document feels as before; it differs only
 * when two or more pages are fully visible, where the upper one wins — the page a jump just put at
 * the top.
 */
export function mostVisiblePage(offsets: number[], numPages: number, top: number, vh: number): number {
  const bottom = top + vh;
  let best = 1, bestVis = 0;
  for (let n = 1; n <= numPages && offsets[n - 1] < bottom; n++) {
    const vis = Math.min(offsets[n], bottom) - Math.max(offsets[n - 1], top);
    if (vis > bestVis) { best = n; bestVis = vis; }
  }
  return best;
}

/**
 * A jump (resume, "Tới trang", a sheet row) holds its page until the USER moves the page — a drag
 * or a zoom. Not until scrollTop moves: the scroll also moves on its own, and the first 1.41.1 build
 * lost the page that way — typing in "Tới trang" leaves the keyboard up, the jump lands in the
 * shorter viewport, the keyboard closes, the browser clamps the scroll at the end of the document,
 * and the last page read as the one before it (UBS1: jump to 8 → 7 / 8). Near the end the target
 * cannot reach the top either, so the most visible page may be an earlier one; the hold covers both.
 */
export function pageHold() {
  let held: number | null = null;
  return {
    /** A jump scrolled to `page`. */
    jump(page: number): void { held = page; },
    /** The user dragged or zoomed: the page is whatever the screen now shows. */
    release(): void { held = null; },
    /** The current page, given the most visible one. */
    current(visible: number): number { return held ?? visible; },
  };
}
