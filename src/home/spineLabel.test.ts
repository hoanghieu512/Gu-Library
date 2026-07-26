import { describe, it, expect } from 'vitest';
import { spineLabel } from './spineLabel';

describe('spineLabel (nhãn gáy — bỏ tiền tố "Luật ")', () => {
  it('bỏ "Luật " đầu tên + viết HOA chữ đầu phần còn lại', () => {
    expect(spineLabel('Luật Đất Đai')).toBe('Đất Đai');
    expect(spineLabel('Luật Công Chứng')).toBe('Công Chứng');
    // "hành chính" thường → hoa chữ đầu cho khớp mắt các gáy khác (Beat 3b)
    expect(spineLabel('Luật hành chính')).toBe('Hành chính');
    expect(spineLabel('Luật Lao Động')).toBe('Lao Động');
  });
  it('hoa chữ đầu có dấu tiếng Việt (đ → Đ)', () => {
    expect(spineLabel('Luật đất đai')).toBe('Đất đai');
    expect(spineLabel('Luật ô nhiễm')).toBe('Ô nhiễm');
  });
  it('giữ nguyên tên không có tiền tố', () => {
    expect(spineLabel('Hình sự chung')).toBe('Hình sự chung');
    expect(spineLabel('Tố tụng Hình sự')).toBe('Tố tụng Hình sự');
    expect(spineLabel('PLCTKD')).toBe('PLCTKD');
    expect(spineLabel('Chưa phân loại')).toBe('Chưa phân loại');
  });
  it('môn tên đúng "Luật" (không có phần sau) → giữ nguyên', () => {
    expect(spineLabel('Luật')).toBe('Luật');
  });
  it('nhiều khoảng trắng sau "Luật" → vẫn bỏ đúng', () => {
    expect(spineLabel('Luật  Đất Đai')).toBe('Đất Đai');
  });
});
