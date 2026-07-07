import { describe, it, expect } from 'vitest';
import { folderHeaderTitle } from './folderHeader';

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
