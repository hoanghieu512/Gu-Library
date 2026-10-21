import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SafNative } from '../plugins/safNative';
import { fakeKho, ROOT, type FakeKho } from '../test/fakeSaf';
import { invalidateKho } from '../storage/khoSnapshot';
import { KHO_UNREADABLE_MESSAGE } from '../plugins/khoUnreadable';
import SettingsPage from './SettingsPage';
import { prefs } from '../test/fakePreferences';

vi.mock('@capacitor/preferences', () => import('../test/fakePreferences'));
vi.mock('../plugins/safNative', () => ({ SafNative: {} }));
vi.mock('../sync/useSyncStatus', () => ({ useSyncStatus: () => ({ light: 'unconfigured', refresh: () => {} }) }));
vi.mock('../sync/SyncSettings', () => ({ default: () => null }));
// The toast is how the row reports back, so tests wait on it instead of on a timer.
const toast = vi.hoisted(() => ({ result: vi.fn() }));
vi.mock('../lib/useGuToast', () => ({
  useGuToast: () => ({ toastResult: toast.result, toastLoading: () => {}, node: null }),
}));

let kho: FakeKho;
const open = vi.fn(() => { throw new Error('no IndexedDB in this test'); });
beforeEach(() => {
  prefs.clear();
  prefs.set('saf_root_uri', ROOT);
  kho = fakeKho();
  Object.assign(SafNative, kho.saf);
  kho.mkdir('Logic');
  kho.mkdir('_inbox');
  invalidateKho();
  open.mockClear();
  toast.result.mockClear();
  vi.stubGlobal('indexedDB', { open });
});
afterEach(() => { vi.unstubAllGlobals(); });

describe('SettingsPage: "Dựng lại chỉ mục tìm kiếm"', () => {
  it('clears the index of a kho that lists', async () => {
    render(<SettingsPage />);
    fireEvent.click(screen.getByText('Dựng lại chỉ mục tìm kiếm'));
    await waitFor(() => expect(toast.result).toHaveBeenCalledWith(expect.stringContaining('Đã xoá chỉ mục'), true));
    expect(open).toHaveBeenCalled();
  });

  // Review of 18/10: the check walked the whole kho (every folder, every .display.json), and the
  // next visit to Tìm walked it again; one root listing answers whether Android hides it.
  it('checks the kho with one root listing, not a walk', async () => {
    kho.mkdir('Logic/Slide');
    kho.put('Logic/bai1.pdf');
    kho.put('Logic/bai1.display.json', '{"name":"Bài một"}');
    render(<SettingsPage />);
    const list = vi.spyOn(SafNative, 'listFolder');
    const read = vi.spyOn(SafNative, 'readFile');
    fireEvent.click(screen.getByText('Dựng lại chỉ mục tìm kiếm'));
    await waitFor(() => expect(toast.result).toHaveBeenCalledWith(expect.stringContaining('Đã xoá chỉ mục'), true));
    expect(list.mock.calls.map(([o]) => o.uri)).toEqual([ROOT]);
    expect(read).not.toHaveBeenCalled();
  });

  // A hidden kho reads as empty: clearing the index then leaves nothing to rebuild it from.
  it('keeps the index while Android will not list the kho', async () => {
    kho.state.hideAll = true;
    kho.state.rejectHidden = true;
    render(<SettingsPage />);
    fireEvent.click(screen.getByText('Dựng lại chỉ mục tìm kiếm'));
    await waitFor(() => expect(toast.result).toHaveBeenCalledWith(KHO_UNREADABLE_MESSAGE, false));
    expect(open).not.toHaveBeenCalled();
  });
});
