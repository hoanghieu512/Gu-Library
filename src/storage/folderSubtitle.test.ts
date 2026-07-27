import { describe, it, expect } from 'vitest';
import { folderSubtitle } from './folderSubtitle';

describe('folderSubtitle (dòng phụ "bên trong có gì")', () => {
  it('có cả thư mục con lẫn tài liệu', () => {
    expect(folderSubtitle(3, 12)).toBe('3 thư mục · 12 tài liệu');
    expect(folderSubtitle(1, 1)).toBe('1 thư mục · 1 tài liệu');
  });
  it('chỉ có một loại → bỏ hẳn vế kia (KHÔNG hiện "0 …")', () => {
    expect(folderSubtitle(0, 12)).toBe('12 tài liệu');
    expect(folderSubtitle(2, 0)).toBe('2 thư mục');
  });
  it('rỗng → "Trống"', () => {
    expect(folderSubtitle(0, 0)).toBe('Trống');
  });
});
