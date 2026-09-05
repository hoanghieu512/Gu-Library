// Index tìm kiếm passage-level, dựng từ sidecar JSON. Thuần, không DOM, không SAF → test được.
//
// Hạt tìm kiếm là ĐƠN VỊ (`units[]` trong sidecar), không phải cả tài liệu — spec §7: kết quả là
// đoạn trích kèm vị trí (Điều/trang), chạm để nhảy tới đúng chỗ. Nên posting trỏ tới unit, và mỗi
// unit giữ sẵn `page` để Viewer nhảy.
//
// Index là DỮ LIỆU PHÁI SINH, không sync (spec §4.3): hỏng thì xoá dựng lại, hai máy không đụng nhau.

import { fold, tokenize } from './tokenize';

export interface SidecarUnit {
  type?: string;
  label?: string;
  path?: string[];
  text?: string;
  page?: number;
}

/**
 * Trang ẢNH chưa OCR: worker đặt một câu ĐÁNH DẤU vào `text` thay vì để rỗng. Nó là dấu hiệu
 * "không có chữ", KHÔNG phải nội dung — index nó vào thì tài liệu ảnh nằm trong bảng như thể tra
 * được, gõ gì cũng không ra, lại đẻ token rác. Đây là lỗi có thật của v1.38.0.
 *
 * GIÁ TRỊ THẬT (đọc thẳng từ sidecar trong kho QA ngày 05/09):
 *   "[trang ảnh scan — chưa có lớp văn bản] (trang 12)"
 *
 * Hai điều phải nhớ:
 *  1. Ops doc gọi nó là `IMAGE_PAGE_MARKER` — đó là TÊN BIẾN trong source worker, KHÔNG phải giá
 *     trị. Đệ từng đặt nhầm hằng số bằng chính cái tên đó và nó không khớp gì cả.
 *  2. Câu này có ĐUÔI `(trang N)` đổi theo từng trang → KHÔNG so bằng nhau được, phải so TIỀN TỐ.
 *
 * Đối chiếu 05/09 trên kho QA: đúng 13 sidecar dính marker này, khớp số phiên worker đếm được.
 */
export const IMAGE_PAGE_PREFIX = '[trang ảnh scan';

/** Có chữ đọc được không — rỗng và câu đánh dấu trang-ảnh đều KHÔNG tính là chữ. */
export function isReadableText(t: unknown): t is string {
  if (typeof t !== 'string') return false;
  const v = t.trim();
  return v !== '' && !v.startsWith(IMAGE_PAGE_PREFIX);
}

export interface Sidecar {
  title?: string;
  kind?: string;
  units?: SidecarUnit[];
}

/** Tài liệu trong index — đủ để mở Viewer, không giữ nội dung. */
export interface IndexDoc {
  pdfUri: string;
  name: string;
  mon: string;
}

/** Một đơn vị tra được. `d` = chỉ số vào `docs`. */
export interface IndexUnit {
  d: number;
  label: string;
  page: number;
  text: string;
}

export interface SearchIndex {
  docs: IndexDoc[];
  units: IndexUnit[];
  postings: Map<string, number[]>;   // token -> danh sách unit id (tăng dần, không trùng)
  chars: number;                     // tổng ký tự đã nạp — dùng để báo cáo/ước lượng
  imageOnly: number;                 // số tài liệu là ảnh scan, chưa tra được chữ nào
  sorted?: string[];                 // token đã sắp, dựng LƯỜI — để tra tiền tố bằng nhị phân
}

/** Truy vấn: token cuối luôn là TIỀN TỐ (người dùng đang gõ dở). */
export interface Query { exact: string[]; prefix: string | null }

export function parseQuery(q: string): Query {
  const t = tokenize(q);
  if (t.length === 0) return { exact: [], prefix: null };
  return { exact: [...new Set(t.slice(0, -1))], prefix: t[t.length - 1] };
}

// Trần số token khớp tiền tố. Gõ "d" khớp hàng nghìn token; không chặn thì mỗi phím gõ là một
// lượt gộp khổng lồ. Cắt ở đây làm kết quả KHÔNG đầy đủ cho tiền tố quá ngắn — chấp nhận, vì
// người dùng gõ thêm một chữ là thu hẹp ngay.
const PREFIX_CAP = 400;
// Trần ứng viên đem đi chấm điểm — chặn ca token cực phổ biến ("của", "và").
const CANDIDATE_CAP = 600;

function prefixTokens(ix: SearchIndex, p: string): string[] {
  if (!ix.sorted) ix.sorted = [...ix.postings.keys()].sort();
  const arr = ix.sorted;
  let lo = 0, hi = arr.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] < p) lo = m + 1; else hi = m; }
  const out: string[] = [];
  for (let i = lo; i < arr.length && arr[i].startsWith(p) && out.length < PREFIX_CAP; i++) out.push(arr[i]);
  return out;
}

export function emptyIndex(): SearchIndex {
  return { docs: [], units: [], postings: new Map(), chars: 0, imageOnly: 0 };
}

/**
 * MẢNH của một tài liệu — đơn vị bền hoá và làm mới.
 *
 * Vì sao chẻ theo tài liệu chứ không giữ một bảng token phẳng: tách từ là khâu đắt (đo được 4,9 s
 * cho cả kho). Nếu bảng token là một khối liền thì đổi MỘT file cũng phải tách từ lại TẤT CẢ. Chẻ
 * theo tài liệu thì chỉ tách lại đúng file đổi, còn gộp các mảnh lại chỉ là dồn mảng số — rẻ.
 * `tokens` dùng chỉ số đơn vị CỤC BỘ trong mảnh, lúc gộp mới cộng thêm mốc.
 */
export interface DocShard {
  doc: IndexDoc;
  units: Omit<IndexUnit, 'd'>[];
  tokens: [string, number[]][];
  chars: number;
  /** Sidecar CÓ đơn vị nhưng KHÔNG đơn vị nào có chữ đọc được → ảnh scan chưa OCR. */
  imageOnly: boolean;
}

export function indexDoc(doc: IndexDoc, sidecar: Sidecar): DocShard {
  const units: Omit<IndexUnit, 'd'>[] = [];
  const tokens = new Map<string, number[]>();
  let chars = 0;
  const list = Array.isArray(sidecar?.units) ? sidecar.units : [];
  for (const u of list) {
    if (!isReadableText(u?.text)) continue;    // rỗng, hoặc marker trang-ảnh → không phải chữ
    const text = u.text as string;
    const local = units.length;
    units.push({
      label: typeof u.label === 'string' ? u.label : '',
      page: Number.isFinite(u.page) ? (u.page as number) : 1,
      text,
    });
    chars += text.length;
    // Một token chỉ ghi MỘT posting cho mỗi đơn vị — đơn vị dài lặp từ mà ghi nhiều lần thì phình
    // index không thêm thông tin (xếp hạng theo cụm/vị trí, không theo tần suất).
    const seen = new Set<string>();
    for (const t of tokenize(text)) {
      if (seen.has(t)) continue;
      seen.add(t);
      const l = tokens.get(t);
      if (l) l.push(local); else tokens.set(t, [local]);
    }
  }
  // "Ảnh scan" = có đơn vị nhưng không đơn vị nào đọc được chữ. Khác hẳn "sidecar rỗng/hỏng"
  // (không có đơn vị nào) — cái sau là lỗi worker, cái này là tài liệu chờ OCR.
  return { doc, units, tokens: [...tokens], chars, imageOnly: list.length > 0 && units.length === 0 };
}

/** Gộp các mảnh thành index tra được. Chỉ dồn mảng — KHÔNG tách từ lại. */
export function mergeShards(shards: DocShard[]): SearchIndex {
  const ix = emptyIndex();
  for (const sh of shards) {
    const d = ix.docs.length;
    const base = ix.units.length;
    ix.docs.push(sh.doc);
    for (const u of sh.units) ix.units.push({ d, ...u });
    ix.chars += sh.chars;
    if (sh.imageOnly) ix.imageOnly++;
    for (const [t, locals] of sh.tokens) {
      const l = ix.postings.get(t);
      if (l) for (const i of locals) l.push(base + i);
      else ix.postings.set(t, locals.map((i) => base + i));
    }
  }
  return ix;
}

/** Nạp một tài liệu vào index đang dựng. Sidecar hỏng/rỗng text → bỏ qua êm, không ném. */
export function addDoc(ix: SearchIndex, doc: IndexDoc, sidecar: Sidecar): void {
  const sh = indexDoc(doc, sidecar);
  const d = ix.docs.length;
  const base = ix.units.length;
  ix.docs.push(doc);
  for (const u of sh.units) ix.units.push({ d, ...u });
  ix.chars += sh.chars;
  if (sh.imageOnly) ix.imageOnly++;
  ix.sorted = undefined;                        // thêm token mới → cache tra tiền tố hết hạn
  for (const [t, locals] of sh.tokens) {
    const l = ix.postings.get(t);
    if (l) for (const i of locals) l.push(base + i);
    else ix.postings.set(t, locals.map((i) => base + i));
  }
}

export interface Hit {
  unit: IndexUnit;
  doc: IndexDoc;
  matched: number;   // số token của truy vấn khớp được
}

/**
 * Tra cứu: unit phải chứa ĐỦ mọi token nguyên vẹn, VÀ ít nhất một token khớp tiền tố cuối.
 *
 * Xếp hạng (theo thứ tự ưu tiên):
 *   1. khớp NGUYÊN CỤM (cả câu truy vấn nằm liền nhau) — gần như luôn là cái người ta muốn
 *   2. chỗ khớp xuất hiện SỚM trong đơn vị
 *   3. đơn vị NGẮN hơn (đoạn ngắn mà chứa đủ từ thì sát nghĩa hơn đoạn dài)
 */
export function search(ix: SearchIndex, query: string, limit = 50): Hit[] {
  const { exact, prefix } = parseQuery(query);
  if (!prefix) return [];

  const lists: number[][] = [];
  for (const t of exact) {
    const l = ix.postings.get(t);
    if (!l) return [];                          // thiếu một token → AND chắc chắn rỗng
    lists.push(l);
  }

  // Tập của tiền tố = hợp các token bắt đầu bằng nó.
  const pset = new Set<number>();
  for (const t of prefixTokens(ix, prefix)) {
    const l = ix.postings.get(t);
    if (l) for (const id of l) pset.add(id);
  }
  if (pset.size === 0) return [];

  // Quét từ tập NGẮN NHẤT để cắt sớm: hoặc danh sách token nguyên ngắn nhất, hoặc tập tiền tố.
  lists.sort((a, b) => a.length - b.length);
  const driveByExact = lists.length > 0 && lists[0].length < pset.size;
  const driver: number[] = driveByExact ? lists[0] : [...pset];
  const others = (driveByExact ? lists.slice(1) : lists).map((l) => new Set(l));

  const phrase = fold(query).trim().replace(/\s+/g, ' ');
  const scored: { id: number; phraseHit: number; pos: number; len: number }[] = [];
  for (const id of driver) {
    // Chỉ phải kiểm lại tập tiền tố khi đang quét theo danh sách token nguyên.
    if (driveByExact && !pset.has(id)) continue;
    if (!others.every((s) => s.has(id))) continue;
    const u = ix.units[id];
    const f = fold(u.text);
    const at = phrase.includes(' ') ? f.indexOf(phrase) : f.indexOf(prefix);
    scored.push({ id, phraseHit: at >= 0 ? 1 : 0, pos: at >= 0 ? at : 1e9, len: u.text.length });
    if (scored.length >= CANDIDATE_CAP) break;
  }

  scored.sort((a, b) =>
    (b.phraseHit - a.phraseHit) || (a.pos - b.pos) || (a.len - b.len) || (a.id - b.id));

  return scored.slice(0, limit).map(({ id }) => {
    const unit = ix.units[id];
    return { unit, doc: ix.docs[unit.d], matched: exact.length + 1 };
  });
}

/** Số liệu để báo cáo spike. */
export function indexStats(ix: SearchIndex) {
  let postings = 0;
  for (const l of ix.postings.values()) postings += l.length;
  return {
    docs: ix.docs.length,
    units: ix.units.length,
    chars: ix.chars,
    tokens: ix.postings.size,
    postings,
    imageOnly: ix.imageOnly,
  };
}
