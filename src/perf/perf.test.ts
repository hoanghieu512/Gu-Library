import { describe, it, expect, beforeEach } from 'vitest';
import {
  median, record, perfStats, perfReportText, perfReset, FLOW_ORDER, FLOW_LABELS,
} from './perf';

beforeEach(() => perfReset());

describe('median', () => {
  it('rỗng → 0', () => expect(median([])).toBe(0));
  it('lẻ → phần tử giữa', () => expect(median([5, 1, 3])).toBe(3));
  it('chẵn → trung bình hai giữa', () => expect(median([1, 2, 3, 4])).toBe(2.5));
  it('không đột biến mảng gốc', () => {
    const xs = [3, 1, 2];
    median(xs);
    expect(xs).toEqual([3, 1, 2]);
  });
});

describe('record', () => {
  it('bỏ NaN / âm / vô cực', () => {
    record('openMon', NaN);
    record('openMon', -5);
    record('openMon', Infinity);
    expect(perfStats().find((s) => s.flow === 'openMon')!.count).toBe(0);
  });
  it('giữ tối đa 30 mẫu gần nhất', () => {
    for (let i = 0; i < 35; i++) record('openMon', i);
    const s = perfStats().find((x) => x.flow === 'openMon')!;
    expect(s.count).toBe(30);
    expect(s.min).toBe(5);   // 0..4 bị đẩy ra
    expect(s.max).toBe(34);
    expect(s.last).toBe(34);
  });
});

describe('perfStats', () => {
  it('có đủ 6 luồng theo thứ tự, luồng chưa đo count=0', () => {
    const s = perfStats();
    expect(s.map((x) => x.flow)).toEqual(FLOW_ORDER);
    expect(s.every((x) => x.count === 0)).toBe(true);
  });
  it('tính last/min/max/median đúng', () => {
    [10, 30, 20].forEach((v) => record('zoomCommit', v));
    const s = perfStats().find((x) => x.flow === 'zoomCommit')!;
    expect(s).toMatchObject({ count: 3, last: 20, min: 10, max: 30, median: 20 });
  });
});

describe('perfReportText', () => {
  it('text thuần đọc được, có phiên bản + nhãn luồng + số đo', () => {
    record('coldStart', 812);
    const txt = perfReportText({ version: '1.7.0', mode: 'production' });
    expect(txt).toContain('1.7.0');
    expect(txt).toContain(FLOW_LABELS.coldStart);
    expect(txt).toContain('812');
    expect(txt).toContain('(chưa đo)'); // luồng chưa chạy
  });
});
