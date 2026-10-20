import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SafNative } from '../plugins/safNative';
import { fakeKho, ROOT, type FakeKho } from '../test/fakeSaf';
import { KhoUnreadableError } from '../storage/khoHidden';
import { listPrintRows, gomToPrint } from './printRepo';

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
let printDir: string;
beforeEach(() => {
  prefs.clear();
  prefs.set('saf_root_uri', ROOT);
  kho = fakeKho();
  Object.assign(SafNative, kho.saf);
  kho.put('Logic/bai1.pdf');
  kho.put('Logic/bai1.json', '{}');
  kho.put('Logic/bai1.print.json', '{}');
  printDir = kho.mkdir('_print');
});

describe('listPrintRows', () => {
  it('lists flagged documents against the existing _print', async () => {
    const rows = await listPrintRows();
    expect(rows.map((r) => [r.monName, r.fileBase, r.sent])).toEqual([['Logic', 'bai1', false]]);
    expect(kho.dirNames()).toEqual(['Logic', '_print']);
  });

  // dGen1, 2026-10-17: opening "Đi in" while the provider hid the kho made a new "_print (1)"
  // each time and showed an empty list as if nothing needed printing.
  it('refuses a kho that does not list its _print', async () => {
    kho.state.hideAll = true;
    await expect(listPrintRows()).rejects.toBeInstanceOf(KhoUnreadableError);
  });

  it('refuses a kho when the plugin reports a folder it cannot see', async () => {
    kho.state.hideAll = true;
    kho.state.rejectHidden = true;
    await expect(listPrintRows()).rejects.toBeInstanceOf(KhoUnreadableError);
    expect(kho.dirNames()).toEqual(['Logic', '_print']);
  });
});

describe('gomToPrint', () => {
  it('copies flagged documents into the existing _print', async () => {
    expect(await gomToPrint()).toBe(1);
    expect(kho.fileNames(printDir)).toEqual(['[Logic] bai1.pdf']);
    expect(kho.dirNames()).toEqual(['Logic', '_print']);
  });

  it('copies nothing when the kho does not list its folders', async () => {
    kho.state.hideAll = true;
    const copy = vi.spyOn(SafNative, 'copyToDir');
    await expect(gomToPrint()).rejects.toBeInstanceOf(KhoUnreadableError);
    expect(copy).not.toHaveBeenCalled();
  });
});
