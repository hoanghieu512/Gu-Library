import { Preferences } from '@capacitor/preferences';
import { Saf } from '../plugins/saf';
import { getRootUri } from '../storage/repo';
import { emitKhoChanged } from '../lib/khoEvents';
import { makeInboxName, parseInboxPrefix } from './prefix';
import { getKhoSnapshot } from '../storage/khoSnapshot';
import { KhoUnreadableError } from '../plugins/khoUnreadable';
import { ensureKhoDir } from '../storage/khoRoot';

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
  return ensureKhoDir(root, INBOX);
}

// Copy file share vào _inbox/ với tiền tố ĐƯỜNG ĐÍCH (mảng đoạn từ môn xuống). Trả tên cuối.
async function copyIntoInbox(inbox: string, srcUri: string, originalName: string, path: string[]): Promise<string> {
  const { name } = await Saf.copyToDir({ srcUri, dirUri: inbox, name: makeInboxName(path, originalName) });
  await setLastMon(path[0]);
  return name;
}

export interface BatchResult {
  ok: number;
  fails: string[];
  /** Set when Android hid the kho: the batch stopped, and `left` was not imported. */
  khoUnreadable?: { left: string[] };
}

// Copy CẢ LÔ vào _inbox/ với cùng một đích. Đường copy DUY NHẤT cho Share + file picker.
// onProgress báo TRƯỚC khi copy file thứ (done/total) → UI hiện trạng thái tiến hành (file
// nguồn cloud copy = tải mạng trong stream, không nén được → phải cho người dùng thấy nó đang về).
export async function importBatch(
  files: { uri: string; name: string }[], path: string[],
  onProgress?: (done: number, total: number, name: string) => void,
  shouldCancel?: () => boolean,
): Promise<BatchResult> {
  let ok = 0;
  const fails: string[] = [];
  // Looked up once for the batch, not per file (review of 18/10: an ensureDir and a root listing
  // per file). Forgotten after a failed copy: the worker or Syncthing may have removed _inbox and
  // made it again, and the next file looks it up afresh.
  let inbox: string | null = null;
  for (let i = 0; i < files.length; i++) { // tuần tự → dedup "(k)" trước đuôi đúng thứ tự
    // Hủy: dừng ở RANH GIỚI giữa hai file (không cắt ngang file đang copy); file đã xong GIỮ nguyên.
    if (shouldCancel?.()) break;
    const f = files[i];
    onProgress?.(i + 1, files.length, f.name);
    try {
      inbox ??= await ensureInbox();
      await copyIntoInbox(inbox, f.uri, f.name, path);
      ok += 1;
    } catch (err) {
      // A kho Android is hiding fails every file the same way: stop, and say what did not go in so
      // that only those are shared again.
      if (err instanceof KhoUnreadableError) {
        if (ok > 0) emitKhoChanged();
        return { ok, fails, khoUnreadable: { left: files.slice(i).map((x) => x.name) } };
      }
      fails.push(f.name);
      inbox = null;
    }
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
