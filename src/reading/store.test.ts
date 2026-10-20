import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SafNative } from '../plugins/safNative';
import { fakeKho, ROOT, type FakeKho } from '../test/fakeSaf';
import { KhoUnreadableError } from '../storage/khoHidden';
import { recordProgress, recordProgressBestEffort } from './store';

const prefs = vi.hoisted(() => new Map<string, string>());
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: async ({ key }: { key: string }) => ({ value: prefs.get(key) ?? null }),
    set: async ({ key, value }: { key: string; value: string }) => { prefs.set(key, value); },
    remove: async ({ key }: { key: string }) => { prefs.delete(key); },
  },
}));
vi.mock('../plugins/safNative', () => ({ SafNative: {} }));

const FILE = '_reading-dev.json';
let kho: FakeKho;
let doc: string;
beforeEach(() => {
  prefs.clear();
  prefs.set('saf_root_uri', ROOT);
  prefs.set('device_id', 'dev');
  kho = fakeKho();
  Object.assign(SafNative, kho.saf);
  doc = kho.put('Logic/bai1.pdf');
  kho.put('Logic/bai1.json', '{}');
  kho.mkdir('_inbox');
  kho.put(FILE, JSON.stringify({ deviceId: 'dev', entries: {}, tombstones: {} }));
});

const entriesOf = async () => {
  const { entries } = await SafNative.listFolder!({ uri: ROOT });
  const f = entries.find((e) => e.name === FILE)!;
  return JSON.parse((await SafNative.readFile!({ uri: f.uri })).data).entries;
};

describe('recordProgress', () => {
  it('saves the page into this phone’s reading file', async () => {
    await recordProgress(doc, 3, 10);
    expect(kho.fileNames()).toEqual([FILE]);
    expect((await entriesOf())['Logic/bai1.pdf'].page).toBe(3);
  });

  // While the provider hid the kho (dGen1, 2026-10-17) the reading file listed as missing, so the
  // old app wrote a fresh one and the provider named it "_reading-dev (1).json".
  it('refuses a kho that lists nothing, and writes no second reading file', async () => {
    kho.state.hideAll = true;
    await expect(recordProgress(doc, 3, 10)).rejects.toBeInstanceOf(KhoUnreadableError);
    expect(kho.fileNames()).toEqual([FILE]);
  });

  it('refuses a kho when the plugin reports a file it cannot see', async () => {
    kho.state.hideAll = true;
    kho.state.rejectHidden = true;
    await expect(recordProgress(doc, 3, 10)).rejects.toBeInstanceOf(KhoUnreadableError);
    expect(kho.fileNames()).toEqual([FILE]);
  });
});

// Each page turn saves progress. While the kho is hidden, finding that out takes an ensureDir that
// makes a real "_inbox (1)" on disk and removes it again, which Syncthing may pick up.
describe('recordProgress, page after page while the kho is hidden', () => {
  it('never probes it with a folder', async () => {
    kho.state.hideAll = true;
    kho.state.rejectHidden = true;
    const ensure = vi.spyOn(SafNative, 'ensureDir');
    await expect(recordProgress(doc, 3, 10)).rejects.toBeInstanceOf(KhoUnreadableError);
    await expect(recordProgress(doc, 4, 10)).rejects.toBeInstanceOf(KhoUnreadableError);
    await expect(recordProgress(doc, 5, 10)).rejects.toBeInstanceOf(KhoUnreadableError);
    expect(ensure).not.toHaveBeenCalled();
  });

  it('writes again once the kho lists', async () => {
    kho.state.hideAll = true;
    kho.state.rejectHidden = true;
    await expect(recordProgress(doc, 3, 10)).rejects.toBeInstanceOf(KhoUnreadableError);
    kho.state.hideAll = false;
    await recordProgress(doc, 4, 10);
    expect((await entriesOf())['Logic/bai1.pdf'].page).toBe(4);
  });
});

// The Viewer saves on every page turn and reading must go on when a save fails.
describe('recordProgressBestEffort', () => {
  it('stays silent about a hidden kho, which Home tells Gú about', async () => {
    kho.state.hideAll = true;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(recordProgressBestEffort(doc, 3, 10)).resolves.toBeUndefined();
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  // It used to swallow every failure, so a bug in saving "Đang đọc dở" left no trace anywhere.
  it('logs any other failure instead of dropping it', async () => {
    const boom = new Error('write failed: disk full');
    SafNative.writeFile = async () => { throw boom; };
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(recordProgressBestEffort(doc, 3, 10)).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledWith(expect.any(String), boom);
    warn.mockRestore();
  });

  it('saves the page when nothing fails', async () => {
    await recordProgressBestEffort(doc, 3, 10);
    expect((await entriesOf())['Logic/bai1.pdf'].page).toBe(3);
  });
});
