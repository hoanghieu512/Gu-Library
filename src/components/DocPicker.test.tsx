import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { getKhoSnapshot } from '../storage/khoSnapshot';
import type { KhoFolder, KhoSnapshot } from '../storage/khoSnapshot';
import type { Document } from '../storage/types';
import DocPicker from './DocPicker';

vi.mock('../storage/khoSnapshot', () => ({ getKhoSnapshot: vi.fn() }));

const doc = (base: string): Document =>
  ({ name: base, fileBase: base, pdfUri: `u:${base}.pdf`, jsonUri: `u:${base}.json`, printFlagged: false });
const folder = (name: string, docs: Document[], children: KhoFolder[], names: [string, string][] = []): KhoFolder => ({
  name, uri: `u:${name}`, entries: [],
  listing: { documents: docs, folders: children.map((c) => ({ name: c.name, uri: c.uri })), pending: [], hasPending: false },
  children, displayNames: new Map(names),
});

describe('DocPicker — rows are labelled buttons (v1.41.1)', () => {
  it('subject → folder → renamed document, each a button saying what it opens', async () => {
    const slide = folder('Slide', [doc('slide1')], [], [['slide1', '0. GIỚI THIỆU MÔN HỌC']]);
    const mon = folder('Hình sự chung', [], [slide]);
    vi.mocked(getKhoSnapshot).mockResolvedValue({
      root: 'u:root', rootEntries: [], byUri: new Map(), inboxEntries: [],
      mons: [{ name: 'Hình sự chung', uri: mon.uri, meta: {} }], monFolders: new Map([[mon.uri, mon]]),
    } as KhoSnapshot);
    const onPick = vi.fn();
    render(<DocPicker onPick={onPick} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Mở môn Hình sự chung' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mở thư mục Slide' }));
    fireEvent.click(screen.getByRole('button', { name: 'Mở 0. GIỚI THIỆU MÔN HỌC ở khung dưới' }));
    expect(onPick).toHaveBeenCalledWith('u:slide1.pdf');
  });
});
