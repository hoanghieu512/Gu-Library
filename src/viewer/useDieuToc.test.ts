import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { loadToc } from './loadToc';
import { useDieuToc } from './useDieuToc';
import type { TocEntry } from './dieuToc';

vi.mock('./loadToc', () => ({ loadToc: vi.fn() }));

const entry = (label: string): TocEntry => ({ i: 0, num: label.slice(5), label, title: '', chapter: '', page: 1 });
const entryA = entry('Điều 1');
const entryB = entry('Điều 2');

// One pending load per uri, resolved by the test.
let pending: Map<string, (v: TocEntry[] | null) => void>;
beforeEach(() => {
  pending = new Map();
  vi.mocked(loadToc).mockReset();
  vi.mocked(loadToc).mockImplementation((uri) => new Promise((res) => { pending.set(uri, res); }));
});

describe('useDieuToc', () => {
  it('does not load without a document', () => {
    const { result } = renderHook(() => useDieuToc(null));
    expect(loadToc).not.toHaveBeenCalled();
    expect(result.current).toBeNull();
  });

  it('returns the table once loaded', async () => {
    const { result } = renderHook(() => useDieuToc('a'));
    expect(result.current).toBeNull();
    await act(async () => { pending.get('a')!([entryA]); });
    await waitFor(() => expect(result.current).toEqual([entryA]));
  });

  it('never returns the table of a previous document', async () => {
    const { result, rerender } = renderHook(({ uri }) => useDieuToc(uri), { initialProps: { uri: 'a' } });
    rerender({ uri: 'b' });
    await act(async () => { pending.get('a')!([entryA]); });
    expect(result.current).toBeNull();
    await act(async () => { pending.get('b')!([entryB]); });
    await waitFor(() => expect(result.current).toEqual([entryB]));
  });

  it('does not show the previous table while the next one loads', async () => {
    const { result, rerender } = renderHook(({ uri }) => useDieuToc(uri), { initialProps: { uri: 'a' } });
    await act(async () => { pending.get('a')!([entryA]); });
    await waitFor(() => expect(result.current).toEqual([entryA]));
    rerender({ uri: 'b' });
    expect(result.current).toBeNull();
  });

  it('drops the table at once when the document goes away', async () => {
    const { result, rerender } = renderHook(({ uri }: { uri: string | null }) => useDieuToc(uri), {
      initialProps: { uri: 'a' as string | null },
    });
    await act(async () => { pending.get('a')!([entryA]); });
    await waitFor(() => expect(result.current).toEqual([entryA]));
    rerender({ uri: null });
    expect(result.current).toBeNull();
  });
});
