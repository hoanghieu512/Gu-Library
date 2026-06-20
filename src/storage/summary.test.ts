import { describe, it, expect } from 'vitest';
import { accumulate, type FolderLister } from './summary';
import type { FolderListing } from './types';

// Giả lập cây bằng map uri -> listing (không gọi SAF thật).
function makeLister(tree: Record<string, FolderListing>): FolderLister {
  return async (uri: string) => tree[uri] ?? { folders: [], documents: [], pending: [], hasPending: false };
}
const L = (o: Partial<FolderListing>): FolderListing =>
  ({ folders: [], documents: [], pending: [], hasPending: false, ...o });

describe('accumulate (đếm tài liệu + chờ xử lý đệ quy)', () => {
  it('counts docs + pending at one level', async () => {
    const lister = makeLister({
      'mon': L({ documents: [{ name: 'a', pdfUri: 'p', jsonUri: 'j' }], pending: [{ name: 'x.docx', ext: 'docx', sourceUri: 's' }], hasPending: true }),
    });
    expect(await accumulate('mon', lister)).toEqual({ documents: 1, pending: 1 });
  });
  it('recurses into subfolders (arbitrary depth)', async () => {
    const lister = makeLister({
      'mon': L({ folders: [{ name: 'Chương 1', uri: 'c1' }], documents: [{ name: 'a', pdfUri: 'p', jsonUri: 'j' }] }),
      'c1': L({ folders: [{ name: 'Buổi 2', uri: 'b2' }], documents: [{ name: 'b', pdfUri: 'p', jsonUri: 'j' }] }),
      'b2': L({ documents: [{ name: 'c', pdfUri: 'p', jsonUri: 'j' }], pending: [{ name: 'y.pptx', ext: 'pptx', sourceUri: 's' }], hasPending: true }),
    });
    expect(await accumulate('mon', lister)).toEqual({ documents: 3, pending: 1 });
  });
  it('zero for empty folder', async () => {
    expect(await accumulate('empty', makeLister({}))).toEqual({ documents: 0, pending: 0 });
  });
});
