import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Saf } from './saf';
import { SafNative } from './safNative';
import { KhoUnreadableError, KHO_UNREADABLE_MESSAGE } from './khoUnreadable';

vi.mock('./safNative', () => ({ SafNative: {} }));

const hidden = () =>
  Object.assign(new Error("'_mon.json' is on disk but the provider does not list it"), { code: 'KHO_HIDDEN' });

beforeEach(() => {
  for (const k of Object.keys(SafNative)) delete (SafNative as unknown as Record<string, unknown>)[k];
});

describe('Saf', () => {
  it('turns KHO_HIDDEN into KhoUnreadableError with the message for Gú', async () => {
    const native = hidden();
    Object.assign(SafNative, { writeFile: async () => { throw native; } });
    const err = await Saf.writeFile({ dirUri: 'd', name: '_mon.json', content: '{}' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(KhoUnreadableError);
    expect((err as KhoUnreadableError).message).toBe(KHO_UNREADABLE_MESSAGE);
    expect((err as KhoUnreadableError).detail).toBe(native.message);
  });

  // Review of 20/10: the stack pointed at the wrapper and nothing said which call failed.
  it('keeps the native error as the cause', async () => {
    const native = hidden();
    Object.assign(SafNative, { writeFile: async () => { throw native; } });
    const err = await Saf.writeFile({ dirUri: 'd', name: '_mon.json', content: '{}' }).catch((e: unknown) => e);
    expect((err as KhoUnreadableError).cause).toBe(native);
  });

  it('still has a detail when the native rejection carries no message', async () => {
    Object.assign(SafNative, { ensureDir: async () => { throw { code: 'KHO_HIDDEN' }; } });
    const err = await Saf.ensureDir({ parentUri: 'p', name: '_inbox' }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(KhoUnreadableError);
    expect((err as KhoUnreadableError).detail).toBe('KHO_HIDDEN');
  });

  // When each caller wrapped its own call, reading/migrate.ts and folderRepo's renameDir were missed.
  it('does it for every call, not only the ones a caller remembered to wrap', async () => {
    Object.assign(SafNative, {
      renameDir: async () => { throw hidden(); },
      copyToDir: async () => { throw hidden(); },
      ensureDir: async () => { throw hidden(); },
      createDir: async () => { throw hidden(); },
    });
    await expect(Saf.renameDir({ uri: 'u', newName: 'n' })).rejects.toBeInstanceOf(KhoUnreadableError);
    await expect(Saf.copyToDir({ srcUri: 's', dirUri: 'd', name: 'n' })).rejects.toBeInstanceOf(KhoUnreadableError);
    await expect(Saf.ensureDir({ parentUri: 'p', name: '_inbox' })).rejects.toBeInstanceOf(KhoUnreadableError);
    await expect(Saf.createDir({ parentUri: 'p', name: 'Slide' })).rejects.toBeInstanceOf(KhoUnreadableError);
  });

  it('passes any other failure through unchanged', async () => {
    const boom = new Error('write failed: disk full');
    Object.assign(SafNative, { writeFile: async () => { throw boom; } });
    await expect(Saf.writeFile({ dirUri: 'd', name: 'n', content: '' })).rejects.toBe(boom);
  });

  // Reading `.code` off a rejection that is not an object used to throw a TypeError instead.
  it('passes a rejection that is not an object through unchanged', async () => {
    Object.assign(SafNative, { deleteFile: async () => { throw undefined; }, readFile: async () => { throw null; } });
    await expect(Saf.deleteFile({ uri: 'u' })).rejects.toBeUndefined();
    await expect(Saf.readFile({ uri: 'u' })).rejects.toBeNull();
  });

  it('resolves with what the plugin resolves', async () => {
    Object.assign(SafNative, { createDir: async () => ({ uri: 'content://x', name: 'Slide' }) });
    await expect(Saf.createDir({ parentUri: 'p', name: 'Slide' })).resolves.toEqual({ uri: 'content://x', name: 'Slide' });
  });

  // Tests swap the native methods after import (Object.assign, vi.spyOn), so Saf must look them up per call.
  it('calls the native method as it is at call time', async () => {
    Object.assign(SafNative, { listFolder: async () => ({ entries: [] }) });
    const list = vi.spyOn(SafNative, 'listFolder');
    await Saf.listFolder({ uri: 'root' });
    expect(list).toHaveBeenCalledWith({ uri: 'root' });
  });
});
