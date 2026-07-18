import { describe, it, expect } from 'vitest';
import { validateFolderName, deleteFolderMessage } from './folderName';
describe('validateFolderName', () => {
  it('chấp nhận tên tiếng Việt có dấu (trim)', () => {
    expect(validateFolderName('  Luật Đất đai  ')).toEqual({ ok: true, value: 'Luật Đất đai' });
  });
  it('chặn rỗng / toàn space', () => {
    expect(validateFolderName('   ').ok).toBe(false);
    expect(validateFolderName('').ok).toBe(false);
  });
  it('chặn ký tự cấm', () => {
    for (const c of ['/', '\\', ':', '*', '?', '"', '<', '>', '|']) {
      expect(validateFolderName('a' + c + 'b').ok).toBe(false);
    }
  });
  it('chặn ngoặc vuông [ ] (phá hợp đồng tiền tố)', () => {
    expect(validateFolderName('Bài[giảng]').ok).toBe(false);
    expect(validateFolderName('a]b').ok).toBe(false);
  });
  it('chặn tên bắt đầu bằng _ (quy ước file hệ thống)', () => {
    expect(validateFolderName('_inbox').ok).toBe(false);
    expect(validateFolderName('_x').ok).toBe(false);
  });
  it('chấp nhận tên hợp lệ có gạch/space', () => {
    const r = validateFolderName('  Bài giảng 2024 ');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe('Bài giảng 2024');
  });
});

describe('deleteFolderMessage (nêu số lượng, không dọa)', () => {
  it('rỗng → "đang trống", không "0 tài liệu"', () =>
    expect(deleteFolderMessage('X', 0, 0)).toBe('“X” đang trống.'));
  it('chỉ tài liệu', () =>
    expect(deleteFolderMessage('X', 5, 0)).toBe('Bên trong “X” có 5 tài liệu.'));
  it('chỉ thư mục con', () =>
    expect(deleteFolderMessage('X', 0, 3)).toBe('Bên trong “X” có 3 thư mục con.'));
  it('cả hai', () =>
    expect(deleteFolderMessage('X', 5, 2)).toBe('Bên trong “X” có 5 tài liệu và 2 thư mục con.'));
  it('không chứa chữ dọa "không thể hoàn tác"', () =>
    expect(deleteFolderMessage('X', 5, 2)).not.toMatch(/hoàn tác|xóa vĩnh viễn/i));
});
