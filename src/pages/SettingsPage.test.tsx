import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Saf } from '../plugins/saf';
import { fakeKho, ROOT, type FakeKho } from '../test/fakeSaf';
import { invalidateKho } from '../storage/khoSnapshot';
import { KHO_UNREADABLE_MESSAGE } from '../storage/khoHidden';
import SettingsPage from './SettingsPage';

const prefs = vi.hoisted(() => new Map<string, string>());
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: async ({ key }: { key: string }) => ({ value: prefs.get(key) ?? null }),
    set: async ({ key, value }: { key: string; value: string }) => { prefs.set(key, value); },
    remove: async ({ key }: { key: string }) => { prefs.delete(key); },
  },
}));
vi.mock('../plugins/saf', () => ({ Saf: {} }));
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
  Object.assign(Saf, kho.saf);
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
