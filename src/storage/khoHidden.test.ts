import { describe, it, expect, vi } from 'vitest';
import { khoWrite, KhoUnreadableError, KHO_UNREADABLE_MESSAGE } from './khoHidden';

vi.mock('../plugins/saf', () => ({ Saf: {} }));

describe('khoWrite', () => {
  it('turns KHO_HIDDEN into KhoUnreadableError with the message for Gú', async () => {
    const hidden = Object.assign(new Error("'_mon.json' is on disk but the provider does not list it"), { code: 'KHO_HIDDEN' });
    const err = await khoWrite(Promise.reject(hidden)).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(KhoUnreadableError);
    expect((err as KhoUnreadableError).message).toBe(KHO_UNREADABLE_MESSAGE);
    expect((err as KhoUnreadableError).detail).toBe(hidden.message);
  });

  it('passes any other failure through unchanged', async () => {
    const boom = new Error('write failed: disk full');
    await expect(khoWrite(Promise.reject(boom))).rejects.toBe(boom);
  });

  // Reading `.code` off a rejection that is not an object used to throw a TypeError instead.
  it('passes a rejection that is not an object through unchanged', async () => {
    await expect(khoWrite(Promise.reject(undefined))).rejects.toBeUndefined();
    await expect(khoWrite(Promise.reject(null))).rejects.toBeNull();
  });
});
