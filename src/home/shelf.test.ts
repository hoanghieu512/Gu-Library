import { describe, it, expect } from 'vitest';
import { spineWidth, packShelves, SPINE_MIN, SPINE_MAX, SPINE_CAP } from './shelf';

describe('spineWidth (bề dày gáy theo số tài liệu)', () => {
  it('0 tài liệu → mỏng nhất (MIN)', () => expect(spineWidth(0)).toBe(SPINE_MIN));
  it('≥ CAP → dày tối đa (MAX), có trần', () => {
    expect(spineWidth(SPINE_CAP)).toBe(SPINE_MAX);
    expect(spineWidth(44)).toBe(SPINE_MAX);
    expect(spineWidth(1000)).toBe(SPINE_MAX);
  });
  it('âm → kẹp về MIN (không vỡ)', () => expect(spineWidth(-5)).toBe(SPINE_MIN));
  it('đơn điệu tăng + phân biệt được 0 vs 5 vs 44', () => {
    const w0 = spineWidth(0), w5 = spineWidth(5), w44 = spineWidth(44);
    expect(w0).toBeLessThan(w5);
    expect(w5).toBeLessThan(w44);
    expect(w5 - w0).toBeGreaterThanOrEqual(4); // đủ khác để mắt thấy
  });
});

describe('packShelves (nhồi theo bề rộng, tràn tầng)', () => {
  it('rỗng → không tầng nào', () => expect(packShelves([], 100, 2)).toEqual([]));
  it('vừa 1 tầng', () => expect(packShelves([30, 30], 100, 2)).toEqual([[0, 1]]));
  it('tràn xuống tầng dưới khi hết chỗ', () =>
    expect(packShelves([30, 30, 30], 70, 2)).toEqual([[0, 1], [2]]));
  it('gáy rộng hơn cả kệ → đứng một mình, không kẹt', () =>
    expect(packShelves([80, 30], 70, 2)).toEqual([[0], [1]]));
  it('tính cả GAP khi xếp', () => {
    // 30+2+30+2+30 = 94 ≤ 95 → một tầng; 96 < 94? không. Thử 93 → tầng 3 tràn.
    expect(packShelves([30, 30, 30], 94, 2)).toEqual([[0, 1, 2]]);
    expect(packShelves([30, 30, 30], 93, 2)).toEqual([[0, 1], [2]]);
  });
});
