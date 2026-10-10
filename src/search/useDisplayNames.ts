import { useEffect, useState } from 'react';
import { onKhoChanged } from '../lib/khoEvents';
import { getKhoSnapshot } from '../storage/khoSnapshot';
import { displayNameMap } from './store';

/**
 * Renamed documents (pdfUri → name) for the Search cards. The Search tab stays mounted and only
 * refreshes its index on mount, so a rename made later in the same session would never reach the
 * cards while Home and the Viewer already show it. A rename emits khoChanged (and khoSnapshot drops
 * its cache on that event, registered at import — before this listener), so rebuild from the fresh
 * snapshot then. The setter still takes the map every refreshIndex returns.
 */
export function useDisplayNames(): [Map<string, string>, (names: Map<string, string>) => void] {
  const [names, setNames] = useState<Map<string, string>>(() => new Map());
  useEffect(() => {
    let alive = true;
    const off = onKhoChanged(() => {
      getKhoSnapshot()
        .then((s) => { if (alive) setNames(displayNameMap(s)); })
        .catch(() => { /* keep the names we have — a stale name beats none */ });
    });
    return () => { alive = false; off(); };
  }, []);
  return [names, setNames];
}
