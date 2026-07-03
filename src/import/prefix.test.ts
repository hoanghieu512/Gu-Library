import { describe, it, expect } from 'vitest';
import { makeInboxName, parseInboxPrefix, stripTempSuffix, UNFILED } from './prefix';

describe('stripTempSuffix', () => {
  it('bỏ .tmp lộ tên thật', () => {
    expect(stripTempSuffix('Văn bản.pdf.tmp')).toBe('Văn bản.pdf');
  });
  it('bỏ .crdownload / .part / .download', () => {
    expect(stripTempSuffix('a.docx.crdownload')).toBe('a.docx');
    expect(stripTempSuffix('b.ppt.part')).toBe('b.ppt');
    expect(stripTempSuffix('c.pdf.download')).toBe('c.pdf');
  });
  it('không động tên sạch', () => {
    expect(stripTempSuffix('x.pdf')).toBe('x.pdf');
  });
  it('bỏ đuôi tạm lồng nhau + không phân biệt hoa thường', () => {
    expect(stripTempSuffix('x.pdf.CRDOWNLOAD.tmp')).toBe('x.pdf');
  });
});

describe('inbox prefix', () => {
  it('makeInboxName một cấp (môn) = một ngoặc', () => {
    expect(makeInboxName(['Tố tụng Hình sự'], 'bai.pdf')).toBe('[Tố tụng Hình sự] bai.pdf');
  });
  it('makeInboxName lồng nhiều cấp = lặp ngoặc mỗi cấp', () => {
    expect(makeInboxName(['Luật Đất đai', 'Bài giảng'], 'file.pdf')).toBe('[Luật Đất đai][Bài giảng] file.pdf');
    expect(makeInboxName(['A', 'B', 'C'], 'x.docx')).toBe('[A][B][C] x.docx');
  });
  it('makeInboxName strip đuôi tạm của tên nguồn', () => {
    expect(makeInboxName(['Tố tụng Hình sự'], 'bai.pdf.tmp')).toBe('[Tố tụng Hình sự] bai.pdf');
  });
  it('makeInboxName cho Chưa phân loại', () => {
    expect(makeInboxName([UNFILED], 'x.docx')).toBe('[Chưa phân loại] x.docx');
  });
  it('parseInboxPrefix lấy lại môn + tên gốc', () => {
    expect(parseInboxPrefix('[Tố tụng Hình sự] bai.pdf')).toEqual({ mon: 'Tố tụng Hình sự', name: 'bai.pdf' });
  });
  it('parseInboxPrefix lấy NGOẶC ĐẦU làm môn với tiền tố lồng', () => {
    expect(parseInboxPrefix('[Luật Đất đai][Bài giảng] file.pdf'))
      .toEqual({ mon: 'Luật Đất đai', name: 'file.pdf' });
    expect(parseInboxPrefix('[A][B][C] x.docx')).toEqual({ mon: 'A', name: 'x.docx' });
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
