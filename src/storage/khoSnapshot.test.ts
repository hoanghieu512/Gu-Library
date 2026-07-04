import { describe, it, expect } from 'vitest';
import { foldSummary, countFlagged, folderByPath, type KhoFolder, type KhoSnapshot } from './khoSnapshot';
import type { Document, FolderListing } from './types';

function doc(base: string, flagged = false): Document {
  return { name: base, fileBase: base, pdfUri: `u:${base}.pdf`, jsonUri: `u:${base}.json`, printFlagged: flagged };
}
function listing(docs: Document[], folders: { name: string; uri: string }[] = [], pending = 0): FolderListing {
  return { documents: docs, folders, pending: Array(pending).fill({ name: 'p', ext: 'pdf', sourceUri: 'x' }), hasPending: pending > 0 };
}
function folder(name: string, uri: string, docs: Document[], children: KhoFolder[] = [], pending = 0): KhoFolder {
  return {
    name, uri, entries: [],
    listing: listing(docs, children.map((c) => ({ name: c.name, uri: c.uri })), pending),
    children, displayNames: new Map(),
  };
}

describe('foldSummary', () => {
  it('cộng đệ quy tài liệu + chờ qua cây con', () => {
    const tree = folder('Mon', 'u:Mon', [doc('a'), doc('b')], [
      folder('Sub', 'u:Sub', [doc('c')], [
        folder('Deep', 'u:Deep', [doc('d'), doc('e')], [], 1),
      ], 2),
    ], 1);
    expect(foldSummary(tree)).toEqual({ documents: 5, pending: 4 });
  });
});

describe('countFlagged', () => {
  it('đếm cờ in đệ quy', () => {
    const tree = folder('Mon', 'u:Mon', [doc('a', true), doc('b')], [
      folder('Sub', 'u:Sub', [doc('c', true), doc('d', true)]),
    ]);
    expect(countFlagged(tree)).toBe(3);
  });
});

describe('folderByPath', () => {
  const sub = folder('Slide', 'u:Slide', [doc('x')]);
  const mon = folder('Logic', 'u:Logic', [], [sub]);
  const snap: KhoSnapshot = {
    root: 'r', rootEntries: [], mons: [{ name: 'Logic', uri: 'u:Logic', meta: {} }],
    monFolders: new Map([['u:Logic', mon]]), byUri: new Map(), inboxEntries: [],
  };
  it('đi từ tên môn xuống thư mục con', () => {
    expect(folderByPath(snap, ['Logic', 'Slide'])?.uri).toBe('u:Slide');
    expect(folderByPath(snap, ['Logic'])?.uri).toBe('u:Logic');
  });
  it('null khi không khớp', () => {
    expect(folderByPath(snap, ['Logic', 'KhongCo'])).toBeNull();
    expect(folderByPath(snap, ['SaiMon'])).toBeNull();
    expect(folderByPath(snap, [])).toBeNull();
  });
});
