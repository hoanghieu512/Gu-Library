import { Preferences } from '@capacitor/preferences';
import { Saf } from '../plugins/saf';
import { getRootUri } from '../storage/repo';
import { emitKhoChanged } from '../lib/khoEvents';
import { makeInboxName, parseInboxPrefix } from './prefix';
import { getKhoSnapshot } from '../storage/khoSnapshot';

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

// Copy file share vào _inbox/ với tiền tố ĐƯỜNG ĐÍCH (mảng đoạn từ môn xuống). Trả tên cuối.
export async function importSharedFile(srcUri: string, originalName: string, path: string[]): Promise<string> {
  const inbox = await ensureInbox();
  const { name } = await Saf.copyToDir({ srcUri, dirUri: inbox, name: makeInboxName(path, originalName) });
  await setLastMon(path[0]);
  return name;
}

// Copy CẢ LÔ vào _inbox/ với cùng một đích. Đường copy DUY NHẤT cho Share + file picker.
export async function importBatch(
  files: { uri: string; name: string }[], path: string[],
): Promise<{ ok: number; fails: string[] }> {
  let ok = 0;
  const fails: string[] = [];
  for (const f of files) { // tuần tự → dedup "(k)" trước đuôi đúng thứ tự
    try { await importSharedFile(f.uri, f.name, path); ok += 1; }
    catch { fails.push(f.name); }
  }
  if (ok > 0) emitKhoChanged();
  return { ok, fails };
}

// Đếm số file "chờ xử lý" trong _inbox theo môn (từ tiền tố) -> Map<mon, count>.
// Đọc con _inbox từ walk chung (khoSnapshot) — không tự list lại.
export async function listInboxByMon(): Promise<Map<string, number>> {
  const snap = await getKhoSnapshot();
  const map = new Map<string, number>();
  for (const e of snap.inboxEntries) {
    if (e.isDirectory) continue;
    const p = parseInboxPrefix(e.name);
    if (p) map.set(p.mon, (map.get(p.mon) ?? 0) + 1);
  }
  return map;
}
