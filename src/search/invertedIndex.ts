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
  /**
   * Folded tokens joined by single spaces, with a leading space: " giao ket hop dong". A phrase
   * check is then `n.includes(" hop dong")` — the leading space pins the word start, the single
   * spaces make every inner word whole, and the open end keeps the last word a prefix. Measured
   * 06/10 on the QA kho: 10 ms for the heaviest query vs 519 ms tokenizing each candidate.
   */
  n: string;
}

export interface SearchIndex {
  docs: IndexDoc[];
  units: IndexUnit[];
  postings: Map<string, number[]>;   // token -> danh sách unit id (tăng dần, không trùng)
  chars: number;                     // tổng ký tự đã nạp — dùng để báo cáo/ước lượng
  imageOnly: number;                 // số tài liệu là ảnh scan, chưa tra được chữ nào
  sorted?: string[];                 // token đã sắp, dựng LƯỜI — để tra tiền tố bằng nhị phân
  docLen?: number[];                 // units per doc, built lazily — document length for ranking
}

/**
 * Truy vấn: token cuối luôn là TIỀN TỐ (người dùng đang gõ dở).
 * `seq` giữ THỨ TỰ và giữ cả token lặp — cần cho việc bắt CỤM LIỀN NHAU; `exact` là bản đã gộp
 * trùng, chỉ dùng để lọc thô qua bảng token.
 */
export interface Query { seq: string[]; exact: string[]; prefix: string | null }

export function parseQuery(q: string): Query {
  const t = tokenize(q);
  if (t.length === 0) return { seq: [], exact: [], prefix: null };
  return { seq: t, exact: [...new Set(t.slice(0, -1))], prefix: t[t.length - 1] };
}

// Trần số token khớp tiền tố. Gõ "d" khớp hàng nghìn token; không chặn thì mỗi phím gõ là một
// lượt gộp khổng lồ. Cắt ở đây làm kết quả KHÔNG đầy đủ cho tiền tố quá ngắn — chấp nhận, vì
// người dùng gõ thêm một chữ là thu hẹp ngay. Only single-word queries are capped (v1.41.0).
const PREFIX_CAP = 400;

function prefixTokens(ix: SearchIndex, p: string, cap = PREFIX_CAP): string[] {
  if (!ix.sorted) ix.sorted = [...ix.postings.keys()].sort();
  const arr = ix.sorted;
  let lo = 0, hi = arr.length;
  while (lo < hi) { const m = (lo + hi) >> 1; if (arr[m] < p) lo = m + 1; else hi = m; }
  const out: string[] = [];
  for (let i = lo; i < arr.length && arr[i].startsWith(p) && out.length < cap; i++) out.push(arr[i]);
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

const DIEU = /^Điều\s/;

/**
 * Result label = unit label + its ancestors up to the nearest "Điều" (nearest first):
 * "Khoản 2" under Điều 2 → "Khoản 2 · Điều 2", since every Điều has a Khoản 2. No Điều above →
 * label unchanged, so Chương never clutters it (and odd worker paths like a "Chương II" heading
 * under "Chương I" stay harmless).
 */
export function displayLabel(label: string, path: unknown): string {
  const anc = Array.isArray(path) ? path.filter((p): p is string => typeof p === 'string' && p !== label) : [];
  const k = anc.findLastIndex((p) => DIEU.test(p.normalize('NFC')));
  const parts = k < 0 ? [label] : [label, ...anc.slice(k).reverse()];
  return parts.filter(Boolean).join(' · ');
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
    const toks = tokenize(text);
    units.push({
      label: displayLabel(typeof u.label === 'string' ? u.label : '', u.path),
      page: Number.isFinite(u.page) ? (u.page as number) : 1,
      text,
      n: ' ' + toks.join(' '),
    });
    chars += text.length;
    // Một token chỉ ghi MỘT posting cho mỗi đơn vị — đơn vị dài lặp từ mà ghi nhiều lần thì phình
    // index không thêm thông tin (xếp hạng theo cụm/vị trí, không theo tần suất).
    const seen = new Set<string>();
    for (const t of toks) {
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
  ix.docLen = undefined;                        // new doc → cached document lengths are stale
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

// Symbols that carry meaning when glued to a word/number ("35%", "15/5", "15.5", "TT-BCA").
// Sentence marks (. , :) only count BETWEEN two alnums — "15.5" yes, "điều 5." no — so a stray
// trailing dot or comma never narrows a query. Quotes/brackets are never meaningful.
const SYMBOLS = '%/-+&°§.,:';
const SENTENCE = '.,:';

export interface Literal {
  re: RegExp;        // run on fold(text)
  syms: string[];    // every meaningful symbol — cheap raw-text pre-check (fold leaves them alone)
}

/**
 * Query → strict literal matcher, or null when it has no meaningful symbol (then search behaves
 * exactly as before). The index has no symbols at all, so this runs as a verification pass on
 * candidates. Text may space a symbol out ("35 %", "15 / 5"); sentence marks must sit tight.
 */
export function literalOf(query: string): Literal | null {
  const runs = fold(query).trim().match(/[a-z0-9]+|[^a-z0-9]+/g) ?? [];
  const esc = (c: string) => c.replace(/[.*+?^${}()|[\]\\/-]/g, '\\$&');
  const isTok = (r: string) => /^[a-z0-9]/.test(r);
  const syms: string[] = [];
  let src = '';
  runs.forEach((run, i) => {
    if (isTok(run)) { src += run; return; }
    const prev = i > 0, next = i < runs.length - 1;
    const kept = [...run].filter((c, k) => {
      if (!SYMBOLS.includes(c)) return false;
      const left = k === 0 && prev, right = k === run.length - 1 && next;
      return SENTENCE.includes(c) ? left && right : left || right;
    });
    if (kept.length) {
      syms.push(...kept);
      src += kept.map((c) => (SENTENCE.includes(c) ? esc(c) : `\\s*${esc(c)}\\s*`)).join('');
    } else if (prev && next) {
      src += '[^a-z0-9]+';            // plain gap between words: punctuation/newlines don't break it
    }
  });
  if (syms.length === 0) return null;
  // Leading boundary only; the end stays open so the last word still matches as a prefix.
  return { re: new RegExp((isTok(runs[0] ?? '') ? '(?<![a-z0-9])' : '') + src), syms };
}

/**
 * Calls `visit(id, pos)` for every unit matching the query, in no particular order. A unit matches
 * when it holds the whole query as one run of words (last word as a prefix — the user is still
 * typing); a query with a meaningful symbol ("35%", "15/5") must match it literally (v1.40.1).
 *
 * No cap and no kho-order cut-off: until v1.40.1 candidates stopped at 600 in KHO ORDER before
 * ranking, so a common word only ever surfaced the first subject A-Z (measured 06/10: "dieu tra"
 * never reached the criminal procedure code). The check is cheap enough now (`n`) to run on all.
 * Membership uses byte marks over all units, not Sets: a broad prefix ("th") hits ~100k units and
 * a Set that size cost more than the checks themselves (measured 06/10).
 */
function eachMatch(ix: SearchIndex, query: string, visit: (id: number, pos: number) => void): void {
  const { seq, exact, prefix } = parseQuery(query);
  if (!prefix) return;
  const lit = literalOf(query);
  const needle = ' ' + seq.join(' ');
  const check = (id: number) => {
    const u = ix.units[id];
    let pos: number;
    if (lit) {
      // Cheap raw-text pre-check first: fold() leaves symbols alone.
      if (!lit.syms.every((c) => u.text.includes(c))) return;
      pos = fold(u.text).search(lit.re);
    } else {
      pos = u.n.indexOf(needle);
    }
    if (pos >= 0) visit(id, pos);
  };

  const lists: number[][] = [];
  for (const t of exact) {
    const l = ix.postings.get(t);
    if (!l) return;                             // a word the kho never has → nothing can match
    lists.push(l);
  }
  // Uint16: `mark` counts whole words per unit, and a pasted paragraph can hold 256+ distinct words —
  // a Uint8 count wrapped to 0 there and nothing matched (v1.41.1).
  const mark = new Uint16Array(ix.units.length);
  if (lists.length === 0) {
    // One word: every unit holding a word that starts with it, each once — capped at PREFIX_CAP
    // words, which only bites a one- or two-letter prefix still being typed.
    for (const t of prefixTokens(ix, prefix)) for (const id of ix.postings.get(t) ?? []) if (!mark[id]) { mark[id] = 1; check(id); }
    return;
  }
  // Several words: a unit needs every whole word (counted in `mark`) plus one starting with the
  // last; walk the shortest whole-word list and test the rest by mark.
  for (const l of lists) for (const id of l) mark[id]++;
  // No prefix cap here: the whole words already narrow the set, and a cap would drop finished
  // queries like "dieu 2" whose last word shares its first letter with 400+ other words.
  const inPrefix = new Uint8Array(ix.units.length);
  for (const t of prefixTokens(ix, prefix, Infinity)) for (const id of ix.postings.get(t) ?? []) inPrefix[id] = 1;
  const need = lists.length;
  let shortest = lists[0];
  for (const l of lists) if (l.length < shortest.length) shortest = l;
  for (const id of shortest) if (mark[id] === need && inPrefix[id]) check(id);
}

/**
 * Every unit matching the query, best first: match position (earlier first), then shorter unit,
 * then index order.
 */
export function search(ix: SearchIndex, query: string, limit = Infinity): Hit[] {
  const found: { id: number; pos: number; len: number }[] = [];
  eachMatch(ix, query, (id, pos) => found.push({ id, pos, len: ix.units[id].text.length }));
  found.sort((a, b) => (a.pos - b.pos) || (a.len - b.len) || (a.id - b.id));
  const matched = parseQuery(query).seq.length;
  return found.slice(0, limit).map(({ id }) => {
    const unit = ix.units[id];
    return { unit, doc: ix.docs[unit.d], matched };
  });
}

/** One document in the Search screen: how many units match, the one to show, its rank score. */
export interface DocHit { doc: IndexDoc; count: number; best: Hit; score: number }
export interface DocSearchResult { total: number; docs: DocHit[] }

// BM25 at document level. No IDF: the whole query is one "term", so IDF is the same for every
// document and cannot change the order. Picked over raw counts (thick reference volumes always
// won) and over boosting name matches (pulled off-topic files up) — see
// Docs/perf/2026-10-06-search-lech-thu-tu-kho.md.
const BM25_K1 = 1.2;
const BM25_B = 0.75;

/**
 * Matches grouped by document, densest first. `best` is the document's first unit in `search`
 * order and `count` its number of matching units, so a card shows exactly the first row and the
 * row count of the in-document sheet (`search` over that one document).
 */
export function searchDocs(ix: SearchIndex, query: string): DocSearchResult {
  if (!ix.docLen) {
    ix.docLen = new Array<number>(ix.docs.length).fill(0);
    for (const u of ix.units) ix.docLen[u.d]++;
  }
  const dl = ix.docLen;
  // One pass, no sort of the matches: a document only needs its count and its best unit (the
  // same order `search` uses). Sorting ~100k matches of a broad prefix took 211 ms (06/10).
  const count = new Int32Array(ix.docs.length);
  const bestId = new Int32Array(ix.docs.length).fill(-1);
  const bestPos = new Float64Array(ix.docs.length);
  const bestLen = new Float64Array(ix.docs.length);
  let total = 0;
  eachMatch(ix, query, (id, pos) => {
    const d = ix.units[id].d;
    const len = ix.units[id].text.length;
    total++;
    count[d]++;
    const b = bestId[d];
    if (b < 0 || pos < bestPos[d] || (pos === bestPos[d] && (len < bestLen[d] || (len === bestLen[d] && id < b)))) {
      bestId[d] = id; bestPos[d] = pos; bestLen[d] = len;
    }
  });
  if (total === 0) return { total: 0, docs: [] };

  // Only documents with text: an image-only one (0 units) never matches, and counting it pulled avgdl
  // down, which over-penalised long documents — enough to swap two cards (v1.41.1).
  let withText = 0;
  for (const n of dl) if (n > 0) withText++;
  const avgdl = ix.units.length / Math.max(1, withText);
  const matched = parseQuery(query).seq.length;
  const docs: { d: number; hit: DocHit }[] = [];
  for (let d = 0; d < ix.docs.length; d++) {
    const c = count[d];
    if (c === 0) continue;
    const unit = ix.units[bestId[d]];
    const score = (c * (BM25_K1 + 1)) / (c + BM25_K1 * (1 - BM25_B + BM25_B * dl[d] / avgdl));
    docs.push({ d, hit: { doc: ix.docs[d], count: c, best: { unit, doc: ix.docs[d], matched }, score } });
  }
  docs.sort((a, b) => (b.hit.score - a.hit.score) || (b.hit.count - a.hit.count) || (a.d - b.d));
  return { total, docs: docs.map((x) => x.hit) };
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
