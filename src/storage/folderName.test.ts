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
});
