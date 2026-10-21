import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SafNative } from '../plugins/safNative';
import { fakeKho, ROOT, type FakeKho } from '../test/fakeSaf';
import { KhoUnreadableError } from '../plugins/khoUnreadable';
import { setDisplayName } from './docRepo';
import { prefs } from '../test/fakePreferences';

vi.mock('@capacitor/preferences', () => import('../test/fakePreferences'));
vi.mock('../plugins/safNative', () => ({ SafNative: {} }));

let kho: FakeKho;
let mon: string;
beforeEach(() => {
  prefs.clear();
  prefs.set('saf_root_uri', ROOT);
  kho = fakeKho();
  Object.assign(SafNative, kho.saf);
  mon = kho.mkdir('Logic');
  kho.put('Logic/bai1.pdf');
  kho.put('Logic/bai1.json', '{}');
  kho.put('Logic/bai1.display.json', JSON.stringify({ name: 'Bài 1' }));
});

describe('setDisplayName', () => {
  it('replaces the name already set', async () => {
    await setDisplayName(mon, 'bai1', 'Bài một');
    expect(kho.fileNames(mon)).toEqual(['bai1.display.json', 'bai1.json', 'bai1.pdf']);
  });

  it('refuses a hidden kho and writes no second name file', async () => {
    kho.state.hideAll = true;
    kho.state.rejectHidden = true;
    await expect(setDisplayName(mon, 'bai1', 'Bài một')).rejects.toBeInstanceOf(KhoUnreadableError);
    expect(kho.fileNames(mon)).toEqual(['bai1.display.json', 'bai1.json', 'bai1.pdf']);
  });
});
