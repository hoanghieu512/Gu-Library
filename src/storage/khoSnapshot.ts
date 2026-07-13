// MỘT walk toàn kho, chia chung cho MỌI consumer đọc (danh sách môn, đang-đọc-dở, đếm cờ
// in, tóm tắt số tài liệu, sheet chọn đích). Trước đây mỗi consumer tự walk từ root → cùng
// một cây bị quét hàng trăm lần (listReading walk /entry, countPrintFlagged walk toàn kho,
// summarizeMon walk /card…). Nay: dựng CÂY một lần, giữ trong RAM phiên (KHÔNG ghi file cache
// vào cây Syncthing), mọi hàm dẫn xuất từ cây đó.
//
// Làm tươi (giữ nguyên vai khoChanged): ghi trong-app phát `khoChanged` → bỏ cache; đổi từ máy
// khác (Syncthing rải về / worker) vào lúc app resume → HomePage gọi invalidateKho() rồi reload.
// Nội dung _reading-*.json KHÔNG cache (đọc tươi mỗi lần) vì recordProgress ghi lặng, không phát
// sự kiện — cây (cấu trúc/uri/meta/display) chỉ đổi qua thao tác có phát khoChanged.

import { Saf } from '../plugins/saf';
import type { SafEntry } from '../plugins/saf';
import { getRootUri } from './repo';
import { classifyEntries } from './classify';
import { parseMonMeta } from './monjson';
import { parseDisplayName } from './displayName';
import { sortMons } from './sortMon';
import { onKhoChanged } from '../lib/khoEvents';
import type { FolderListing, Mon } from './types';

const INBOX = '_inbox';

export interface KhoFolder {
  name: string;
  uri: string;
  entries: SafEntry[];                 // con thô (1 listFolder)
  listing: FolderListing;              // đã phân loại
  children: KhoFolder[];               // folder con (đệ quy)
  displayNames: Map<string, string>;   // fileBase -> tên hiển thị (.display.json đã đọc)
}

export interface KhoSnapshot {
  root: string | null;
  rootEntries: SafEntry[];
  mons: Mon[];                          // top-level, meta đã đọc, đã sort
  monFolders: Map<string, KhoFolder>;  // mon.uri -> gốc cây môn
  byUri: Map<string, KhoFolder>;       // mọi folder theo uri
  inboxEntries: SafEntry[];            // con của _inbox (đếm chờ xử lý)
}

function emptySnapshot(): KhoSnapshot {
  return { root: null, rootEntries: [], mons: [], monFolders: new Map(), byUri: new Map(), inboxEntries: [] };
}

async function readMonMeta(entries: SafEntry[]) {
  const f = entries.find((e) => !e.isDirectory && e.name === '_mon.json');
  if (!f) return {};
  try { return parseMonMeta((await Saf.readFile({ uri: f.uri })).data); } catch { return {}; }
}

async function buildFolder(uri: string, name: string): Promise<KhoFolder> {
  const { entries } = await Saf.listFolder({ uri });
  const listing = classifyEntries(entries);
  const displayNames = new Map<string, string>();
  for (const d of listing.documents) {
    if (!d.displayUri) continue;
    try {
      const n = parseDisplayName((await Saf.readFile({ uri: d.displayUri })).data);
      if (n) displayNames.set(d.fileBase ?? d.name, n);
    } catch { /* companion hỏng → giữ tên file */ }
  }
  const children: KhoFolder[] = [];
  for (const f of listing.folders) children.push(await buildFolder(f.uri, f.name));
  return { name, uri, entries, listing, children, displayNames };
}

function indexTree(f: KhoFolder, byUri: Map<string, KhoFolder>): void {
  byUri.set(f.uri, f);
  for (const c of f.children) indexTree(c, byUri);
}

async function buildSnapshot(): Promise<KhoSnapshot> {
  const root = await getRootUri();
  if (!root) return emptySnapshot();
  const { entries: rootEntries } = await Saf.listFolder({ uri: root });
  // Môn = folder KHÔNG dotfile và KHÔNG '_'-prefix. Loại theo tiền tố '_' (không chỉ so đúng
  // '_inbox'/'_print') để mọi folder hệ thống — kể cả bản trùng lỡ sinh như '_inbox (1)' — không
  // bao giờ bị coi là môn. (validateFolderName đã chặn tên môn bắt đầu bằng '_' nên an toàn.)
  const monDirs = rootEntries.filter(
    (e) => e.isDirectory && !e.name.startsWith('.') && !e.name.startsWith('_'),
  );
  const mons: Mon[] = [];
  const monFolders = new Map<string, KhoFolder>();
  const byUri = new Map<string, KhoFolder>();
  for (const d of monDirs) {
    // Bọc TỪNG môn: một folder lỗi (URI stale khi Syncthing/worker đang churn cây) chỉ làm rớt
    // đúng môn đó ở lần tải này, KHÔNG throw cả snapshot làm biến mất TOÀN BỘ danh sách môn.
    try {
      const folder = await buildFolder(d.uri, d.name);
      mons.push({ name: d.name, uri: d.uri, meta: await readMonMeta(folder.entries) });
      monFolders.set(d.uri, folder);
      indexTree(folder, byUri);
    } catch { /* bỏ qua môn lỗi tạm thời — lần reload sau dựng lại đủ */ }
  }
  let inboxEntries: SafEntry[] = [];
  const inbox = rootEntries.find((e) => e.isDirectory && e.name === INBOX);
  if (inbox) { try { inboxEntries = (await Saf.listFolder({ uri: inbox.uri })).entries; } catch { /* chưa có */ } }
  return { root, rootEntries, mons: sortMons(mons), monFolders, byUri, inboxEntries };
}

// --- cache phiên + làm tươi ---
let cached: Promise<KhoSnapshot> | null = null;

export function getKhoSnapshot(force = false): Promise<KhoSnapshot> {
  if (force || !cached) {
    cached = buildSnapshot().catch((e) => { cached = null; throw e; });
  }
  return cached;
}

export function invalidateKho(): void { cached = null; }

// Kho đổi trong-app (import/di chuyển/xóa/tạo/đổi tên/đánh dấu in) → bỏ cache, lần tải kế dựng
// lại. Đăng ký ở tầng module (chạy lúc import, trước khi component mount) → luôn bỏ cache TRƯỚC
// khi HomePage nghe cùng sự kiện gọi reload → reload đọc cây mới.
onKhoChanged(invalidateKho);

// --- dẫn xuất (thuần, không SAF thêm) ---
export function foldSummary(f: KhoFolder): { documents: number; pending: number } {
  let documents = f.listing.documents.length;
  let pending = f.listing.pending.length;
  for (const c of f.children) { const s = foldSummary(c); documents += s.documents; pending += s.pending; }
  return { documents, pending };
}

export function countFlagged(f: KhoFolder): number {
  let n = f.listing.documents.reduce((a, d) => a + (d.printFlagged ? 1 : 0), 0);
  for (const c of f.children) n += countFlagged(c);
  return n;
}

// Tìm folder theo đường đoạn tên (từ mon xuống) — dùng để resolve reading path không cần walk lại.
export function folderByPath(snap: KhoSnapshot, segs: string[]): KhoFolder | null {
  if (segs.length === 0) return null;
  const mon = snap.mons.find((m) => m.name === segs[0]);
  if (!mon) return null;
  let node = snap.monFolders.get(mon.uri) ?? null;
  for (let i = 1; i < segs.length && node; i++) {
    node = node.children.find((c) => c.name === segs[i]) ?? null;
  }
  return node;
}
