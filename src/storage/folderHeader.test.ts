import { describe, it, expect } from 'vitest';
import { folderHeaderTitle, readingLocator } from './folderHeader';

describe('folderHeaderTitle', () => {
  it('rỗng → fallback', () => expect(folderHeaderTitle([])).toBe('Môn / Chương'));
  it('cấp 1 = tên môn', () => expect(folderHeaderTitle(['Tố tụng Hình sự'])).toBe('Tố tụng Hình sự'));
  it('cấp 2 = "Môn / Thư mục" (không dấu …)', () =>
    expect(folderHeaderTitle(['Hiến pháp', 'Bài giảng'])).toBe('Hiến pháp / Bài giảng'));
  it('cấp 3 = "… / Cha / Hiện tại"', () =>
    expect(folderHeaderTitle(['A', 'B', 'C'])).toBe('… / B / C'));
  it('cấp 4 chỉ giữ 2 tầng cuối', () =>
    expect(folderHeaderTitle(['A', 'B', 'C', 'D'])).toBe('… / C / D'));
  it('bỏ đoạn rỗng', () =>
    expect(folderHeaderTitle(['Logic', '', 'Slide'])).toBe('Logic / Slide'));
});

describe('readingLocator', () => {
  it('tài liệu ngay trong folder môn → chỉ tên môn (không / thừa)', () =>
    expect(readingLocator('Hiến pháp/bai1.pdf')).toBe('Hiến pháp'));
  it('sâu 1 thư mục con → "Môn / Thư mục"', () =>
    expect(readingLocator('Hiến pháp/Bài giảng/bai1.pdf')).toBe('Hiến pháp / Bài giảng'));
  it('sâu nhiều tầng → rút gọn "… / Cha / Hiện tại"', () =>
    expect(readingLocator('Luật hành chính/A/B/C/tep.pdf')).toBe('… / B / C'));
  it('2 tài liệu cùng môn khác thư mục con → phụ đề KHÁC nhau', () => {
    const a = readingLocator('Luật hành chính/Slide bài giảng/x.pdf');
    const b = readingLocator('Luật hành chính/VBQPPL/x.pdf');
    expect(a).not.toBe(b);
  });
  it('Chưa phân loại → tên category (folder thật)', () =>
    expect(readingLocator('Chưa phân loại/x.pdf')).toBe('Chưa phân loại'));
});
