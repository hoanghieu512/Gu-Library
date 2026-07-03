import { Preferences } from '@capacitor/preferences';
import { Saf } from '../plugins/saf';
import { classifyEntries } from './classify';
import { parseMonMeta } from './monjson';
import type { FolderListing, Mon, MonMeta } from './types';
import type { SafEntry } from '../plugins/saf';
import { sortMons } from './sortMon';
import { parseDisplayName } from './displayName';
import { emitKhoChanged } from '../lib/khoEvents';

const ROOT_KEY = 'saf_root_uri';

export async function getRootUri(): Promise<string | null> {
  const { value } = await Preferences.get({ key: ROOT_KEY });
  return value ?? null;
}

export async function pickAndSaveRoot(): Promise<string> {
  const { uri } = await Saf.pickFolder();
  await Preferences.set({ key: ROOT_KEY, value: uri });
  return uri;
}

export async function rootHasPermission(): Promise<boolean> {
  const uri = await getRootUri();
  if (!uri) return false;
  const { granted } = await Saf.hasPermission({ uri });
  return granted;
}

export async function listFolder(uri: string): Promise<FolderListing> {
  const { entries } = await Saf.listFolder({ uri });
  const listing = classifyEntries(entries);
  // Tên hiển thị override: chỉ đọc companion cho doc CÓ .display.json (ít) → tên mới.
  for (const d of listing.documents) {
    if (!d.displayUri) continue;
    try {
      const { data } = await Saf.readFile({ uri: d.displayUri });
      const n = parseDisplayName(data);
      if (n) d.name = n;
    } catch { /* companion hỏng → giữ tên file */ }
  }
  return listing;
}

async function readMonMeta(entries: SafEntry[]): Promise<MonMeta> {
  const monFile = entries.find((e) => !e.isDirectory && e.name === '_mon.json');
  if (!monFile) return {};
  try {
    const { data } = await Saf.readFile({ uri: monFile.uri });
    return parseMonMeta(data);
  } catch {
    return {};
  }
}

// Tạo môn cấp 1: mkdir + ghi _mon.json {color}. Ném 'exists' nếu trùng.
export async function createMon(name: string, color: string): Promise<void> {
  const root = await getRootUri();
  if (!root) throw new Error('Chưa chọn folder kho');
  const { uri } = await Saf.createDir({ parentUri: root, name }); // reject 'exists' nếu trùng
  await Saf.writeFile({ dirUri: uri, name: '_mon.json', content: JSON.stringify({ color }) });
  emitKhoChanged();
}

// Tạo folder con tại parentUri (độ sâu bất kỳ). KHÔNG _mon.json. Trả uri folder mới.
export async function createSubfolder(parentUri: string, name: string): Promise<string> {
  const { uri } = await Saf.createDir({ parentUri, name }); // reject 'exists' nếu trùng
  emitKhoChanged();
  return uri;
}

export async function listMon(): Promise<Mon[]> {
  const root = await getRootUri();
  if (!root) return [];
  const { entries } = await Saf.listFolder({ uri: root });
  const monDirs = entries.filter(
    (e) =>
      e.isDirectory &&
      !e.name.startsWith('.') && // folder ẩn Syncthing (.stfolder/.stversions)
      e.name !== '_inbox' &&
      e.name !== '_print'
  );
  const mons: Mon[] = [];
  for (const d of monDirs) {
    const { entries: children } = await Saf.listFolder({ uri: d.uri });
    const meta = await readMonMeta(children);
    mons.push({ name: d.name, uri: d.uri, meta });
  }
  return sortMons(mons);
}
