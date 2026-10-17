import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Saf } from '../plugins/saf';
import { fakeKho, ROOT, type FakeKho } from '../test/fakeSaf';
import { KhoUnreadableError } from '../storage/khoHidden';
import { importBatch } from './inboxRepo';

const prefs = vi.hoisted(() => new Map<string, string>());
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: async ({ key }: { key: string }) => ({ value: prefs.get(key) ?? null }),
    set: async ({ key, value }: { key: string; value: string }) => { prefs.set(key, value); },
    remove: async ({ key }: { key: string }) => { prefs.delete(key); },
  },
}));
vi.mock('../plugins/saf', () => ({ Saf: {} }));

let kho: FakeKho;
beforeEach(() => {
  prefs.clear();
  prefs.set('saf_root_uri', ROOT);
  kho = fakeKho();
  Object.assign(Saf, kho.saf);
});

const FILE = { uri: 'content://share/a.pdf', name: 'a.pdf' };

describe('importBatch', () => {
  it('copies into the existing _inbox', async () => {
    const inbox = kho.mkdir('_inbox');
    const r = await importBatch([FILE], ['Logic']);
    expect(r.ok).toBe(1);
    expect(kho.dirNames()).toEqual(['_inbox']);
    expect(kho.fileNames(inbox)).toHaveLength(1);
  });

  // dGen1, 2026-10-17: the provider hid the kho but still created folders, so the old app
  // copied shared files into a new "_inbox (1)" that the worker on Atomman never reads.
  it('refuses a kho that does not list its _inbox, and copies nothing', async () => {
    kho.mkdir('_inbox');
    kho.state.hideAll = true;
    const copy = vi.spyOn(Saf, 'copyToDir');
    await expect(importBatch([FILE, { ...FILE, name: 'b.pdf' }], ['Logic'])).rejects.toBeInstanceOf(KhoUnreadableError);
    expect(copy).not.toHaveBeenCalled();
  });

  it('refuses a kho when the plugin reports a folder it cannot see', async () => {
    kho.mkdir('_inbox');
    kho.state.hideAll = true;
    kho.state.rejectHidden = true;
    const copy = vi.spyOn(Saf, 'copyToDir');
    await expect(importBatch([FILE], ['Logic'])).rejects.toBeInstanceOf(KhoUnreadableError);
    expect(copy).not.toHaveBeenCalled();
    expect(kho.dirNames()).toEqual(['_inbox']);
  });

  // UBS1's disk ignores case: an "_Inbox" there is the _inbox the worker reads, not a hidden kho.
  it('uses an _inbox spelled in another case', async () => {
    const inbox = kho.mkdir('_Inbox');
    kho.state.caseInsensitive = true;
    const r = await importBatch([FILE], ['Logic']);
    expect(r.ok).toBe(1);
    expect(kho.dirNames()).toEqual(['_Inbox']);
    expect(kho.fileNames(inbox)).toHaveLength(1);
  });

  it('still counts any other per-file failure and carries on', async () => {
    kho.mkdir('_inbox');
    const copy = Saf.copyToDir;
    let n = 0;
    Saf.copyToDir = async (o) => { if (n++ === 0) throw new Error('source gone'); return copy(o); };
    const r = await importBatch([FILE, { ...FILE, name: 'b.pdf' }], ['Logic']);
    expect(r).toEqual({ ok: 1, fails: ['a.pdf'] });
  });
});
