import { describe, it, expect } from 'vitest';
import {
  PRINT_FLAG_SUFFIX, printFlagName, isPrintFlag, baseFromFlag,
  printedNameFor, isSentMatch,
} from './printName';

describe('printName', () => {
  it('companion name = base + .print.json', () => {
    expect(printFlagName('luat')).toBe('luat.print.json');
    expect(PRINT_FLAG_SUFFIX).toBe('.print.json');
  });

  it('isPrintFlag nhận diện companion', () => {
    expect(isPrintFlag('luat.print.json')).toBe(true);
    expect(isPrintFlag('luat.json')).toBe(false);
    expect(isPrintFlag('luat.pdf')).toBe(false);
  });

  it('baseFromFlag lột đuôi .print.json', () => {
    expect(baseFromFlag('slide-buoi-1.print.json')).toBe('slide-buoi-1');
  });

  it('printedNameFor gắn tiền tố môn', () => {
    expect(printedNameFor('Tố tụng Hình sự', 'slide-buoi-1'))
      .toBe('[Tố tụng Hình sự] slide-buoi-1.pdf');
  });

  it('isSentMatch khớp tên đúng + biến thể dedup (k)', () => {
    expect(isSentMatch('[Hiến pháp] luat.pdf', 'Hiến pháp', 'luat')).toBe(true);
    expect(isSentMatch('[Hiến pháp] luat (1).pdf', 'Hiến pháp', 'luat')).toBe(true);
    expect(isSentMatch('[Hiến pháp] luat.pdf', 'Dân sự', 'luat')).toBe(false);
    expect(isSentMatch('[Hiến pháp] luat-2.pdf', 'Hiến pháp', 'luat')).toBe(false);
    expect(isSentMatch('[Hiến pháp] luat.json', 'Hiến pháp', 'luat')).toBe(false);
  });
});
