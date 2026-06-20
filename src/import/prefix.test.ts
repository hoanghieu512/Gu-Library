import { describe, it, expect } from 'vitest';
import { makeInboxName, parseInboxPrefix, UNFILED } from './prefix';

describe('inbox prefix', () => {
  it('makeInboxName gắn tiền tố môn', () => {
    expect(makeInboxName('Tố tụng Hình sự', 'bai.pdf')).toBe('[Tố tụng Hình sự] bai.pdf');
  });
  it('makeInboxName cho Chưa phân loại', () => {
    expect(makeInboxName(UNFILED, 'x.docx')).toBe('[Chưa phân loại] x.docx');
  });
  it('parseInboxPrefix lấy lại môn + tên gốc', () => {
    expect(parseInboxPrefix('[Tố tụng Hình sự] bai.pdf')).toEqual({ mon: 'Tố tụng Hình sự', name: 'bai.pdf' });
  });
  it('parse chịu được hậu tố (1) Android tự thêm', () => {
    expect(parseInboxPrefix('[Luật Công chứng] bai (1).pdf')).toEqual({ mon: 'Luật Công chứng', name: 'bai (1).pdf' });
  });
  it('parse trả null khi không có tiền tố', () => {
    expect(parseInboxPrefix('khong-tien-to.pdf')).toBeNull();
  });
  it('parse bỏ qua file ẩn / .json', () => {
    expect(parseInboxPrefix('.stfolder')).toBeNull();
  });
});
