import { describe, it, expect } from 'vitest';
import { validateFolderName } from './folderName';
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
