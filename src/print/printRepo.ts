import { Saf } from '../plugins/saf';
import { getRootUri } from '../storage/repo';
import { relPathFromUris } from '../reading/paths';
import { classifyEntries } from '../storage/classify';
import { emitKhoChanged } from '../lib/khoEvents';
import { parseDisplayName } from '../storage/displayName';
import { printFlagName, printedNameFor, isSentMatch } from './printName';

const PRINT_DIR = '_print';

// Suy folder chứa tài liệu (folder môn/chương) + base name từ document-URI (pdf).
async function resolveDocFolder(docUri: string): Promise<{ folderUri: string; base: string } | null> {
  const root = await getRootUri(); if (!root) return null;
  const rel = relPathFromUris(root, docUri); if (!rel) return null;
  const segs = rel.split('/').filter(Boolean);
  const fileSeg = segs.pop(); if (!fileSeg) return null;
  const base = fileSeg.replace(/\.[^.]+$/, '');
  let curUri = root;
  for (const s of segs) {
    const { entries } = await Saf.listFolder({ uri: curUri });
    const hit = entries.find((en) => en.isDirectory && en.name === s);
    if (!hit) return null;
    curUri = hit.uri;
  }
  return { folderUri: curUri, base };
}

// Tick "cần in": ghi companion <base>.print.json cạnh cặp.
export async function setPrintFlag(docUri: string): Promise<void> {
  const ctx = await resolveDocFolder(docUri);
  if (!ctx) throw new Error('Không tìm thấy thư mục tài liệu');
  await Saf.writeFile({
    dirUri: ctx.folderUri,
    name: printFlagName(ctx.base),
    content: JSON.stringify({ v: 1, flaggedAt: Date.now() }),
  });
  emitKhoChanged();
}

// Untick: xóa companion.
export async function clearPrintFlag(docUri: string): Promise<void> {
  const ctx = await resolveDocFolder(docUri); if (!ctx) return;
  const { entries } = await Saf.listFolder({ uri: ctx.folderUri });
  const f = entries.find((en) => !en.isDirectory && en.name === printFlagName(ctx.base));
  if (f) await Saf.deleteFile({ uri: f.uri });
  emitKhoChanged();
}

// Trạng thái cờ hiện tại (dùng ở Viewer lúc mở).
export async function isPrintFlagged(docUri: string): Promise<boolean> {
  const ctx = await resolveDocFolder(docUri); if (!ctx) return false;
  const { entries } = await Saf.listFolder({ uri: ctx.folderUri });
  return entries.some((en) => !en.isDirectory && en.name === printFlagName(ctx.base));
}

// fileBase = tên FILE (base) → thao tác _print/ (đặt tên, dedup, match) ổn định.
// name = tên hiển thị (đổi tên nếu có) → chỉ để hiện lên UI.
interface FlatItem { monName: string; name: string; fileBase: string; pdfUri: string; folderUri: string; }

// Đệ quy: gom mọi document đang cờ "cần in" trong cây của một môn.
async function walkFlagged(folderUri: string, monName: string, out: FlatItem[]): Promise<void> {
  const { entries } = await Saf.listFolder({ uri: folderUri });
  const listing = classifyEntries(entries);
  for (const d of listing.documents) {
    if (!d.printFlagged) continue;
    let name = d.name; // classify d.name = base tên file
    if (d.displayUri) {
      try { const { data } = await Saf.readFile({ uri: d.displayUri }); const n = parseDisplayName(data); if (n) name = n; }
      catch { /* giữ tên file */ }
    }
    out.push({ monName, name, fileBase: d.name, pdfUri: d.pdfUri, folderUri });
  }
  for (const f of listing.folders) await walkFlagged(f.uri, monName, out);
}

async function listMonDirs(root: string): Promise<{ name: string; uri: string }[]> {
  const { entries } = await Saf.listFolder({ uri: root });
  return entries
    .filter((e) => e.isDirectory && !e.name.startsWith('.') && e.name !== '_inbox' && e.name !== PRINT_DIR)
    .map((e) => ({ name: e.name, uri: e.uri }));
}

async function scanFlagged(root: string): Promise<FlatItem[]> {
  const flat: FlatItem[] = [];
  for (const d of await listMonDirs(root)) await walkFlagged(d.uri, d.name, flat);
  return flat;
}

// Số tài liệu đang cờ "cần in" (cho khối Home).
export async function countPrintFlagged(): Promise<number> {
  const root = await getRootUri(); if (!root) return 0;
  return (await scanFlagged(root)).length;
}

// Liệt kê _print/ (file con). Không tồn tại → [].
async function listPrintEntries(root: string): Promise<{ name: string; uri: string }[]> {
  try {
    const { uri } = await Saf.ensureDir({ parentUri: root, name: PRINT_DIR });
    const { entries } = await Saf.listFolder({ uri });
    return entries.filter((e) => !e.isDirectory).map((e) => ({ name: e.name, uri: e.uri }));
  } catch { return []; }
}

export interface PrintRow {
  monName: string;
  name: string;        // tên hiển thị (đổi tên nếu có)
  fileBase: string;    // base tên FILE — thao tác _print/ theo cái này
  pdfUri: string;
  folderUri: string;   // chứa companion (để clear khi "xong")
  sent: boolean;       // đã có trong _print/
  printUris: string[]; // file khớp trong _print/ (để xóa khi "xong")
}

// Danh sách cho màn "Đi in": cờ + trạng thái đã gửi (suy từ _print/).
export async function listPrintRows(): Promise<PrintRow[]> {
  const root = await getRootUri(); if (!root) return [];
  const flat = await scanFlagged(root);
  const printEntries = await listPrintEntries(root);
  return flat.map((it) => {
    const matches = printEntries.filter((p) => isSentMatch(p.name, it.monName, it.fileBase));
    return { ...it, sent: matches.length > 0, printUris: matches.map((m) => m.uri) };
  });
}

// Gom: copy mọi cờ chưa-gửi vào _print/ (giữ gốc). Trả số file đã copy.
export async function gomToPrint(): Promise<number> {
  const root = await getRootUri(); if (!root) throw new Error('Chưa chọn folder kho');
  const toCopy = (await listPrintRows()).filter((r) => !r.sent);
  if (toCopy.length === 0) return 0;
  const { uri: printUri } = await Saf.ensureDir({ parentUri: root, name: PRINT_DIR });
  for (const r of toCopy) {
    await Saf.copyToDir({ srcUri: r.pdfUri, dirUri: printUri, name: printedNameFor(r.monName, r.fileBase) });
  }
  emitKhoChanged();
  return toCopy.length;
}

// "Xong": xóa file khỏi _print/ + xóa companion (clear cờ).
export async function markPrinted(row: PrintRow): Promise<void> {
  for (const u of row.printUris) await Saf.deleteFile({ uri: u });
  const { entries } = await Saf.listFolder({ uri: row.folderUri });
  const f = entries.find((en) => !en.isDirectory && en.name === printFlagName(row.fileBase));
  if (f) await Saf.deleteFile({ uri: f.uri });
  emitKhoChanged();
}
