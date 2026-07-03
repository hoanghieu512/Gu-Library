import { describe, it, expect } from 'vitest';
import { DISPLAY_SUFFIX, displayFileName, isDisplayFile, parseDisplayName } from './displayName';

describe('displayName', () => {
  it('tên companion = base + .display.json', () => {
    expect(displayFileName('luat')).toBe('luat.display.json');
    expect(DISPLAY_SUFFIX).toBe('.display.json');
  });
  it('isDisplayFile', () => {
    expect(isDisplayFile('luat.display.json')).toBe(true);
    expect(isDisplayFile('luat.json')).toBe(false);
    expect(isDisplayFile('luat.print.json')).toBe(false);
  });
  it('parseDisplayName lấy name không rỗng (trim), else null', () => {
    expect(parseDisplayName('{"name":"Luật Đất đai 2024"}')).toBe('Luật Đất đai 2024');
    expect(parseDisplayName('{"name":"  x  "}')).toBe('x');
    expect(parseDisplayName('{"name":""}')).toBeNull();
    expect(parseDisplayName('{}')).toBeNull();
    expect(parseDisplayName('hỏng')).toBeNull();
  });
});
