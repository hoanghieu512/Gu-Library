// Keeps the Viewer's reading progress on disk. PdfView reports the page on every scroll frame,
// mostly the same one, so this saves each new page once, one save at a time, and only counts a page
// as saved when the save says so: a failed page is tried again on a later report.

/** How long a page whose save failed waits before another try (the kho may be hidden for a while). */
export const RETRY_GAP_MS = 2000;

/** `save` resolves true once the page is on disk. Returns what to call with each reported page. */
export function createProgressSaver(
  save: (page: number, total: number) => Promise<boolean>,
  now: () => number = Date.now,
): (page: number, total: number) => void {
  let saved = 0;
  let failed: { page: number; at: number } | null = null;
  let busy = false;
  let next: { page: number; total: number } | null = null;

  const run = async (page: number, total: number) => {
    busy = true;
    let ok = false;
    try { ok = await save(page, total); } catch { /* counts as failed */ }
    busy = false;
    if (ok) { saved = page; failed = null; } else failed = { page, at: now() };
    const pending = next;
    next = null;
    if (pending) onPage(pending.page, pending.total);
  };

  const onPage = (page: number, total: number) => {
    if (page === saved) return;
    if (busy) { next = { page, total }; return; }
    if (failed?.page === page && now() - failed.at < RETRY_GAP_MS) return;
    void run(page, total);
  };
  return onPage;
}
