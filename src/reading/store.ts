import { Preferences } from '@capacitor/preferences';
import { Saf } from '../plugins/saf';
import { getRootUri } from '../storage/repo';
import { relPathFromUris } from './paths';
import { mergeReading, upsertEntry, removeEntry as removeInFile,
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

// Trang để khôi phục khi mở (union mọi máy, mới nhất theo path).
export async function getResumePage(docUri: string): Promise<number> {
  const root = await getRootUri(); if (!root) return 1;
  const path = relPathFromUris(root, docUri); if (!path) return 1;
  const merged = mergeReading(await readAllFiles(root));
  return merged.find((e) => e.path === path)?.page ?? 1;
}

// Danh sách đang đọc dở (union) + resolve uri trên máy này; ẩn entry không còn file.
export interface ReadingItem extends ReadingEntry { uri: string; }
export async function listReading(): Promise<ReadingItem[]> {
  const root = await getRootUri(); if (!root) return [];
  const merged = mergeReading(await readAllFiles(root));
  const out: ReadingItem[] = [];
  for (const e of merged) {
    const uri = await resolveUriFromRelPath(root, e.path);
    if (uri) out.push({ ...e, uri });
  }
  return out;
}

// path (vd "Môn/Chương/x.pdf") → SAF document uri trên máy hiện tại; null nếu không còn.
async function resolveUriFromRelPath(root: string, path: string): Promise<string | null> {
  const segs = path.split('/').filter(Boolean);
  let curUri = root;
  for (let i = 0; i < segs.length; i++) {
    const { entries } = await Saf.listFolder({ uri: curUri });
    const want = segs[i];
    const isLast = i === segs.length - 1;
    const hit = entries.find((e) => e.name === want && (isLast ? !e.isDirectory : e.isDirectory));
    if (!hit) return null;
    curUri = hit.uri;
  }
  return curUri;
}
