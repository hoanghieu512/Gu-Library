import { Preferences } from '@capacitor/preferences';
import { Saf } from '../plugins/saf';
import { classifyEntries } from './classify';
import { parseMonMeta } from './monjson';
import type { FolderListing, Mon, MonMeta } from './types';
import type { SafEntry } from '../plugins/saf';

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
  return classifyEntries(entries);
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
  mons.sort((a, b) => {
    const ao = a.meta.order;
    const bo = b.meta.order;
    if (ao !== undefined && bo !== undefined && ao !== bo) return ao - bo;
    if (ao !== undefined && bo === undefined) return -1;
    if (ao === undefined && bo !== undefined) return 1;
    return a.name.localeCompare(b.name, 'vi');
  });
  return mons;
}
