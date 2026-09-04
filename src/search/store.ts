// Kho index tìm kiếm: bền hoá trong IndexedDB + làm mới theo từng tài liệu.
//
// Index là DỮ LIỆU PHÁI SINH (spec §4.3): nằm trong máy, KHÔNG vào cây Syncthing, hỏng thì xoá
// dựng lại. Đó cũng là lý do dùng IndexedDB chứ không ghi file vào kho.
//
// Số đo dẫn đường (spike 05/09, UBS1 6GB, kho QA 178 tài liệu · 20,8M ký tự):
//   dựng nguội 14,0 s (đọc 63% · tách từ 35%) · nạp lại 0,49 s · index 24,6 MB · tra 1–3 ms
// → Dựng một lần rồi giữ. Làm mới chỉ đọc lại file có DẤU VÂN TAY đổi.

import { Saf } from '../plugins/saf';
import type { SafEntry } from '../plugins/saf';
import { getKhoSnapshot } from '../storage/khoSnapshot';
import type { KhoFolder } from '../storage/khoSnapshot';
import { indexDoc, mergeShards } from './invertedIndex';
import type { DocShard, IndexDoc, SearchIndex, Sidecar } from './invertedIndex';

const DB = 'gu-search';
const STORE = 'shards';
const KEY = 'v1';
// Tăng số này khi đổi cách sinh token / hình dạng mảnh → mọi máy tự dựng lại, khỏi so tay.
const SCHEMA = 1;

export interface StoredShard extends DocShard {
  jsonUri: string;
  stamp: string;
}

interface Stored {
  schema: number;
  shards: StoredShard[];
  builtAt: number;
}

/**
 * Dấu vân tay của sidecar. `-1` = DocumentsProvider không trả cột đó → KHÔNG so được, phải coi
 * như đã đổi và đọc lại. Trả chuỗi rỗng để chỗ so sánh luôn thấy khác nhau.
 */
export function stampOf(e: Pick<SafEntry, 'size' | 'lastModified'> | undefined): string {
  if (!e) return '';
  const { size, lastModified } = e;
  if (size == null || lastModified == null || size < 0 || lastModified < 0) return '';
  return `${size}:${lastModified}`;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(db: IDBDatabase, mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const r = run(t.objectStore(STORE));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function readStored(): Promise<Stored | null> {
  try {
    const db = await open();
    const v = await tx<Stored | undefined>(db, 'readonly', (s) => s.get(KEY) as IDBRequest<Stored | undefined>);
    db.close();
    if (!v || v.schema !== SCHEMA) return null;
    return v;
  } catch { return null; }               // IDB bị chặn (chế độ riêng tư…) → coi như chưa có index
}

async function writeStored(v: Stored): Promise<void> {
  const db = await open();
  await tx(db, 'readwrite', (s) => s.put(v, KEY));
  db.close();
}

export async function clearIndex(): Promise<void> {
  try {
    const db = await open();
    await tx(db, 'readwrite', (s) => s.delete(KEY));
    db.close();
  } catch { /* không xoá được cũng không sao — dựng lại sẽ ghi đè */ }
}

/** Một tài liệu cần có mặt trong index, kèm dấu vân tay của sidecar. */
interface Wanted { doc: IndexDoc; jsonUri: string; stamp: string }

function collect(f: KhoFolder, mon: string, out: Wanted[]): void {
  const stampByUri = new Map(f.entries.map((e) => [e.uri, stampOf(e)]));
  for (const d of f.listing.documents) {
    out.push({
      doc: { pdfUri: d.pdfUri, name: d.fileBase ?? d.name, mon },
      jsonUri: d.jsonUri,
      stamp: stampByUri.get(d.jsonUri) ?? '',
    });
  }
  for (const c of f.children) collect(c, mon, out);
}

export interface RefreshProgress {
  done: number;
  total: number;
  reused: number;   // bao nhiêu tài liệu lấy lại từ index cũ, không phải đọc lại
}

export interface RefreshResult {
  changed: boolean;        // false = kho y nguyên → KHÔNG dựng lại gì, index đang giữ vẫn đúng
  index?: SearchIndex;     // chỉ có khi changed
  stamps?: Map<string, string>;
  read: number;            // số tài liệu phải đọc lại lần này
  reused: number;
  total: number;
  ms: number;
}

/**
 * Dựng hoặc làm mới index.
 *
 * - Tài liệu có dấu vân tay khớp index cũ → lấy lại mảnh cũ, KHÔNG đọc, KHÔNG tách từ.
 * - Tài liệu mới/đổi → đọc sidecar rồi tách từ lại đúng nó.
 * - Tài liệu biến mất khỏi kho → rơi ra tự nhiên vì mình dựng theo danh sách kho hiện tại.
 *
 * Đọc bằng `Saf.readFile` chứ KHÔNG phải fetch qua local-server: đo được 8,7 s so với 14,2 s cho
 * 178 file. Bài học OOM v1.4.1 là về MỘT file 64 MB dựng String khổng lồ; sidecar trung bình
 * 330 KB nên không chạm trần. Luật: nhiều file nhỏ đi bridge, một file lớn đi fetch.
 */
export async function refreshIndex(
  known?: Map<string, string>,
  onProgress?: (p: RefreshProgress) => void,
): Promise<RefreshResult> {
  const t0 = Date.now();
  const snap = await getKhoSnapshot(true);
  const wanted: Wanted[] = [];
  for (const m of snap.mons) {
    const f = snap.monFolders.get(m.uri);
    if (f) collect(f, m.name, wanted);
  }

  // Lối tắt cho ca THƯỜNG GẶP NHẤT: mở màn Tìm mà kho không đổi gì.
  // Đối chiếu bằng dấu vân tay đang giữ sẵn → khỏi đọc IndexedDB, khỏi gộp lại index.
  // Đo được: bỏ qua được lối này thì đỉnh bộ nhớ vọt 304 → 568 MB vì hai bản index cùng tồn tại.
  if (known && known.size === wanted.length
      && wanted.every((w) => w.stamp !== '' && known.get(w.jsonUri) === w.stamp)) {
    return { changed: false, read: 0, reused: wanted.length, total: wanted.length, ms: Date.now() - t0 };
  }

  const stored = await readStored();
  const cache = new Map<string, StoredShard>();
  for (const sh of stored?.shards ?? []) cache.set(sh.jsonUri, sh);

  const shards: StoredShard[] = [];
  let read = 0, reused = 0;
  for (let i = 0; i < wanted.length; i++) {
    const w = wanted[i];
    const old = cache.get(w.jsonUri);
    // Dấu vân tay rỗng = không so được → luôn đọc lại (đừng coi hai cái "không biết" là bằng nhau).
    if (old && w.stamp !== '' && old.stamp === w.stamp) {
      shards.push({ ...old, doc: w.doc });      // tên/môn có thể đã đổi dù nội dung không đổi
      reused++;
    } else {
      try {
        const raw = (await Saf.readFile({ uri: w.jsonUri })).data;
        const sc = JSON.parse(raw) as Sidecar;
        shards.push({ ...indexDoc(w.doc, sc), jsonUri: w.jsonUri, stamp: w.stamp });
        read++;
      } catch {
        // Sidecar hỏng/không đọc được → bỏ tài liệu này khỏi index, KHÔNG làm hỏng cả lượt.
        // Không ghi mảnh rỗng: lần sau vẫn thử lại.
      }
    }
    onProgress?.({ done: i + 1, total: wanted.length, reused });
  }

  await writeStored({ schema: SCHEMA, shards, builtAt: Date.now() });
  return {
    changed: true,
    index: mergeShards(shards),
    stamps: new Map(shards.map((sh) => [sh.jsonUri, sh.stamp])),
    read, reused, total: wanted.length, ms: Date.now() - t0,
  };
}

/**
 * Nạp index đã bền hoá. `null` = chưa có (chưa dựng lần nào, hoặc schema đã đổi).
 * Trả kèm dấu vân tay để lượt làm mới sau đối chiếu mà khỏi đọc lại IndexedDB.
 */
export async function loadIndex(): Promise<{
  index: SearchIndex; builtAt: number; stamps: Map<string, string>;
} | null> {
  const stored = await readStored();
  if (!stored || stored.shards.length === 0) return null;
  return {
    index: mergeShards(stored.shards),
    builtAt: stored.builtAt,
    stamps: new Map(stored.shards.map((sh) => [sh.jsonUri, sh.stamp])),
  };
}
