import { useEffect, useState } from 'react';
import { loadToc } from './loadToc';
import type { TocEntry } from './dieuToc';

/**
 * The Điều table of one document, loaded when `docUri` is given (the Viewer passes it once the
 * pane has painted its first page, so the sidecar never competes with opening the PDF).
 * The result is tied to the uri it was loaded for: after a swap the old table is never returned,
 * even if its load lands late. `null` while not asked, loading, or unreadable.
 */
export function useDieuToc(docUri: string | null): TocEntry[] | null {
  const [state, setState] = useState<{ uri: string; toc: TocEntry[] | null } | null>(null);
  useEffect(() => {
    if (!docUri) return;
    let alive = true;
    loadToc(docUri).then((toc) => { if (alive) setState({ uri: docUri, toc }); });
    return () => { alive = false; };
  }, [docUri]);
  return state && state.uri === docUri ? state.toc : null;
}
