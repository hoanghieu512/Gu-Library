import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SafNative } from '../plugins/safNative';
import { fakeKho, ROOT, type FakeKho } from '../test/fakeSaf';
import { importBatch } from './inboxRepo';
import { prefs } from '../test/fakePreferences';

vi.mock('@capacitor/preferences', () => import('../test/fakePreferences'));
vi.mock('../plugins/safNative', () => ({ SafNative: {} }));

let kho: FakeKho;
beforeEach(() => {
  prefs.clear();
  prefs.set('saf_root_uri', ROOT);
  kho = fakeKho();
  Object.assign(SafNative, kho.saf);
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
    const copy = vi.spyOn(SafNative, 'copyToDir');
    const r = await importBatch([FILE, { ...FILE, name: 'b.pdf' }], ['Logic']);
    expect(r).toEqual({ ok: 0, fails: [], khoUnreadable: { left: ['a.pdf', 'b.pdf'] } });
    expect(copy).not.toHaveBeenCalled();
  });

  it('refuses a kho when the plugin reports a folder it cannot see', async () => {
    kho.mkdir('_inbox');
    kho.state.hideAll = true;
    kho.state.rejectHidden = true;
    const copy = vi.spyOn(SafNative, 'copyToDir');
    const r = await importBatch([FILE], ['Logic']);
    expect(r).toEqual({ ok: 0, fails: [], khoUnreadable: { left: ['a.pdf'] } });
    expect(copy).not.toHaveBeenCalled();
    expect(kho.dirNames()).toEqual(['_inbox']);
  });

  // Review of 18/10: the error that stopped the batch lost how many files were already in, so Gú
  // would share all of them again after the restart and get "[Môn] x (1).pdf" for those.
  it('stops when the kho goes hidden mid-batch and says which files did not go in', async () => {
    const inbox = kho.mkdir('_inbox');
    const copy = SafNative.copyToDir;
    let n = 0;
    SafNative.copyToDir = async (o) => {
      if (++n === 2) throw Object.assign(new Error("'x' is there but the provider does not list it"), { code: 'KHO_HIDDEN' });
      return copy(o);
    };
    const files = [FILE, { ...FILE, name: 'b.pdf' }, { ...FILE, name: 'c.pdf' }];
    const r = await importBatch(files, ['Logic']);
    expect(r).toEqual({ ok: 1, fails: [], khoUnreadable: { left: ['b.pdf', 'c.pdf'] } });
    expect(kho.fileNames(inbox)).toHaveLength(1);
  });

  // Review of 18/10: every file cost an ensureDir and a root listing before its copy.
  it('looks up the _inbox once for the whole batch', async () => {
    kho.mkdir('_inbox');
    const ensure = vi.spyOn(SafNative, 'ensureDir');
    const r = await importBatch([FILE, { ...FILE, name: 'b.pdf' }, { ...FILE, name: 'c.pdf' }], ['Logic']);
    expect(r.ok).toBe(3);
    expect(ensure).toHaveBeenCalledTimes(1);
  });

  // The worker or Syncthing may remove _inbox and make it again while a batch runs.
  it('looks the _inbox up again for the next file after a copy fails', async () => {
    kho.mkdir('_inbox');
    const ensure = vi.spyOn(SafNative, 'ensureDir');
    const copy = SafNative.copyToDir;
    let n = 0;
    SafNative.copyToDir = async (o) => { if (n++ === 0) throw new Error('not a directory'); return copy(o); };
    const r = await importBatch([FILE, { ...FILE, name: 'b.pdf' }], ['Logic']);
    expect(r).toEqual({ ok: 1, fails: ['a.pdf'] });
    expect(ensure).toHaveBeenCalledTimes(2);
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
    const copy = SafNative.copyToDir;
    let n = 0;
    SafNative.copyToDir = async (o) => { if (n++ === 0) throw new Error('source gone'); return copy(o); };
    const r = await importBatch([FILE, { ...FILE, name: 'b.pdf' }], ['Logic']);
    expect(r).toEqual({ ok: 1, fails: ['a.pdf'] });
  });
});
