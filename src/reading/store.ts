import { Preferences } from '@capacitor/preferences';
import { Saf } from '../plugins/saf';
import { getRootUri } from '../storage/repo';
import { relPathFromUris } from './paths';
import { getKhoSnapshot, folderByPath } from '../storage/khoSnapshot';
import { mergeReading, upsertEntry, removeEntry as removeInFile, moveEntry, renameReadingSubtree,
         type DeviceReadingFile, type ReadingEntry } from './model';

const DEVICE_KEY = 'device_id';
let _seq = 0;
function nowMs(): number { return Date.now() * 1000 + (_seq++ % 1000); }

export async function getDeviceId(): Promise<string> {
  const { value } = await Preferences.get({ key: DEVICE_KEY });
  if (value) return value;
  const id = crypto.randomUUID();
  await Preferences.set({ key: DEVICE_KEY, value: id });
  return id;
}

const fileName = (deviceId: string) => `_reading-${deviceId}.json`;
const isReadingFile = (name: string) => name.startsWith('_reading-') && name.endsWith('.json');

async function readDeviceFile(root: string, deviceId: string): Promise<DeviceReadingFile> {
  const { entries } = await Saf.listFolder({ uri: root });
  const f = entries.find((e) => !e.isDirectory && e.name === fileName(deviceId));
  if (f) {
    try {
      const { data } = await Saf.readFile({ uri: f.uri });
      const parsed = JSON.parse(data) as DeviceReadingFile;
      return { deviceId, entries: parsed.entries ?? {}, tombstones: parsed.tombstones ?? {} };
    } catch { /* hỏng → tạo mới */ }
  }
  return { deviceId, entries: {}, tombstones: {} };
}

async function writeDeviceFile(root: string, file: DeviceReadingFile): Promise<void> {
  await Saf.writeFile({ dirUri: root, name: fileName(file.deviceId), content: JSON.stringify(file) });
}

async function readAllFiles(root: string): Promise<DeviceReadingFile[]> {
  const { entries } = await Saf.listFolder({ uri: root });
  const out: DeviceReadingFile[] = [];
  for (const e of entries) {
    if (e.isDirectory || !isReadingFile(e.name)) continue;
    try {
      const { data } = await Saf.readFile({ uri: e.uri });
      const p = JSON.parse(data) as DeviceReadingFile;
      out.push({ deviceId: p.deviceId ?? e.name, entries: p.entries ?? {}, tombstones: p.tombstones ?? {} });
    } catch { /* bỏ file hỏng */ }
  }
  return out;
}

function baseName(relPath: string): string { return relPath.split('/').pop()!.replace(/\.[^.]+$/, ''); }

// Ghi tiến độ (gọi từ Viewer). page>=total → coi như xong: xoá entry + tombstone.
export async function recordProgress(docUri: string, page: number, total: number): Promise<void> {
  const root = await getRootUri(); if (!root) return;
  const path = relPathFromUris(root, docUri); if (!path) return;
  const deviceId = await getDeviceId();
  let file = await readDeviceFile(root, deviceId);
  if (total > 0 && page >= total) {
    file = removeInFile(file, path, nowMs());
  } else {
    const entry: ReadingEntry = { path, name: baseName(path), monName: path.split('/')[0], page, total, lastReadAt: nowMs() };
    file = upsertEntry(file, entry);
  }
  await writeDeviceFile(root, file);
}

// Vuốt xoá khỏi danh sách (chỉ entry; file trong kho giữ nguyên).
export async function removeReading(path: string): Promise<void> {
  const root = await getRootUri(); if (!root) return;
  const deviceId = await getDeviceId();
  const file = await readDeviceFile(root, deviceId);
  await writeDeviceFile(root, removeInFile(file, path, nowMs()));
}

// Dời entry đọc-dở của MÁY NÀY sang đường dẫn mới (khi Chuyển tài liệu). Máy khác không đụng.
export async function moveReading(oldPath: string, newPath: string, newName: string): Promise<void> {
  const root = await getRootUri(); if (!root) return;
  const deviceId = await getDeviceId();
  const file = await readDeviceFile(root, deviceId);
  await writeDeviceFile(root, moveEntry(file, oldPath, newPath, newName, nowMs()));
}

// Đổi tên THƯ MỤC (rename môn/thư mục) → dời MỌI entry đọc-dở của máy này dưới cây thư mục đó.
// Chỉ ghi `_reading-<máy này>.json`; entry máy khác trỏ path cũ → listReading tự lọc im lặng.
export async function renameReadingFolder(oldFolder: string, newFolder: string): Promise<void> {
  const root = await getRootUri(); if (!root) return;
  const deviceId = await getDeviceId();
  const file = await readDeviceFile(root, deviceId);
  await writeDeviceFile(root, renameReadingSubtree(file, oldFolder, newFolder, nowMs()));
}

// Resolve một reading path trong CÂY chung (không walk lại): trả uri + tên hiển thị.
// null nếu file không còn (ẩn khỏi danh sách như trước).
function resolveInSnapshot(
  snap: Awaited<ReturnType<typeof getKhoSnapshot>>, relPath: string,
): { uri: string; displayName: string | null } | null {
  const segs = relPath.split('/').filter(Boolean);
  if (segs.length === 0) return null;
  const base = segs[segs.length - 1].replace(/\.[^.]+$/, '');
  const folder = folderByPath(snap, segs.slice(0, -1));
  if (!folder) return null;
  const doc = folder.listing.documents.find((d) => (d.fileBase ?? d.name) === base);
  if (!doc) return null;
  return { uri: doc.pdfUri, displayName: folder.displayNames.get(base) ?? null };
}

// Trang để khôi phục khi mở (union mọi máy, mới nhất theo path).
export async function getResumePage(docUri: string): Promise<number> {
  const root = await getRootUri(); if (!root) return 1;
  const path = relPathFromUris(root, docUri); if (!path) return 1;
  const merged = mergeReading(await readAllFiles(root));
  return merged.find((e) => e.path === path)?.page ?? 1;
}

// Danh sách đang đọc dở (union) + resolve uri trên máy này; ẩn entry không còn file.
export interface ReadingItem extends ReadingEntry { uri: string; }
// Danh sách đang-đọc-dở: NỘI DUNG _reading-*.json đọc TƯƠI mỗi lần (tiến độ), nhưng resolve
// uri + tên hiển thị bằng CÂY chung (khoSnapshot) — bỏ walk-từ-root ×2/entry (thủ phạm ~19s).
export async function listReading(): Promise<ReadingItem[]> {
  const root = await getRootUri(); if (!root) return [];
  const [merged, snap] = await Promise.all([
    readAllFiles(root).then(mergeReading),
    getKhoSnapshot(),
  ]);
  const out: ReadingItem[] = [];
  for (const e of merged) {
    const r = resolveInSnapshot(snap, e.path);
    if (!r) continue; // file không còn → ẩn
    out.push({ ...e, uri: r.uri, name: r.displayName ?? e.name }); // tên đổi (nếu có) > tên trong entry
  }
  return out;
}
