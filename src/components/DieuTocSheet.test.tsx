import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ComponentProps, ReactNode } from 'react';
import { buildToc } from '../viewer/dieuToc';
import DieuTocSheet from './DieuTocSheet';

// IonModal does not run in jsdom; the shell only decides whether children are shown.
vi.mock('./GuSheet', () => ({
  default: ({ isOpen, children }: { isOpen: boolean; children: ReactNode }) => (isOpen ? <div>{children}</div> : null),
}));

const entries = buildToc({
  kind: 'legal',
  units: [
    { type: 'dieu', label: 'Điều 1', path: ['Chương I', 'Điều 1'], page: 1, text: 'Điều 1. Phạm vi điều chỉnh' },
    { type: 'dieu', label: 'Điều 2', path: ['Chương I', 'Điều 2'], page: 2, text: 'Điều 2. Đối tượng áp dụng' },
    { type: 'dieu', label: 'Điều 3', path: ['Chương II', 'Điều 3'], page: 4, text: 'Điều 3. Áp dụng luật' },
    { type: 'dieu', label: 'Điều 30', path: ['Chương II', 'Điều 30'], page: 20, text: 'Điều 30. Tài sản góp vốn' },
  ],
});

const noop = () => {};
function sheet(p: Partial<ComponentProps<typeof DieuTocSheet>> = {}) {
  return (
    <DieuTocSheet isOpen docUri="uri://luat.pdf" entries={entries} currentPage={1} onClose={noop} onJump={noop} {...p} />
  );
}
const rowNames = () => screen.getAllByRole('button', { name: /^Nhảy tới/ }).map((b) => b.getAttribute('aria-label'));
const row = (name: string) => screen.getByRole('button', { name });
const filter = (value: string) => fireEvent.change(screen.getByLabelText('Lọc theo số Điều'), { target: { value } });

// jsdom has no scrollIntoView: stand one in, and put back whatever was there.
const original = Element.prototype.scrollIntoView;
let scrollIntoView: ReturnType<typeof vi.fn<(arg?: boolean | ScrollIntoViewOptions) => void>>;
beforeEach(() => {
  scrollIntoView = vi.fn<(arg?: boolean | ScrollIntoViewOptions) => void>();
  Element.prototype.scrollIntoView = scrollIntoView;
});
afterEach(() => {
  Element.prototype.scrollIntoView = original;
  vi.restoreAllMocks();
});

describe('DieuTocSheet', () => {
  it('lists chapters and articles in document order', () => {
    render(sheet());
    expect(screen.getByText('4 Điều')).toBeInTheDocument();
    expect(screen.getByText('Chương I')).toBeInTheDocument();
    expect(screen.getByText('Chương II')).toBeInTheDocument();
    expect(rowNames()).toEqual([
      'Nhảy tới Điều 1, trang 1', 'Nhảy tới Điều 2, trang 2', 'Nhảy tới Điều 3, trang 4', 'Nhảy tới Điều 30, trang 20',
    ]);
    expect(screen.getByText('Áp dụng luật')).toBeInTheDocument();
    expect(screen.getByText('tr. 4')).toBeInTheDocument();
  });

  it('filters by number, exact first, chapter on the second line', () => {
    render(sheet());
    filter('3');
    expect(screen.getByText('2 Điều khớp')).toBeInTheDocument();
    expect(rowNames()).toEqual(['Nhảy tới Điều 3, trang 4', 'Nhảy tới Điều 30, trang 20']);
    expect(screen.getByText('Chương II · trang 4')).toBeInTheDocument();
    expect(screen.queryByText('Chương II')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Xoá ô lọc' }));
    expect(screen.getByText('4 Điều')).toBeInTheDocument();
  });

  it('says when no Điều has that number', () => {
    render(sheet());
    filter('dieu 999');
    expect(screen.getByText('Không có Điều nào số “999”')).toBeInTheDocument();
  });

  it('tapping an Điều jumps and closes', () => {
    const onJump = vi.fn();
    const onClose = vi.fn();
    render(sheet({ onJump, onClose }));
    fireEvent.click(row('Nhảy tới Điều 3, trang 4'));
    expect(onJump).toHaveBeenCalledWith(4);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('marks the Điều being read and follows the page', () => {
    const { rerender } = render(sheet({ currentPage: 4 }));
    expect(screen.getAllByText('đang đọc')).toHaveLength(1);
    expect(within(row('Nhảy tới Điều 3, trang 4')).getByText('đang đọc')).toBeInTheDocument();
    rerender(sheet({ isOpen: false, currentPage: 20 }));
    rerender(sheet({ currentPage: 20 }));
    expect(screen.getAllByText('đang đọc')).toHaveLength(1);
    expect(within(row('Nhảy tới Điều 30, trang 20')).getByText('đang đọc')).toBeInTheDocument();
  });

  it('scrolls the Điều being read into view on open', async () => {
    render(sheet({ currentPage: 4 }));
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center' }), { timeout: 1000 });
    expect((scrollIntoView.mock.contexts[0] as HTMLElement).textContent).toContain('Điều 3');
  });

  it('keeps the filter and the count pinned above the list', () => {
    render(sheet());
    let bar = screen.getByLabelText('Lọc theo số Điều').parentElement;
    while (bar && bar.style.position !== 'sticky') bar = bar.parentElement;
    expect(bar).not.toBeNull();
    expect(bar).toContainElement(screen.getByText('4 Điều'));
    expect(bar).not.toContainElement(row('Nhảy tới Điều 1, trang 1'));
  });

  it('typing a filter brings the list back to the top', async () => {
    render(sheet({ currentPage: 20 }));
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center' }), { timeout: 1000 });
    filter('3');
    expect(scrollIntoView).toHaveBeenLastCalledWith({ block: 'start' });
    expect(scrollIntoView.mock.contexts.at(-1) as HTMLElement).toContainElement(screen.getByLabelText('Lọc theo số Điều'));
  });

  it('opens with an empty filter that is not focused', async () => {
    const { rerender } = render(sheet());
    filter('3');
    rerender(sheet({ isOpen: false }));
    rerender(sheet());
    const input = screen.getByLabelText('Lọc theo số Điều');
    expect(input).toHaveValue('');
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalled(), { timeout: 1000 });
    expect(document.activeElement).not.toBe(input);
  });

  it('renders nothing without entries', () => {
    const { rerender } = render(sheet({ entries: [] }));
    expect(screen.queryByLabelText('Lọc theo số Điều')).toBeNull();
    rerender(sheet({ entries: null }));
    expect(screen.queryByLabelText('Lọc theo số Điều')).toBeNull();
  });
});
