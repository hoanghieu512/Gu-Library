import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { Preferences } from '@capacitor/preferences';
import WhatsNewNotice from './WhatsNewNotice';

vi.mock('@capacitor/preferences', () => ({ Preferences: { get: vi.fn(), set: vi.fn() } }));
// IonModal does not run in jsdom; the shell shows children when open and has the header "Đóng".
vi.mock('./GuSheet', () => ({
  default: ({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: ReactNode }) =>
    (isOpen ? <div><button type="button" onClick={onClose}>Đóng</button>{children}</div> : null),
}));

const settle = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
const heading = (v: string) => new RegExp(`^Phiên bản ${v.replace(/\./g, '\\.')} · `);

beforeEach(() => {
  vi.mocked(Preferences.get).mockReset();
  vi.mocked(Preferences.set).mockReset().mockResolvedValue();
});

describe('WhatsNewNotice — once after an update (v1.42.0)', () => {
  it('skipped versions show, newest first; "Đã hiểu" records the running version and closes', async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: '1.40.1' });
    render(<WhatsNewNotice />);
    expect(await screen.findByText(heading('1.42.0'))).toBeInTheDocument();
    expect(screen.getByText(heading('1.41.1'))).toBeInTheDocument();
    expect(screen.getByText(heading('1.41.0'))).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Đã hiểu' }));
    await waitFor(() => expect(Preferences.set).toHaveBeenCalledWith({ key: 'whats_new_seen', value: __APP_VERSION__ }));
    expect(screen.queryByText(heading('1.42.0'))).toBeNull();
  });

  it('closing it another way ("Đóng") also counts as seen', async () => {
    vi.mocked(Preferences.get).mockResolvedValue({ value: '1.41.1' });
    render(<WhatsNewNotice />);
    await screen.findByText(heading('1.42.0'));
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
    expect(await screen.findByText(heading('1.42.0'))).toBeInTheDocument();
    expect(screen.queryByText(heading('1.41.1'))).toBeNull();
  });

  it('storage cannot be read → nothing, no error', async () => {
    vi.mocked(Preferences.get).mockRejectedValue(new Error('storage'));
    render(<WhatsNewNotice />);
    await settle();
    expect(screen.queryByText(/^Phiên bản/)).toBeNull();
  });
});
