import { describe, it, expect } from 'vitest';
import { clusterSuffixes, uniqueBase } from './docCluster';

describe('docCluster', () => {
  it('clusterSuffixes lọc file cùng cụm theo base (không dính base khác)', () => {
    const names = ['luat.pdf', 'luat.json', 'luat.print.json', 'luat.display.json', 'luat2.pdf', 'khac.json'];
    expect(clusterSuffixes('luat', names).sort()).toEqual(['.display.json', '.json', '.pdf', '.print.json']);
  });
  it('uniqueBase: đích trống → giữ base', () => {
    expect(uniqueBase('luat', [], ['.pdf', '.json'])).toBe('luat');
  });
  it('uniqueBase: đích có luat.pdf → luat (1)', () => {
    expect(uniqueBase('luat', ['luat.pdf'], ['.pdf', '.json'])).toBe('luat (1)');
  });
  it('uniqueBase: né đụng mọi đuôi cụm ở đích (base + (1) đều dính → (2))', () => {
    // base "luat" đụng (luat.pdf), "luat (1)" đụng (luat (1).json) → nhảy "luat (2)"
    expect(uniqueBase('luat', ['luat.pdf', 'luat (1).json'], ['.pdf', '.json'])).toBe('luat (2)');
  });
});
