import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { loadIndex, refreshIndex } from './store';
import type { RefreshProgress } from './store';
import { indexDoc, mergeShards } from './invertedIndex';
import { useSearchIndex } from './useSearchIndex';

vi.mock('./store', () => ({ loadIndex: vi.fn(), refreshIndex: vi.fn() }));

type Load = Awaited<ReturnType<typeof loadIndex>>;
type Refresh = Awaited<ReturnType<typeof refreshIndex>>;
interface Pending<T> { resolve: (v: T) => void; reject: (e: unknown) => void }

const DOC = { pdfUri: 'u:a.pdf', name: 'Luật Đất đai', mon: 'Đất Đai' };
const index = mergeShards([indexDoc(DOC, { units: [{ label: 'Điều 5', page: 3, text: 'Người sử dụng đất.' }] })]);
const cached: NonNullable<Load> = { index, builtAt: 1, stamps: new Map([['u:a.json', '1:1']]) };
const unchanged: Refresh = { changed: false, names: new Map([['u:a.pdf', 'Luật đất đai 2024']]), read: 0, reused: 1, total: 1, ms: 0 };

// Every store call waits until the test settles it.
let loads: Pending<Load>[];
let refreshes: Pending<Refresh>[];
beforeEach(() => {
  loads = [];
  refreshes = [];
  vi.mocked(loadIndex).mockReset().mockImplementation(() => new Promise((resolve, reject) => { loads.push({ resolve, reject }); }));
  vi.mocked(refreshIndex).mockReset().mockImplementation(() => new Promise((resolve, reject) => { refreshes.push({ resolve, reject }); }));
});

const tick = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

/** A hook that has loaded `cached` and finished its background refresh. */
async function loaded(onNames = vi.fn()) {
  const hook = renderHook(() => useSearchIndex(onNames));
  act(() => hook.result.current.acquire());
  await waitFor(() => expect(loads).toHaveLength(1));
  await act(async () => { loads[0].resolve(cached); });
  await waitFor(() => expect(refreshes).toHaveLength(1));
  await act(async () => { refreshes[0].resolve(unchanged); });
  await waitFor(() => expect(hook.result.current.refreshing).toBe(false));
  return hook;
}

describe('useSearchIndex', () => {
  it('first load: loading, then ready with the index', async () => {
    const onNames = vi.fn();
    const { result } = renderHook(() => useSearchIndex(onNames));
    act(() => result.current.acquire());
    expect(result.current.phase).toBe('loading');
    await waitFor(() => expect(loads).toHaveLength(1));
    await act(async () => { loads[0].resolve(cached); });
    await waitFor(() => expect(result.current.ix).toBe(index));
    expect(result.current.phase).toBe('ready');
    expect(result.current.refreshing).toBe(true);
    await waitFor(() => expect(refreshIndex).toHaveBeenCalledWith(cached.stamps));
    await act(async () => { refreshes[0].resolve(unchanged); });
    await waitFor(() => expect(result.current.refreshing).toBe(false));
    expect(onNames).toHaveBeenCalledWith(unchanged.names);
  });

  it('release drops the index', async () => {
    const { result } = await loaded();
    act(() => result.current.release());
    expect(result.current.ix).toBeNull();
  });

  it('a load that lands after release is not attached', async () => {
    const { result } = renderHook(() => useSearchIndex(vi.fn()));
    act(() => result.current.acquire());
    await waitFor(() => expect(loads).toHaveLength(1));
    act(() => result.current.release());
    await act(async () => { loads[0].resolve(cached); });
    await tick();
    expect(result.current.ix).toBeNull();
    expect(refreshIndex).not.toHaveBeenCalled();
  });

  it('a refresh that lands after release is not attached', async () => {
    const onNames = vi.fn();
    const { result } = renderHook(() => useSearchIndex(onNames));
    act(() => result.current.acquire());
    await waitFor(() => expect(loads).toHaveLength(1));
    await act(async () => { loads[0].resolve(cached); });
    await waitFor(() => expect(refreshes).toHaveLength(1));
    act(() => result.current.release());
    await act(async () => { refreshes[0].resolve({ ...unchanged, changed: true, index: mergeShards([]), stamps: new Map() }); });
    await tick();
    expect(result.current.ix).toBeNull();
    expect(onNames).not.toHaveBeenCalled();
  });

  it('acquire while a load runs waits for it', async () => {
    const { result } = renderHook(() => useSearchIndex(vi.fn()));
    act(() => result.current.acquire());
    await waitFor(() => expect(loads).toHaveLength(1));
    act(() => result.current.release());
    act(() => result.current.acquire());
    await tick();
    expect(loadIndex).toHaveBeenCalledTimes(1);
    await act(async () => { loads[0].resolve(cached); });
    await waitFor(() => expect(loadIndex).toHaveBeenCalledTimes(2));
    await act(async () => { loads[1].resolve(cached); });
    await waitFor(() => expect(refreshes).toHaveLength(1));
    await act(async () => { refreshes[0].resolve(unchanged); });
    await waitFor(() => expect(result.current.ix).toBe(index));
  });

  it('a later load shows refreshing, not loading', async () => {
    const { result } = await loaded();
    act(() => result.current.release());
    act(() => result.current.acquire());
    expect(result.current.phase).toBe('ready');
    expect(result.current.refreshing).toBe(true);
    expect(result.current.ix).toBeNull();
  });

  it('an empty store builds with progress', async () => {
    const { result } = renderHook(() => useSearchIndex(vi.fn()));
    act(() => result.current.acquire());
    await waitFor(() => expect(loads).toHaveLength(1));
    await act(async () => { loads[0].resolve(null); });
    await waitFor(() => expect(result.current.phase).toBe('building'));
    expect(refreshIndex).toHaveBeenCalledWith(undefined, expect.any(Function));
    const onProgress = vi.mocked(refreshIndex).mock.calls[0][1] as (p: RefreshProgress) => void;
    act(() => onProgress({ done: 1, total: 2, reused: 0 }));
    expect(result.current.progress).toEqual({ done: 1, total: 2 });
    await act(async () => { refreshes[0].resolve({ ...unchanged, changed: true, index, stamps: new Map() }); });
    await waitFor(() => expect(result.current.ix).toBe(index));
    expect(result.current.phase).toBe('ready');
  });

  it('a build released midway keeps its progress, then the next load reads the store', async () => {
    const { result } = renderHook(() => useSearchIndex(vi.fn()));
    act(() => result.current.acquire());
    await waitFor(() => expect(loads).toHaveLength(1));
    await act(async () => { loads[0].resolve(null); });
    await waitFor(() => expect(refreshes).toHaveLength(1));
    act(() => result.current.release());
    act(() => result.current.acquire());
    const onProgress = vi.mocked(refreshIndex).mock.calls[0][1] as (p: RefreshProgress) => void;
    act(() => onProgress({ done: 2, total: 2, reused: 0 }));
    expect(result.current.progress).toEqual({ done: 2, total: 2 });
    await act(async () => { refreshes[0].resolve({ ...unchanged, changed: true, index: mergeShards([]), stamps: new Map() }); });
    await waitFor(() => expect(loadIndex).toHaveBeenCalledTimes(2));
    expect(result.current.ix).toBeNull();
    await act(async () => { loads[1].resolve(cached); });
    await waitFor(() => expect(result.current.ix).toBe(index));
    expect(result.current.phase).toBe('ready');
  });

  it('a failed refresh keeps the index', async () => {
    const { result } = renderHook(() => useSearchIndex(vi.fn()));
    act(() => result.current.acquire());
    await waitFor(() => expect(loads).toHaveLength(1));
    await act(async () => { loads[0].resolve(cached); });
    await waitFor(() => expect(refreshes).toHaveLength(1));
    await act(async () => { refreshes[0].reject(new Error('kho hidden')); });
    await waitFor(() => expect(result.current.refreshing).toBe(false));
    expect(result.current.ix).toBe(index);
  });

  // React keeps the previous state on the fiber's alternate until the component renders again; one
  // render after release would leave the old index reachable while Search sits unseen (review 21/10).
  it('release renders twice so React lets go of the old index', async () => {
    let renders = 0;
    const onNames = vi.fn();
    const { result } = renderHook(() => { renders++; return useSearchIndex(onNames); });
    act(() => result.current.acquire());
    await waitFor(() => expect(loads).toHaveLength(1));
    await act(async () => { loads[0].resolve(cached); });
    await waitFor(() => expect(refreshes).toHaveLength(1));
    await act(async () => { refreshes[0].resolve(unchanged); });
    await waitFor(() => expect(result.current.refreshing).toBe(false));
    const before = renders;
    act(() => result.current.release());
    expect(result.current.ix).toBeNull();
    expect(renders - before).toBeGreaterThanOrEqual(2);
  });

  it('a later build starts its progress from zero', async () => {
    const { result } = renderHook(() => useSearchIndex(vi.fn()));
    act(() => result.current.acquire());
    await waitFor(() => expect(loads).toHaveLength(1));
    await act(async () => { loads[0].resolve(null); });
    await waitFor(() => expect(refreshes).toHaveLength(1));
    const onProgress = vi.mocked(refreshIndex).mock.calls[0][1] as (p: RefreshProgress) => void;
    act(() => onProgress({ done: 2, total: 2, reused: 0 }));
    await act(async () => { refreshes[0].resolve({ ...unchanged, changed: true, index, stamps: new Map() }); });
    await waitFor(() => expect(result.current.ix).toBe(index));
    act(() => result.current.release());
    act(() => result.current.acquire());
    await waitFor(() => expect(loads).toHaveLength(2));
    await act(async () => { loads[1].resolve(null); });
    await waitFor(() => expect(result.current.phase).toBe('building'));
    expect(result.current.progress).toEqual({ done: 0, total: 0 });
  });

  it('acquire and release keep their identity', async () => {
    const { result, rerender } = renderHook(() => useSearchIndex(vi.fn()));
    const { acquire, release } = result.current;
    rerender();
    expect(result.current.acquire).toBe(acquire);
    expect(result.current.release).toBe(release);
  });
});
