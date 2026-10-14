import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import { Preferences } from '@capacitor/preferences';
import WhatsNewEntry from './WhatsNewEntry';
import { RELEASE_NOTES } from '../whatsNew/notes';

vi.mock('@capacitor/preferences', () => ({ Preferences: { get: vi.fn(), set: vi.fn() } }));
vi.mock('./GuSheet', () => ({
  default: ({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: ReactNode }) =>
    (isOpen ? <div><button type="button" onClick={onClose}>Đóng</button>{children}</div> : null),
}));

const heading = (v: string) => new RegExp(`^Phiên bản ${v.replace(/\./g, '\\.')} · `);

describe('WhatsNewEntry — "Có gì mới" in Settings (v1.42.0)', () => {
  it('a Settings card titled "Có gì mới" with the version the notes are picked by (v1.42.1: one source)', () => {
    render(<WhatsNewEntry />);
    const entry = screen.getByRole('button', { name: `Xem có gì mới, phiên bản ${__APP_VERSION__}` });
    expect(entry).toHaveTextContent('Có gì mới');
    expect(entry).toHaveTextContent(`Phiên bản ${__APP_VERSION__}`);
  });

  it('opens the 3 latest versions, no "Đã hiểu", nothing recorded', () => {
    render(<WhatsNewEntry />);
    fireEvent.click(screen.getByRole('button', { name: `Xem có gì mới, phiên bản ${__APP_VERSION__}` }));
    for (const n of RELEASE_NOTES.slice(0, 3)) expect(screen.getByText(heading(n.version))).toBeInTheDocument();
    expect(screen.queryByText(heading(RELEASE_NOTES[3]?.version ?? 'none'))).toBeNull();
    expect(screen.queryByRole('button', { name: 'Đã hiểu' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(screen.queryByText(heading(RELEASE_NOTES[0].version))).toBeNull();
    expect(Preferences.set).not.toHaveBeenCalled();
  });
});
