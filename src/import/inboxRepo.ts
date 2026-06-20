import { Preferences } from '@capacitor/preferences';
import { Saf } from '../plugins/saf';
import { getRootUri } from '../storage/repo';
import { makeInboxName, parseInboxPrefix } from './prefix';

const INBOX = '_inbox';
const KEY_LAST_MON = 'last_mon_name';

export async function getLastMon(): Promise<string | null> {
  const { value } = await Preferences.get({ key: KEY_LAST_MON });
  return value ?? null;
}
export async function setLastMon(mon: string): Promise<void> {
  await Preferences.set({ key: KEY_LAST_MON, value: mon });
}

async function ensureInbox(): Promise<string> {
  const root = await getRootUri();
  if (!root) throw new Error('Chưa chọn folder kho (Cài đặt)');
  const { uri } = await Saf.ensureDir({ parentUri: root, name: INBOX });
  return uri;
}

// Copy file share vào _inbox/ với tên gắn tiền tố môn. Trả tên cuối (đã copy).
export async function importSharedFile(srcUri: string, originalName: string, monName: string): Promise<string> {
  const inbox = await ensureInbox();
  const { name } = await Saf.copyToDir({ srcUri, dirUri: inbox, name: makeInboxName(monName, originalName) });
  await setLastMon(monName);
  return name;
}

// Đếm số file "chờ xử lý" trong _inbox theo môn (từ tiền tố) -> Map<mon, count>.
export async function listInboxByMon(): Promise<Map<string, number>> {
  const root = await getRootUri();
  const map = new Map<string, number>();
  if (!root) return map;
  let inboxUri: string;
  try {
    const r = await Saf.ensureDir({ parentUri: root, name: INBOX });
    inboxUri = r.uri;
  } catch {
    return map;
  }
  const { entries } = await Saf.listFolder({ uri: inboxUri });
  for (const e of entries) {
    if (e.isDirectory) continue;
    const p = parseInboxPrefix(e.name);
    if (p) map.set(p.mon, (map.get(p.mon) ?? 0) + 1);
  }
  return map;
}
