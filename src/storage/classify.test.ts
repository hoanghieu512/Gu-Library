import { describe, it, expect } from 'vitest';
import { classifyEntries } from './classify';
import type { SafEntry } from '../plugins/saf';

const e = (name: string, isDirectory: boolean): SafEntry => ({
  name, isDirectory, uri: `content://x/${encodeURIComponent(name)}`,
});

describe('classifyEntries', () => {
  it('pairs X.pdf + X.json into one processed document', () => {
    const r = classifyEntries([e('luat.pdf', false), e('luat.json', false)]);
    expect(r.documents).toHaveLength(1);
    expect(r.documents[0].name).toBe('luat');
    expect(r.documents[0].pdfUri).toContain('luat.pdf');
    expect(r.documents[0].jsonUri).toContain('luat.json');
    expect(r.pending).toHaveLength(0);
  });

  it('treats a lone source file as pending (chờ xử lý)', () => {
    const r = classifyEntries([e('bai-tap.docx', false)]);
    expect(r.pending).toHaveLength(1);
    expect(r.pending[0].name).toBe('bai-tap.docx');
    expect(r.pending[0].ext).toBe('docx');
    expect(r.documents).toHaveLength(0);
  });

  it('treats a pdf without sidecar as pending', () => {
    const r = classifyEntries([e('slide.pdf', false)]);
    expect(r.pending).toHaveLength(1);
    expect(r.pending[0].ext).toBe('pdf');
    expect(r.documents).toHaveLength(0);
  });

  it('excludes _mon.json from documents and pending', () => {
    const r = classifyEntries([e('_mon.json', false), e('luat.pdf', false), e('luat.json', false)]);
    expect(r.documents).toHaveLength(1);
    expect(r.pending).toHaveLength(0);
  });

  it('collects subfolders separately', () => {
    const r = classifyEntries([e('Chương 1', true), e('luat.pdf', false), e('luat.json', false)]);
    expect(r.folders.map((f) => f.name)).toEqual(['Chương 1']);
    expect(r.documents).toHaveLength(1);
  });

  it('skips hidden (dot) folders like .stfolder / .stversions', () => {
    const r = classifyEntries([
      e('.stfolder', true), e('.stversions', true), e('Chương 1', true),
    ]);
    expect(r.folders.map((f) => f.name)).toEqual(['Chương 1']);
  });

  it('sets hasPending true when any pending exists at this level', () => {
    const r = classifyEntries([e('x.docx', false)]);
    expect(r.hasPending).toBe(true);
  });

  it('hasPending false when only processed pairs', () => {
    const r = classifyEntries([e('a.pdf', false), e('a.json', false)]);
    expect(r.hasPending).toBe(false);
  });

  it('ignores hidden/system files starting with dot except _mon.json handled above', () => {
    const r = classifyEntries([e('.DS_Store', false), e('a.pdf', false), e('a.json', false)]);
    expect(r.documents).toHaveLength(1);
    expect(r.pending).toHaveLength(0);
  });

  it('ignores _reading-abc.json (and all _-prefixed files) — not document or pending', () => {
    const r = classifyEntries([
      e('_reading-abc.json', false),
      e('_mon.json', false),
      e('luat.pdf', false),
      e('luat.json', false),
    ]);
    expect(r.documents).toHaveLength(1);
    expect(r.pending).toHaveLength(0);
  });

  it('sorts folders alphabetically (vi locale)', () => {
    const r = classifyEntries([
      e('Chương 3', true),
      e('An Giang', true),
      e('Bình Dương', true),
    ]);
    expect(r.folders.map((f) => f.name)).toEqual(['An Giang', 'Bình Dương', 'Chương 3']);
  });

  it('sorts documents alphabetically (vi locale)', () => {
    const r = classifyEntries([
      e('z-bai.pdf', false), e('z-bai.json', false),
      e('a-bai.pdf', false), e('a-bai.json', false),
      e('m-bai.pdf', false), e('m-bai.json', false),
    ]);
    expect(r.documents.map((d) => d.name)).toEqual(['a-bai', 'm-bai', 'z-bai']);
  });

  it('skips <base>.print.json — không thành document hay pending', () => {
    const r = classifyEntries([
      e('luat.pdf', false), e('luat.json', false), e('luat.print.json', false),
    ]);
    expect(r.documents).toHaveLength(1);
    expect(r.pending).toHaveLength(0);
  });

  it('gắn printFlagged=true cho document có companion .print.json', () => {
    const r = classifyEntries([
      e('luat.pdf', false), e('luat.json', false), e('luat.print.json', false),
    ]);
    expect(r.documents[0].printFlagged).toBe(true);
  });

  it('printFlagged=false khi không có companion', () => {
    const r = classifyEntries([e('luat.pdf', false), e('luat.json', false)]);
    expect(r.documents[0].printFlagged).toBe(false);
  });
});
