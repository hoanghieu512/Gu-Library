import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import { Preferences } from '@capacitor/preferences';
import WhatsNewEntry from './WhatsNewEntry';

vi.mock('@capacitor/preferences', () => ({ Preferences: { get: vi.fn(), set: vi.fn() } }));
vi.mock('./GuSheet', () => ({
  default: ({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: ReactNode }) =>
    (isOpen ? <div><button type="button" onClick={onClose}>Đóng</button>{children}</div> : null),
}));

describe('WhatsNewEntry — "Có gì mới" in Settings (v1.42.0)', () => {
  it('a button with the version; opens the 3 latest versions, no "Đã hiểu", nothing recorded', () => {
    render(<WhatsNewEntry version="1.42.0" />);
    const entry = screen.getByRole('button', { name: 'Xem có gì mới, phiên bản 1.42.0' });
    expect(entry).toHaveTextContent('Có gì mới · Phiên bản 1.42.0');
    fireEvent.click(entry);
    expect(screen.getByText(/^Phiên bản 1\.42\.0 · /)).toBeInTheDocument();
    expect(screen.getByText(/^Phiên bản 1\.41\.1 · /)).toBeInTheDocument();
    expect(screen.getByText(/^Phiên bản 1\.41\.0 · /)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Đã hiểu' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));
    expect(screen.queryByText(/^Phiên bản 1\.42\.0 · /)).toBeNull();
    expect(Preferences.set).not.toHaveBeenCalled();
  });
});
