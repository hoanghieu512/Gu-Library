import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Saf } from '../plugins/saf';
import { fakeKho, ROOT, type FakeKho } from '../test/fakeSaf';
import { KhoUnreadableError } from '../storage/khoHidden';
import { recordProgress } from './store';

const prefs = vi.hoisted(() => new Map<string, string>());
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: async ({ key }: { key: string }) => ({ value: prefs.get(key) ?? null }),
    set: async ({ key, value }: { key: string; value: string }) => { prefs.set(key, value); },
    remove: async ({ key }: { key: string }) => { prefs.delete(key); },
  },
}));
vi.mock('../plugins/saf', () => ({ Saf: {} }));

const FILE = '_reading-dev.json';
let kho: FakeKho;
let doc: string;
beforeEach(() => {
  prefs.clear();
  prefs.set('saf_root_uri', ROOT);
  prefs.set('device_id', 'dev');
  kho = fakeKho();
  Object.assign(Saf, kho.saf);
  doc = kho.put('Logic/bai1.pdf');
  kho.put('Logic/bai1.json', '{}');
  kho.mkdir('_inbox');
  kho.put(FILE, JSON.stringify({ deviceId: 'dev', entries: {}, tombstones: {} }));
});

const entriesOf = async () => {
  const { entries } = await Saf.listFolder!({ uri: ROOT });
  const f = entries.find((e) => e.name === FILE)!;
  return JSON.parse((await Saf.readFile!({ uri: f.uri })).data).entries;
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
