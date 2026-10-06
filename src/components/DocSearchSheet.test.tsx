import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import type { ReactNode } from 'react';
import { emptyIndex, addDoc } from '../search/invertedIndex';
import DocSearchSheet from './DocSearchSheet';

// IonModal does not run in jsdom; the shell only decides whether children are shown.
vi.mock('./GuSheet', () => ({
  default: ({ isOpen, children }: { isOpen: boolean; children: ReactNode }) => (isOpen ? <div>{children}</div> : null),
}));

vi.mock('../search/docIndex', () => ({
  indexOneDoc: async (pdfUri: string) => {
    const index = emptyIndex();
    if (pdfUri === 'uri://big.pdf') {
      addDoc(index, { pdfUri, name: pdfUri, mon: 'Hình sự chung' }, {
        units: Array.from({ length: 120 }, (_, i) => ({ label: '', page: i + 1, text: `Quyết định về đặc xá số ${i}.` })),
      });
      return { index, imageOnly: false };
    }
    addDoc(index, { pdfUri, name: pdfUri, mon: 'Hình sự chung' }, {
      units: [
        { label: 'Khoản 2', path: ['Điều 2'], page: 37, text: 'Sửa đổi khoản 2 Điều 9 Luật Đặc xá.' },
        { label: 'Khoản 2', path: ['Điều 2'], page: 38, text: 'Trong thời hạn 10 ngày kể từ ngày Quyết định về đặc xá.' },
      ],
    });
    return { index, imageOnly: false };
  },
}));

const noop = () => {};

function sheet(isOpen: boolean, docUri = 'uri://luat-sd.pdf', onJump: (p: number) => void = noop) {
  return <DocSearchSheet isOpen={isOpen} docUri={isOpen ? docUri : null} docName="Luật SĐ" onClose={noop} onJump={onJump} />;
}

async function typeQuery(text: string) {
  const input = await screen.findByLabelText('Tìm trong tài liệu này');
  fireEvent.change(input, { target: { value: text } });
  await screen.findByText('2 đoạn khớp');
}

describe('DocSearchSheet giữ câu tra (v1.40.0)', () => {
  it('chạm kết quả → sheet đóng → mở lại vẫn còn câu tra và kết quả', async () => {
    const onJump = vi.fn();
    const { rerender } = render(sheet(true, undefined, onJump));
    await typeQuery('dac xa');

    fireEvent.click(screen.getByRole('button', { name: 'Nhảy tới trang 38' }));
    expect(onJump).toHaveBeenCalledWith(38);
    rerender(sheet(false));
    rerender(sheet(true));

    expect(await screen.findByLabelText('Tìm trong tài liệu này')).toHaveValue('dac xa');
    expect(await screen.findByText('2 đoạn khớp')).toBeInTheDocument();
  });

  it('tài liệu KHÁC thì ô tra trống — câu tra nhớ theo từng tài liệu', async () => {
    const { rerender } = render(sheet(true, 'uri://a.pdf'));
    await typeQuery('dac xa');
    rerender(sheet(false));
    rerender(sheet(true, 'uri://b.pdf'));

    expect(await screen.findByLabelText('Tìm trong tài liệu này')).toHaveValue('');
  });

  it('xoá ô tra rồi đóng → mở lại trống, không hồi lại câu cũ', async () => {
    const { rerender } = render(sheet(true));
    await typeQuery('dac xa');
    fireEvent.click(screen.getByRole('button', { name: 'Xoá ô tìm' }));
    rerender(sheet(false));
    rerender(sheet(true));

    await waitFor(() => expect(screen.getByLabelText('Tìm trong tài liệu này')).toHaveValue(''));
  });

  it('nhãn kết quả mang Điều chứa khoản', async () => {
    render(sheet(true));
    await typeQuery('dac xa');
    expect(screen.getByText('Khoản 2 · Điều 2 · trang 38')).toBeInTheDocument();
  });
});

describe('DocSearchSheet from "Xem cả N đoạn" (v1.41.0)', () => {
  it('seeded query shows hits without typing and leaves the keyboard down', async () => {
    render(<DocSearchSheet isOpen docUri="uri://luat-sd.pdf" docName="Luật SĐ" onClose={noop} onJump={noop}
      seed={{ docUri: 'uri://luat-sd.pdf', q: 'dac xa' }} />);
    expect(await screen.findByText('2 đoạn khớp')).toBeInTheDocument();
    const input = screen.getByLabelText('Tìm trong tài liệu này');
    expect(input).toHaveValue('dac xa');
    await new Promise((r) => setTimeout(r, 400));     // the sheet's deferred focus fires at 350 ms
    expect(document.activeElement).not.toBe(input);
  });

  it('seed for another document does not leak into this one', async () => {
    render(<DocSearchSheet isOpen docUri="uri://b.pdf" docName="B" onClose={noop} onJump={noop}
      seed={{ docUri: 'uri://a.pdf', q: 'dac xa' }} />);
    expect(await screen.findByLabelText('Tìm trong tài liệu này')).toHaveValue('');
  });

  it('exact count and paging by 50: 120 → 50, 100, 120', async () => {
    render(sheet(true, 'uri://big.pdf'));
    const input = await screen.findByLabelText('Tìm trong tài liệu này');
    fireEvent.change(input, { target: { value: 'dac xa' } });
    expect(await screen.findByText('120 đoạn khớp')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Nhảy tới trang/ })).toHaveLength(50);
    fireEvent.click(screen.getByRole('button', { name: 'Hiện thêm 50 đoạn' }));
    expect(screen.getAllByRole('button', { name: /^Nhảy tới trang/ })).toHaveLength(100);
    fireEvent.click(screen.getByRole('button', { name: 'Hiện thêm 20 đoạn' }));
    expect(screen.getAllByRole('button', { name: /^Nhảy tới trang/ })).toHaveLength(120);
    expect(screen.queryByRole('button', { name: /^Hiện thêm/ })).toBeNull();
  });
});
