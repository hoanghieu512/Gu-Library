import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { Preferences } from '@capacitor/preferences';
import WhatsNewNotice from './WhatsNewNotice';
import { RELEASE_NOTES } from '../whatsNew/notes';
import OpeningDoors from '../opening/OpeningDoors';
import { finishOpening, resetOpeningForTest } from '../opening/homeReady';

vi.mock('@capacitor/preferences', () => ({ Preferences: { get: vi.fn(), set: vi.fn() } }));
// Only the 'switch off' test renders the doors: they read their switch as off and finish at once.
vi.mock('../opening/openingPref', () => ({ getOpeningEnabled: async () => false }));
// IonModal does not run in jsdom. The stand-in behaves like it where it matters: it stays mounted
// when closed (data-open), shows the header "Đóng" and children only while open, and calls onClose
// again when it goes from open to closed — Ionic's onDidDismiss after a dismiss.
vi.mock('./GuSheet', async () => {
  const { useEffect, useRef } = await vi.importActual<typeof import('react')>('react');
  return {
    default: function Sheet({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: ReactNode }) {
      const was = useRef(isOpen);
      useEffect(() => { if (was.current && !isOpen) onClose(); was.current = isOpen; }, [isOpen, onClose]);
      return (
        <div data-testid="sheet" data-open={String(isOpen)}>
          {isOpen && <><button type="button" onClick={onClose}>Đóng</button>{children}</>}
        </div>
      );
    },
  };
});

const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const heading = (v: string) => new RegExp(`^Phiên bản ${v.replace(/\./g, '\\.')} · `);
// By position, not by number, so the tests hold on every release: [0] is the running version (notes.test).
const V = RELEASE_NOTES.map((n) => n.version);

beforeEach(() => {
  // The opening doors are already gone unless a test says otherwise.
  resetOpeningForTest();
  finishOpening();
  vi.mocked(Preferences.get).mockReset();
  vi.mocked(Preferences.set).mockReset().mockResolvedValue();
});

describe('WhatsNewNotice — once after an update (v1.42.0)', () => {
  it('skipped versions show, newest first; "Đã hiểu" records the running version and closes', async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: V[3] });
    render(<WhatsNewNotice />);
    expect(await screen.findByText(heading(V[0]))).toBeInTheDocument();
    expect(screen.getByText(heading(V[1]))).toBeInTheDocument();
    expect(screen.getByText(heading(V[2]))).toBeInTheDocument();
    expect(screen.queryByText(heading(V[3]))).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Đã hiểu' }));
    await waitFor(() => expect(Preferences.set).toHaveBeenCalledWith({ key: 'whats_new_seen', value: __APP_VERSION__ }));
    expect(screen.queryByText(heading(V[0]))).toBeNull();
  });

  it('closing keeps the sheet mounted so Ionic can dismiss it, and records seen exactly once', async () => {
    // Unmounting an open IonModal skips its dismiss: aria-hidden stayed on the router outlet and
    // Home vanished from the accessibility tree (UBS1, 11/10 — review Critical #1).
    vi.mocked(Preferences.get).mockResolvedValue({ value: V[1] });
    render(<WhatsNewNotice />);
    await screen.findByText(heading(V[0]));
    fireEvent.click(screen.getByRole('button', { name: 'Đã hiểu' }));
    await waitFor(() => expect(screen.getByTestId('sheet')).toHaveAttribute('data-open', 'false'));
    await settle();
    expect(Preferences.set).toHaveBeenCalledTimes(1);
  });

  it('closing it another way ("Đóng") also counts as seen', async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: V[1] });
    render(<WhatsNewNotice />);
    await screen.findByText(heading(V[0]));
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    await waitFor(() => expect(Preferences.set).toHaveBeenCalledWith({ key: 'whats_new_seen', value: __APP_VERSION__ }));
  });

  it('already seen the running version → nothing', async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: __APP_VERSION__ });
    render(<WhatsNewNotice />);
    await settle();
    expect(screen.queryByText(/^Phiên bản/)).toBeNull();
  });

  it('never seen anything → only the running version', async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: null });
    render(<WhatsNewNotice />);
    expect(await screen.findByText(heading(V[0]))).toBeInTheDocument();
    expect(screen.queryByText(heading(V[1]))).toBeNull();
  });

  it('storage cannot be read → nothing, no error', async () => {
    vi.mocked(Preferences.get).mockRejectedValue(new Error('storage'));
    render(<WhatsNewNotice />);
    await settle();
    expect(screen.queryByText(/^Phiên bản/)).toBeNull();
  });
});

describe('WhatsNewNotice: after the opening doors', () => {
  it('waits for the doors before opening', async () => {
    resetOpeningForTest();
    vi.mocked(Preferences.get).mockResolvedValue({ value: V[1] });
    render(<WhatsNewNotice />);
    await settle();
    expect(screen.queryByText(heading(V[0]))).toBeNull();
    act(() => finishOpening());
    expect(await screen.findByText(heading(V[0]))).toBeInTheDocument();
  });

  it('switch off: the sheet still shows, at once', async () => {
    resetOpeningForTest();
    vi.mocked(Preferences.get).mockResolvedValue({ value: V[1] });
    render(<><OpeningDoors /><WhatsNewNotice /></>);
    expect(await screen.findByText(heading(V[0]))).toBeInTheDocument();
  });
});
