import { describe, it, expect } from 'vitest';
import { makeSnippet } from './snippet';

const LONG = 'Chương I quy định chung về nguyên tắc áp dụng. '
  + 'Người sử dụng đất được cấp giấy chứng nhận quyền sử dụng đất theo quy định của pháp luật. '
  + 'Các trường hợp khác thực hiện theo hướng dẫn của Chính phủ.';

describe('makeSnippet', () => {
  it('cắt QUANH chỗ khớp, không phải đầu đoạn', () => {
    const s = makeSnippet(LONG, ['giay', 'chung'], 40);
    expect(s.text).toContain('giấy');
    expect(s.cutHead).toBe(true);
  });

  it('vị trí tô sáng trỏ ĐÚNG chữ có dấu trong chuỗi gốc', () => {
    const s = makeSnippet('Người sử dụng đất', ['dat']);
    expect(s.marks).toHaveLength(1);
    expect(s.text.slice(s.marks[0].start, s.marks[0].end)).toBe('đất');
  });

  it('một chữ: tô MỌI chỗ khớp trong cửa sổ', () => {
    const s = makeSnippet('đất đai và đất ở', ['dat']);
    expect(s.marks.map((m) => s.text.slice(m.start, m.end))).toEqual(['đất', 'đất']);
  });

  it('nhiều chữ: tô NGUYÊN CỤM thành một vệt, không rời rạc', () => {
    const s = makeSnippet('Người phạm tội là công dân Việt Nam', ['la', 'cong', 'dan']);
    expect(s.marks).toHaveLength(1);
    expect(s.text.slice(s.marks[0].start, s.marks[0].end)).toBe('là công dân');
  });

  it('KHÔNG tô chữ chỉ khớp rời — lỗi Gú gặp: "đánh" bị tô cho "dân"', () => {
    // fold("đánh") = "danh", bắt đầu bằng "dan" → bản cũ tô nó. Nay chỉ tô khi nằm trong cụm.
    const s = makeSnippet('Lỗi kỹ thuật là lỗi do sai sót khi đánh máy văn bản công chứng',
      ['la', 'cong', 'dan']);
    expect(s.marks).toEqual([]);
  });

  it('dấu câu / xuống dòng KHÔNG cắt cụm', () => {
    const s = makeSnippet('Người đó là, công dân hợp pháp', ['la', 'cong', 'dan']);
    expect(s.marks).toHaveLength(1);
    expect(s.text.slice(s.marks[0].start, s.marks[0].end)).toBe('là, công dân');
  });

  it('không cắt ngang một chữ', () => {
    const s = makeSnippet(LONG, ['chung'], 30);
    expect(s.text.startsWith(' ')).toBe(false);
    expect(/\S$/.test(s.text)).toBe(true);
  });

  it('đoạn ngắn hơn cửa sổ → không có dấu cắt hai đầu', () => {
    const s = makeSnippet('Hợp đồng dân sự.', ['hop']);
    expect(s.cutHead).toBe(false);
    expect(s.cutTail).toBe(false);
  });

  it('không định vị được thì vẫn trả đoạn đầu, không ném', () => {
    const s = makeSnippet('Không có gì khớp ở đây', ['zzz'], 30);
    expect(s.text.length).toBeGreaterThan(0);
    expect(s.marks).toEqual([]);
  });
});
