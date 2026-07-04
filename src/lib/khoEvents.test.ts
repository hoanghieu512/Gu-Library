import { describe, it, expect, beforeEach } from 'vitest';
import { emitKhoChanged, onKhoChanged, coalesceKhoChanged } from './khoEvents';

describe('coalesceKhoChanged', () => {
  let count: number;
  let off: () => void;
  beforeEach(() => { count = 0; off = onKhoChanged(() => { count += 1; }); });

  it('gom N emit trong lô thành 1 phát ở cuối', async () => {
    await coalesceKhoChanged(async () => {
      emitKhoChanged(); emitKhoChanged(); emitKhoChanged();
      expect(count).toBe(0); // chưa phát giữa lô
    });
    expect(count).toBe(1);
    off();
  });

  it('không emit nào trong lô → không phát', async () => {
    await coalesceKhoChanged(async () => { /* no-op */ });
    expect(count).toBe(0);
    off();
  });

  it('lồng nhau → vẫn đúng 1 phát ở lớp ngoài cùng', async () => {
    await coalesceKhoChanged(async () => {
      emitKhoChanged();
      await coalesceKhoChanged(async () => { emitKhoChanged(); });
      expect(count).toBe(0);
    });
    expect(count).toBe(1);
    off();
  });

  it('lỗi giữa chừng vẫn phát phần đã gom (finally)', async () => {
    await expect(coalesceKhoChanged(async () => {
      emitKhoChanged();
      throw new Error('boom');
    })).rejects.toThrow('boom');
    expect(count).toBe(1);
    off();
  });

  it('emit NGOÀI lô → phát ngay', () => {
    emitKhoChanged();
    expect(count).toBe(1);
    off();
  });
});
