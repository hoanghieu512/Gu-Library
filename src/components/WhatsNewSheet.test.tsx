import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import WhatsNewSheet from './WhatsNewSheet';
import type { ReleaseNote } from '../whatsNew/types';

// IonModal does not run in jsdom; the shell shows children when open and has the header "Đóng".
vi.mock('./GuSheet', () => ({
  default: ({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: ReactNode }) =>
    (isOpen ? <div><button type="button" onClick={onClose}>Đóng</button>{children}</div> : null),
}));

const NOTES: ReleaseNote[] = [
  { version: '1.41.1', date: '10/10/2026', items: [{ kind: 'fix', text: 'Slide hết nhảy trang' }] },
  { version: '1.41.0', date: '06/10/2026', items: [{ kind: 'new', text: 'Màn Tìm gom theo tài liệu' }, { kind: 'improve', text: 'Tên đổi hiện ở màn Tìm' }] },
];

describe('WhatsNewSheet — "Có gì mới" (v1.42.0)', () => {
  it('lists every version with its date, lines and kind chips', () => {
    render(<WhatsNewSheet isOpen notes={NOTES} onClose={() => {}} />);
    expect(screen.getByText('Phiên bản 1.41.1 · 10/10/2026')).toBeInTheDocument();
    expect(screen.getByText('Phiên bản 1.41.0 · 06/10/2026')).toBeInTheDocument();
    expect(screen.getByText('Slide hết nhảy trang')).toBeInTheDocument();
    expect(screen.getByText('Màn Tìm gom theo tài liệu')).toBeInTheDocument();
    expect(screen.getByText('Sửa lỗi')).toBeInTheDocument();
    expect(screen.getByText('Mới')).toBeInTheDocument();
    expect(screen.getByText('Cải thiện')).toBeInTheDocument();
  });

  it('leaves scrolling to the sheet (no nested scroll area that defeats swipe-to-close protection)', () => {
    const { container } = render(<WhatsNewSheet isOpen notes={NOTES} onClose={() => {}} />);
    const scrollers = [...container.querySelectorAll<HTMLElement>('*')]
      .filter((el) => ['auto', 'scroll'].includes(el.style.overflowY) || ['auto', 'scroll'].includes(el.style.overflow));
    expect(scrollers).toHaveLength(0);
  });

  it('acknowledge → "Đã hiểu" closes it', () => {
    const onClose = vi.fn();
    render(<WhatsNewSheet isOpen notes={NOTES} onClose={onClose} acknowledge />);
    fireEvent.click(screen.getByRole('button', { name: 'Đã hiểu' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('without acknowledge (Settings) → no "Đã hiểu"', () => {
    render(<WhatsNewSheet isOpen notes={NOTES} onClose={() => {}} />);
    expect(screen.queryByRole('button', { name: 'Đã hiểu' })).toBeNull();
  });
});
