import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { emptyIndex, addDoc, searchDocs } from '../search/invertedIndex';
import type { IndexDoc, SidecarUnit } from '../search/invertedIndex';
import DocResultList from './DocResultList';

const SEQ = ['hop', 'dong'];
const DOC_A = { pdfUri: 'uri://a.pdf', name: 'Luật Đất đai', mon: 'Đất Đai' };

function resultOf(docs: [IndexDoc, SidecarUnit[]][]) {
  const ix = emptyIndex();
  for (const [d, units] of docs) addDoc(ix, d, { units });
  return searchDocs(ix, 'hop dong').docs;
}

function renderList(docs: [IndexDoc, SidecarUnit[]][]) {
  const onOpenPage = vi.fn();
  const onOpenAll = vi.fn();
  const view = render(<DocResultList docs={resultOf(docs)} seq={SEQ} onOpenPage={onOpenPage} onOpenAll={onOpenAll} />);
  return { ...view, onOpenPage, onOpenAll };
}

const one = (page = 1): SidecarUnit[] => [{ label: '', page, text: 'Giao kết hợp đồng.' }];

describe('DocResultList (v1.41.0)', () => {
  it('card: count, label and snippet open the right page', () => {
    const { onOpenPage, onOpenAll } = renderList([[DOC_A, [
      { label: 'Điều 386', page: 22, text: 'Đề nghị giao kết hợp đồng là việc thể hiện rõ ý định.' },
      { label: 'Điều 385', page: 21, text: 'Hợp đồng là sự thỏa thuận.' },
      { label: 'Điều 400', page: 30, text: 'Thời điểm giao kết hợp đồng.' },
    ]]]);
    expect(screen.getByText('3 đoạn')).toBeInTheDocument();
    expect(screen.getByText('Điều 385 · trang 21')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mở Luật Đất đai tại trang 21' }));
    expect(onOpenPage).toHaveBeenCalledWith(DOC_A.pdfUri, 21);
    fireEvent.click(screen.getByRole('button', { name: 'Xem cả 3 đoạn trong Luật Đất đai' }));
    expect(onOpenAll).toHaveBeenCalledWith(DOC_A.pdfUri);
  });

  it('unit without a label shows just the page', () => {
    renderList([[DOC_A, one(7)]]);
    expect(screen.getByText('trang 7')).toBeInTheDocument();
  });

  it('count 1 → no "Xem cả" button', () => {
    renderList([[DOC_A, one()]]);
    expect(screen.queryByText(/Xem cả/)).toBeNull();
  });

  it('45 docs → 20, then 40, then 45 and the button disappears', () => {
    renderList(Array.from({ length: 45 }, (_, i): [IndexDoc, SidecarUnit[]] =>
      [{ pdfUri: `uri://d${i}.pdf`, name: `Tài liệu ${i}`, mon: 'Kinh doanh' }, one()]));
    expect(screen.getAllByRole('button', { name: /^Mở / })).toHaveLength(20);
    fireEvent.click(screen.getByRole('button', { name: 'Hiện thêm tài liệu' }));
    expect(screen.getAllByRole('button', { name: /^Mở / })).toHaveLength(40);
    fireEvent.click(screen.getByRole('button', { name: 'Hiện thêm tài liệu' }));
    expect(screen.getAllByRole('button', { name: /^Mở / })).toHaveLength(45);
    expect(screen.queryByRole('button', { name: 'Hiện thêm tài liệu' })).toBeNull();
  });

  it('same document name in two subjects → two cards, each opens its own file', () => {
    const { onOpenPage } = renderList([
      [{ pdfUri: 'uri://mon1/x.pdf', name: 'Luật DN 2020', mon: 'Luật Công Chứng' }, one(3)],
      [{ pdfUri: 'uri://mon2/x.pdf', name: 'Luật DN 2020', mon: 'PLCTKD' }, one(3)],
    ]);
    const cards = screen.getAllByRole('button', { name: /^Mở Luật DN 2020/ });
    expect(cards).toHaveLength(2);
    fireEvent.click(cards[1]);
    expect(onOpenPage).toHaveBeenCalledWith('uri://mon2/x.pdf', 3);
  });

  it('snippet highlights the phrase', () => {
    const { container } = renderList([[DOC_A, [{ label: '', page: 1, text: 'Hợp đồng là sự thỏa thuận.' }]]]);
    expect(container.querySelector('mark')?.textContent?.toLowerCase()).toBe('hợp đồng');
  });
});
