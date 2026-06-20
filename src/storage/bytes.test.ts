import { describe, it, expect } from 'vitest';
import { base64ToBytes } from './bytes';

describe('base64ToBytes', () => {
  it('decodes base64 to exact byte sequence', () => {
    // "PDF" = 0x50 0x44 0x46 ; base64 "UERG"
    expect(Array.from(base64ToBytes('UERG'))).toEqual([0x50, 0x44, 0x46]);
  });
  it('decodes the PDF magic header %PDF- (JVBERi0=)', () => {
    expect(Array.from(base64ToBytes('JVBERi0='))).toEqual([0x25, 0x50, 0x44, 0x46, 0x2d]);
  });
  it('empty string -> empty array', () => {
    expect(base64ToBytes('').length).toBe(0);
  });
});
