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
