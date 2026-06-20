import type { SafEntry } from '../plugins/saf';
import type { Document, PendingDoc, SubFolder, FolderListing } from './types';

const MON_JSON = '_mon.json';

function splitExt(name: string): { base: string; ext: string } {
  const i = name.lastIndexOf('.');
  if (i <= 0) return { base: name, ext: '' };
  return { base: name.slice(0, i), ext: name.slice(i + 1).toLowerCase() };
}

export function classifyEntries(entries: SafEntry[]): FolderListing {
  const folders: SubFolder[] = [];
  const byBase = new Map<string, { pdf?: SafEntry; json?: SafEntry; others: SafEntry[] }>();

  for (const en of entries) {
    if (en.isDirectory) {
      // Bỏ qua folder ẩn (vd .stfolder / .stversions do Syncthing tạo).
      if (en.name.startsWith('.')) continue;
      folders.push({ name: en.name, uri: en.uri });
      continue;
    }
    const name = en.name;
    if (name === MON_JSON) continue;
    if (name.startsWith('.')) continue;
    const { base, ext } = splitExt(name);
    const slot = byBase.get(base) ?? { others: [] };
    if (ext === 'pdf') slot.pdf = en;
    else if (ext === 'json') slot.json = en;
    else slot.others.push(en);
    byBase.set(base, slot);
  }

  const documents: Document[] = [];
  const pending: PendingDoc[] = [];

  for (const [base, slot] of byBase) {
    if (slot.pdf && slot.json) {
      documents.push({ name: base, pdfUri: slot.pdf.uri, jsonUri: slot.json.uri });
      for (const o of slot.others) {
        pending.push({ name: o.name, ext: splitExt(o.name).ext, sourceUri: o.uri });
      }
    } else {
      if (slot.pdf) pending.push({ name: slot.pdf.name, ext: 'pdf', sourceUri: slot.pdf.uri });
      for (const o of slot.others) {
        pending.push({ name: o.name, ext: splitExt(o.name).ext, sourceUri: o.uri });
      }
    }
  }

  return { folders, documents, pending, hasPending: pending.length > 0 };
}
