import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SafNative } from '../plugins/safNative';
import { fakeKho, ROOT, type FakeKho } from '../test/fakeSaf';
import { prefs } from '../test/fakePreferences';
import { invalidateKho } from '../storage/khoSnapshot';
import { loadToc } from './loadToc';

vi.mock('@capacitor/preferences', () => import('../test/fakePreferences'));
vi.mock('../plugins/safNative', () => ({ SafNative: {} }));

const legal = {
  schemaVersion: 1, title: 'Luật DN', kind: 'legal', pageCount: 4,
  units: [
    { type: 'dieu', label: 'Điều 1', path: ['Chương I', 'Điều 1'], page: 1, text: 'Điều 1. Phạm vi điều chỉnh' },
    { type: 'khoan', label: 'Khoản 1', path: ['Chương I', 'Điều 1'], page: 1, text: '1. Luật này quy định...' },
    { type: 'dieu', label: 'Điều 2', path: ['Chương I', 'Điều 2'], page: 3, text: 'Điều 2. Đối tượng áp dụng' },
  ],
};
const slides = {
  schemaVersion: 1, title: 'Slide', kind: 'slide', pageCount: 2,
  units: [{ type: 'slide', label: 'Slide 1', path: [], page: 1, text: 'Mở đầu' }],
};

let kho: FakeKho;
beforeEach(() => {
  prefs.clear();
  prefs.set('saf_root_uri', ROOT);
  kho = fakeKho();
  Object.assign(SafNative, kho.saf);
  invalidateKho();
});

function seed(sidecar: string) {
  const pdf = kho.put('Luật/Luật DN.pdf', '%PDF');
  kho.put('Luật/Luật DN.json', sidecar);
  return pdf;
}

describe('loadToc', () => {
  it('reads the Điều of the document', async () => {
    const pdf = seed(JSON.stringify(legal));
    expect((await loadToc(pdf))?.map((e) => e.label)).toEqual(['Điều 1', 'Điều 2']);
  });

  it('an empty list for a document without Điều', async () => {
    expect(await loadToc(seed(JSON.stringify(slides)))).toEqual([]);
  });

  it('null when the kho does not have the document', async () => {
    seed(JSON.stringify(legal));
    expect(await loadToc('content://nope.pdf')).toBeNull();
  });

  it('null for a broken sidecar', async () => {
    expect(await loadToc(seed('{oops'))).toBeNull();
  });

  it('null while Android hides the kho', async () => {
    const pdf = seed(JSON.stringify(legal));
    kho.state.hideAll = true;
    await expect(loadToc(pdf)).resolves.toBeNull();
  });
});
