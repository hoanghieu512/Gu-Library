import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { getKhoSnapshot } from '../storage/khoSnapshot';
import type { KhoFolder, KhoSnapshot } from '../storage/khoSnapshot';
import type { Document } from '../storage/types';
import { emitKhoChanged } from '../lib/khoEvents';
import { useDisplayNames } from './useDisplayNames';

vi.mock('../storage/khoSnapshot', () => ({ getKhoSnapshot: vi.fn() }));

const doc: Document = { name: 'a', fileBase: 'a', pdfUri: 'u:a.pdf', jsonUri: 'u:a.json', printFlagged: false };
const snapWith = (names: [string, string][]): KhoSnapshot => {
  const f: KhoFolder = {
    name: 'Đất Đai', uri: 'u:mon', entries: [], children: [], displayNames: new Map(names),
    listing: { documents: [doc], folders: [], pending: [], hasPending: false },
  };
  return {
    root: 'u:root', rootEntries: [], byUri: new Map(), inboxEntries: [],
    mons: [{ name: 'Đất Đai', uri: 'u:mon', meta: {} }], monFolders: new Map([['u:mon', f]]),
  } as KhoSnapshot;
};

describe('useDisplayNames — Search cards follow a rename made while the tab is open (v1.41.1)', () => {
  it('a kho change (rename) rebuilds the names from the fresh snapshot', async () => {
    const { result } = renderHook(() => useDisplayNames());
    expect(result.current[0].size).toBe(0);
    vi.mocked(getKhoSnapshot).mockResolvedValue(snapWith([['a', 'BLDS 2015']]));
    act(() => emitKhoChanged());
    await waitFor(() => expect(result.current[0].get('u:a.pdf')).toBe('BLDS 2015'));
  });

  it('the setter still takes the map a refresh returns', () => {
    const { result } = renderHook(() => useDisplayNames());
    act(() => result.current[1](new Map([['u:a.pdf', 'Luật Đất đai 2024']])));
    expect(result.current[0].get('u:a.pdf')).toBe('Luật Đất đai 2024');
  });
});
