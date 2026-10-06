// Holds a page jump that arrives before the PDF is laid out (page count + page sizes measured).
//
// Since v1.41.0 "Xem cả N đoạn" opens a document with its search sheet already showing hits, so a
// row can be tapped while a 400-page PDF is still loading. Scrolling then does nothing, and the
// resume-to-last-page step that runs once layout is ready used to overwrite it (seen on UBS1:
// tapped "trang 69", landed on 337). The gate keeps the latest early request and hands it to
// that resume step instead of the remembered page.

export interface JumpGate {
  /** Page to scroll to now, or null when it was kept for `open`. */
  request(page: number): number | null;
  /** Layout is ready: returns the kept request, else `resumePage`. Later requests pass through. */
  open(resumePage: number): number;
}

export function jumpGate(): JumpGate {
  let ready = false;
  let pending: number | null = null;
  return {
    request(page) {
      if (ready) return page;
      pending = page;
      return null;
    },
    open(resumePage) {
      ready = true;
      const p = pending ?? resumePage;
      pending = null;
      return p;
    },
  };
}
