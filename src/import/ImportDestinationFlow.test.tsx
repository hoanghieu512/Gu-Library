import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { SafNative } from '../plugins/safNative';
import { fakeKho, ROOT, type FakeKho } from '../test/fakeSaf';
import ImportDestinationFlow from './ImportDestinationFlow';

const prefs = vi.hoisted(() => new Map<string, string>());
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: async ({ key }: { key: string }) => ({ value: prefs.get(key) ?? null }),
    set: async ({ key, value }: { key: string; value: string }) => { prefs.set(key, value); },
    remove: async ({ key }: { key: string }) => { prefs.delete(key); },
  },
}));
vi.mock('../plugins/safNative', () => ({ SafNative: {} }));
// IonModal does not run in jsdom: show its children while open.
vi.mock('@ionic/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@ionic/react')>()),
  IonModal: ({ isOpen, children }: { isOpen: boolean; children: ReactNode }) => (isOpen ? <div>{children}</div> : null),
}));
// The destination sheet is not under test: one button picks "Logic".
vi.mock('./ChooseMonSheet', () => ({
  default: ({ isOpen, onPick }: { isOpen: boolean; onPick: (path: string[]) => void }) =>
    (isOpen ? <button type="button" onClick={() => onPick(['Logic'])}>Lưu vào Logic</button> : null),
}));

let kho: FakeKho;
beforeEach(() => {
  prefs.clear();
  prefs.set('saf_root_uri', ROOT);
  kho = fakeKho();
  Object.assign(SafNative, kho.saf);
  kho.mkdir('Logic');
  kho.mkdir('_inbox');
});

function importOneFile() {
  render(
    <MemoryRouter>
      <ImportDestinationFlow batch={[{ uri: 'content://share/a.pdf', name: 'a.pdf' }]} onClear={() => {}} />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByText('Lưu vào Logic'));
}

describe('ImportDestinationFlow: a kho Android will not list', () => {
  it('ends on how many files went in', async () => {
    importOneFile();
    expect(await screen.findByText('Đã nhập 1/1 file')).toBeInTheDocument();
  });

  // dGen1, 2026-10-17: shared files went into "_inbox (1)", which the worker never reads.
  it('ends on "restart the phone" instead of hanging on "Đang nhập…"', async () => {
    kho.state.hideAll = true;
    kho.state.rejectHidden = true;
    importOneFile();
    expect(await screen.findByText(/Khởi động lại máy/)).toBeInTheDocument();
    expect(screen.queryByText(/Đang nhập/)).not.toBeInTheDocument();
  });
});
