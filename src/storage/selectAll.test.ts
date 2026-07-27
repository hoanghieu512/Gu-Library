import { describe, it, expect } from 'vitest';
import { isAllSelected, toggleSelectAll, selectAllLabel } from './selectAll';

const docs = (n: number) => Array.from({ length: n }, (_, i) => `uri-${i}`);

describe('selectAll (Chọn hết / Bỏ chọn hết — B2c)', () => {
  it('chưa chọn gì → chưa hết; bấm → chọn ĐÚNG tập đang hiển thị', () => {
    const visible = docs(13);
    expect(isAllSelected(visible, new Set())).toBe(false);
    const next = toggleSelectAll(visible, new Set());
    expect(next.size).toBe(13);
    expect(isAllSelected(visible, next)).toBe(true);
  });

  it('đang chọn hết → bấm là BỎ hết (về 0)', () => {
    const visible = docs(13);
    const all = new Set(visible);
    expect(isAllSelected(visible, all)).toBe(true);
    expect(toggleSelectAll(visible, all).size).toBe(0);
  });

  it('thiếu một cái → chưa phải "hết"; bấm thì bù cho đủ', () => {
    const visible = docs(13);
    const partial = new Set(visible.slice(0, 12));
    expect(isAllSelected(visible, partial)).toBe(false);
    expect(toggleSelectAll(visible, partial).size).toBe(13);
  });

  it('tầng KHÔNG có tài liệu nào → không coi là "đã chọn hết"', () => {
    expect(isAllSelected([], new Set())).toBe(false);
    expect(toggleSelectAll([], new Set()).size).toBe(0);
  });

  it('tầng có đúng 1 tài liệu → vẫn đổi đúng hai chiều', () => {
    const visible = docs(1);
    const on = toggleSelectAll(visible, new Set());
    expect(on.size).toBe(1);
    expect(isAllSelected(visible, on)).toBe(true);
    expect(toggleSelectAll(visible, on).size).toBe(0);
  });

  it('KHÔNG đụng mục nằm ngoài tập đang hiển thị', () => {
    const visible = docs(2);
    const selected = new Set([...visible, 'uri-tang-khac']);
    // đang "hết" (mọi mục hiển thị đều có) → bỏ hết CHỈ các mục hiển thị
    expect(isAllSelected(visible, selected)).toBe(true);
    const next = toggleSelectAll(visible, selected);
    expect(next.has('uri-tang-khac')).toBe(true);
    expect(next.size).toBe(1);
  });

  it('nhãn đổi theo trạng thái — MỘT nút', () => {
    expect(selectAllLabel(false)).toBe('Chọn hết');
    expect(selectAllLabel(true)).toBe('Bỏ chọn hết');
  });
});
