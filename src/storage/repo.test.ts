import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SafNative } from '../plugins/safNative';
import { fakeKho, ROOT, type FakeKho } from '../test/fakeSaf';
import { KhoUnreadableError, KHO_UNREADABLE_MESSAGE } from './khoHidden';
import { createMon, createSubfolder, setMonColor } from './repo';

const prefs = vi.hoisted(() => new Map<string, string>());
vi.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: async ({ key }: { key: string }) => ({ value: prefs.get(key) ?? null }),
    set: async ({ key, value }: { key: string; value: string }) => { prefs.set(key, value); },
    remove: async ({ key }: { key: string }) => { prefs.delete(key); },
  },
}));
vi.mock('../plugins/safNative', () => ({ SafNative: {} }));

let kho: FakeKho;
let mon: string;
beforeEach(() => {
  prefs.clear();
  prefs.set('saf_root_uri', ROOT);
  kho = fakeKho();
  Object.assign(SafNative, kho.saf);
  mon = kho.mkdir('Logic');
  kho.mkdir('Logic/Slide');
  kho.put('Logic/_mon.json', JSON.stringify({ color: '#111111', order: 2 }));
});

const hide = () => { kho.state.hideAll = true; kho.state.rejectHidden = true; };

describe('createSubfolder', () => {
  it('creates a new folder', async () => {
    await createSubfolder(mon, 'Đề thi');
    expect(kho.dirNames(mon)).toEqual(['Slide', 'Đề thi']);
  });

  // The old plugin handed back "Slide (1)" when the listing hid "Slide".
  it('refuses a hidden kho with a message Gú can act on, and makes no copy', async () => {
    hide();
    const err = await createSubfolder(mon, 'Slide').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(KhoUnreadableError);
    expect((err as Error).message).toBe(KHO_UNREADABLE_MESSAGE);
    expect(kho.dirNames(mon)).toEqual(['Slide']);
  });
});

describe('createMon', () => {
  it('refuses a hidden kho and makes no copy of the subject', async () => {
    hide();
    await expect(createMon('Logic', '#222222')).rejects.toBeInstanceOf(KhoUnreadableError);
    expect(kho.dirNames()).toEqual(['Logic']);
  });
});

describe('setMonColor', () => {
  it('keeps the other settings of the subject', async () => {
    await setMonColor(mon, '#333333');
    const { entries } = await SafNative.listFolder!({ uri: mon });
    const f = entries.find((e) => e.name === '_mon.json')!;
    expect(JSON.parse((await SafNative.readFile!({ uri: f.uri })).data)).toEqual({ color: '#333333', order: 2 });
  });

  // The old plugin wrote "_mon (1).json" holding only the colour, next to the real _mon.json.
  it('refuses a hidden kho and writes no second _mon.json', async () => {
    hide();
    await expect(setMonColor(mon, '#333333')).rejects.toBeInstanceOf(KhoUnreadableError);
    expect(kho.fileNames(mon)).toEqual(['_mon.json']);
  });
});
