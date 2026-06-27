import { describe, it, expect } from 'vitest';
import { mergeReading, upsertEntry, removeEntry } from './model';
import type { DeviceReadingFile, ReadingEntry } from './model';

const E = (path: string, page: number, at: number): ReadingEntry =>
  ({ path, name: path.split('/').pop()!.replace(/\.[^.]+$/, ''), monName: path.split('/')[0], page, total: 100, lastReadAt: at });
const F = (deviceId: string, entries: ReadingEntry[], tomb: Record<string, number> = {}): DeviceReadingFile =>
  ({ deviceId, entries: Object.fromEntries(entries.map((e) => [e.path, e])), tombstones: tomb });

describe('mergeReading', () => {
  it('union nhiều máy; mỗi path 1 lần; lấy lastReadAt mới nhất', () => {
    const r = mergeReading([F('d1', [E('m/a.pdf', 5, 10)]), F('d2', [E('m/a.pdf', 9, 20), E('m/b.pdf', 2, 15)])]);
    expect(r.map((x) => [x.path, x.page])).toEqual([['m/a.pdf', 9], ['m/b.pdf', 2]]); // sort desc theo at: a(20) > b(15)
  });
  it('tombstone mới hơn entry → ẩn', () => {
    const r = mergeReading([F('d1', [E('m/a.pdf', 5, 10)]), F('d2', [], { 'm/a.pdf': 30 })]);
    expect(r).toHaveLength(0);
  });
  it('đọc lại sau khi xoá (entry mới hơn tombstone) → hiện lại', () => {
    const r = mergeReading([F('d1', [E('m/a.pdf', 5, 40)]), F('d2', [], { 'm/a.pdf': 30 })]);
    expect(r).toHaveLength(1);
    expect(r[0].page).toBe(5);
  });
  it('sort lastReadAt giảm dần', () => {
    const r = mergeReading([F('d1', [E('m/a.pdf', 1, 10), E('m/c.pdf', 1, 99), E('m/b.pdf', 1, 50)])]);
    expect(r.map((x) => x.path)).toEqual(['m/c.pdf', 'm/b.pdf', 'm/a.pdf']);
  });
});

describe('upsertEntry', () => {
  it('clears tombstone for that path', () => {
    const file = F('d1', [], { 'm/a.pdf': 999 });
    const entry = E('m/a.pdf', 3, 100);
    const result = upsertEntry(file, entry);
    expect(result.tombstones['m/a.pdf']).toBeUndefined();
    expect(result.entries['m/a.pdf']).toEqual(entry);
  });
  it('adds entry without affecting other tombstones', () => {
    const file = F('d1', [], { 'm/b.pdf': 50 });
    const entry = E('m/a.pdf', 2, 80);
    const result = upsertEntry(file, entry);
    expect(result.tombstones['m/b.pdf']).toBe(50);
    expect(result.entries['m/a.pdf']).toEqual(entry);
  });
});

describe('removeEntry', () => {
  it('sets a tombstone with the given timestamp', () => {
    const file = F('d1', [E('m/a.pdf', 5, 10)]);
    const result = removeEntry(file, 'm/a.pdf', 999);
    expect(result.tombstones['m/a.pdf']).toBe(999);
    expect(result.entries['m/a.pdf']).toBeUndefined();
  });
  it('does not affect other entries', () => {
    const file = F('d1', [E('m/a.pdf', 5, 10), E('m/b.pdf', 2, 20)]);
    const result = removeEntry(file, 'm/a.pdf', 500);
    expect(result.entries['m/b.pdf']).toBeDefined();
  });
});
