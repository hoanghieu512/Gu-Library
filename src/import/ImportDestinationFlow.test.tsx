import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { SafNative } from '../plugins/safNative';
import { fakeKho, ROOT, type FakeKho } from '../test/fakeSaf';
import ImportDestinationFlow from './ImportDestinationFlow';
import { prefs } from '../test/fakePreferences';

vi.mock('@capacitor/preferences', () => import('../test/fakePreferences'));
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

function importFiles(...names: string[]) {
  render(
    <MemoryRouter>
      <ImportDestinationFlow batch={names.map((name) => ({ uri: `content://share/${name}`, name }))} onClear={() => {}} />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByText('Lưu vào Logic'));
}
const importOneFile = () => importFiles('a.pdf');

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

  // Review of 18/10: after a restart Gú would share the whole batch again, and the files already
  // in would come back as "[Môn] x (1).pdf".
  it('says how many files went in before it stopped, and which to share again', async () => {
    const copy = SafNative.copyToDir!;
    let n = 0;
    SafNative.copyToDir = async (o) => {
      if (++n === 2) throw Object.assign(new Error('hidden'), { code: 'KHO_HIDDEN' });
      return copy(o);
    };
    importFiles('a.pdf', 'b.pdf', 'c.pdf');
    expect(await screen.findByText(/Khởi động lại máy/)).toBeInTheDocument();
    expect(screen.getByText(/Đã nhập 1\/3 file trước khi dừng/)).toBeInTheDocument();
    expect(screen.getByText(/b\.pdf, c\.pdf/)).toBeInTheDocument();
  });

  it('names no file when nothing went in', async () => {
    kho.state.hideAll = true;
    kho.state.rejectHidden = true;
    importFiles('a.pdf', 'b.pdf');
    expect(await screen.findByText(/Khởi động lại máy/)).toBeInTheDocument();
    expect(screen.queryByText(/trước khi dừng/)).not.toBeInTheDocument();
  });
});
