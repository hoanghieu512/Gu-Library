import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { loadIndex, refreshIndex } from './store';
import type { SearchIndex } from './invertedIndex';

// The whole-kho index of the Search screen, loaded on `acquire()` and dropped on `release()`
// (spec 2026-10-21; `indexHold` decides when). The load is the one SearchPage ran on mount:
// a first build reads every sidecar, so it shows progress; later loads come back from IndexedDB in
// under a second, then refresh in the background so typing never waits.
//
// One load at a time, and never two indexes: each load carries the generation it started in, and
// `release()` moves the generation on, so a load or refresh that lands late sets nothing (the
// stored index is still written). An `acquire()` while a load runs queues behind it instead of
// running beside it. Build progress is the exception: it always shows, so coming back during a
// first build does not find the bar frozen.

export type Phase = 'loading' | 'building' | 'ready';

export function useSearchIndex(onNames: (names: Map<string, string>) => void): {
  ix: SearchIndex | null;
  phase: Phase;
  progress: { done: number; total: number };
  refreshing: boolean;
  acquire: () => void;
  release: () => void;
} {
  // Index để trong STATE chứ không phải ref: đọc ref lúc render là sai (không kích hoạt vẽ lại,
  // và React đồng thời có thể đọc bản cũ).
  const [ix, setIx] = useState<SearchIndex | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [refreshing, setRefreshing] = useState(false);
  const [, setFlushes] = useState(0);
  // Dấu vân tay của lượt dựng gần nhất: để làm mới đối chiếu mà khỏi đọc lại IndexedDB. Kept on
  // release; the next load takes the latest ones from IndexedDB anyway.
  const stamps = useRef<Map<string, string> | null>(null);
  const gen = useRef(0);
  const chain = useRef<Promise<void>>(Promise.resolve());
  const started = useRef(false);
  const names = useRef(onNames);
  useEffect(() => { names.current = onNames; });

  const run = useCallback(async (my: number) => {
    const live = () => my === gen.current;
    if (!live()) return;
    const cached = await loadIndex();
    if (!live()) return;
    if (cached) {
      setIx(cached.index);
      stamps.current = cached.stamps;
      setPhase('ready');
      // Làm mới NGẦM: kho có thể đã nhận file mới từ Atomman. Không chặn ô nhập.
      setRefreshing(true);
      try {
        const r = await refreshIndex(stamps.current ?? undefined);
        if (live()) names.current(r.names);
        if (live() && r.changed && r.index) { setIx(r.index); stamps.current = r.stamps ?? null; }
      } catch { /* giữ index cũ: tìm trên bản cũ vẫn hơn không tìm được */ }
      if (live()) setRefreshing(false);
    } else {
      // Chưa có gì: dựng lần đầu, hiện tiến độ vì nó lâu.
      setPhase('building');
      setProgress({ done: 0, total: 0 });   // a second build in the session ("Dựng lại") starts from zero
      try {
        const r = await refreshIndex(undefined, (p) => setProgress({ done: p.done, total: p.total }));
        if (!live()) return;
        names.current(r.names);
        if (r.index) { setIx(r.index); stamps.current = r.stamps ?? null; }
      } catch { /* để ready với index rỗng: hiện "chưa tra được", không treo màn */ }
      if (live()) { setPhase('ready'); setRefreshing(false); }
    }
  }, []);

  const acquire = useCallback(() => {
    const my = ++gen.current;
    // Coming back after a release: keep what is on screen and say the index is being updated.
    if (started.current) setRefreshing(true);
    started.current = true;
    chain.current = chain.current.then(() => run(my)).catch(() => { /* never break the queue */ });
  }, [run]);

  // Two synchronous commits, not one: React keeps the previous state on the fiber's alternate until
  // the component renders again, and nothing renders a Search page left behind the Viewer or in the
  // background, so after a single render the old index stayed reachable (review 21/10, measured with
  // React production builds). flushSync also commits inside the `pause` handler itself, before the
  // WebView is backgrounded. Callers: a timer, Capacitor `pause`, a window event; never render or
  // an effect.
  const release = useCallback(() => {
    gen.current++;
    flushSync(() => setIx(null));
    flushSync(() => setFlushes((n) => n + 1));
  }, []);

  return { ix, phase, progress, refreshing, acquire, release };
}
