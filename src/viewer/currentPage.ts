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

/** The page a jump went to, and the scrollTop it really landed on (read back after setting it). */
export interface Pin { page: number; top: number }

/**
 * A jump holds its page while scrollTop stays where the jump left it: near the end of a document
 * the browser clamps the scroll, so the target cannot reach the top and the most visible page may
 * be an earlier one. Any move of more than 1 px — the user scrolling, a zoom re-anchor — drops it.
 */
export function pageAfterScroll(pin: Pin | null, scrollTop: number, visible: number): { page: number; pin: Pin | null } {
  if (pin && Math.abs(scrollTop - pin.top) <= 1) return { page: pin.page, pin };
  return { page: visible, pin: null };
}
