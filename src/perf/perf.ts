// Thước đo hiệu năng NỘI BỘ — chỉ sống trong phiên (in-memory), KHÔNG ghi file, không đẻ
// file trong cây Syncthing. Marks = performance.now() diff + Map/array push → rẻ, không
// profiling thường trực nên không tự làm chậm cái đang đo (observer effect).
//
// Mỗi luồng có một điểm start (perfStart) và một điểm end (perfEnd) neo ở MỐC NGƯỜI DÙNG
// CẢM NHẬN (vẽ xong). coldStart đặc biệt: end = performance.now() (thời gian kể từ khi
// WebView nạp trang) — KHÔNG gồm khởi động native trước WebView.

export type FlowId =
  | 'coldStart' | 'openMon' | 'openDoc' | 'zoomCommit' | 'importBatch' | 'enterSelect';

export const FLOW_ORDER: FlowId[] = [
  'coldStart', 'openMon', 'openDoc', 'zoomCommit', 'importBatch', 'enterSelect',
];

export const FLOW_LABELS: Record<FlowId, string> = {
  coldStart: 'Khởi động → Trang chủ',
  openMon: 'Mở môn → danh sách tài liệu',
  openDoc: 'Mở tài liệu → trang đầu vẽ xong',
  zoomCommit: 'Commit zoom → bản nét',
  importBatch: 'Import lô → copy vào _inbox',
  enterSelect: 'Vào chế độ chọn nhiều',
};

const CAP = 30; // giữ tối đa 30 mẫu gần nhất mỗi luồng (phiên)
const starts = new Map<FlowId, number>();
const samples = new Map<FlowId, number[]>();
let coldDone = false;

function now(): number {
  return typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now();
}

/** Ghi mốc bắt đầu một luồng (ghi đè nếu luồng đó đang đo dở). */
export function perfStart(flow: FlowId): void {
  starts.set(flow, now());
}

/** Chốt một luồng: đẩy hiệu số kể từ perfStart tương ứng. No-op nếu không có start. */
export function perfEnd(flow: FlowId): void {
  const t0 = starts.get(flow);
  if (t0 === undefined) return;
  starts.delete(flow);
  record(flow, now() - t0);
}

/** Bỏ start còn treo mà KHÔNG ghi mẫu (vd luồng bị timeout/hủy). */
export function perfCancel(flow: FlowId): void {
  starts.delete(flow);
}

/** coldStart: gọi khi Trang chủ vẽ xong lần đầu. Chỉ tính một lần/phiên. */
export function perfColdReady(): void {
  if (coldDone) return;
  coldDone = true;
  record('coldStart', now());
}

/** Ghi thẳng một mẫu (ms). Né NaN/âm/vô cực. */
export function record(flow: FlowId, ms: number): void {
  if (!Number.isFinite(ms) || ms < 0) return;
  const arr = samples.get(flow) ?? [];
  arr.push(ms);
  if (arr.length > CAP) arr.shift();
  samples.set(flow, arr);
}

/** Chạy cb sau khi khung hình kế tiếp đã vẽ (double rAF) → neo mốc "vẽ xong trên màn". */
export function afterPaint(cb: () => void): void {
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => requestAnimationFrame(cb));
  } else {
    cb();
  }
}

export function median(xs: number[]): number {
  if (xs.length === 0) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export interface FlowStat {
  flow: FlowId; label: string; count: number;
  last: number; min: number; max: number; median: number;
}

export function perfStats(): FlowStat[] {
  return FLOW_ORDER.map((flow) => {
    const xs = samples.get(flow) ?? [];
    return {
      flow, label: FLOW_LABELS[flow], count: xs.length,
      last: xs.length ? xs[xs.length - 1] : 0,
      min: xs.length ? Math.min(...xs) : 0,
      max: xs.length ? Math.max(...xs) : 0,
      median: median(xs),
    };
  });
}

/** Bảng số đo dạng text thuần để dán ra ngoài lập baseline. */
export function perfReportText(meta: { version: string; mode: string }): string {
  const r = (n: number) => Math.round(n);
  const lines: string[] = [
    "Gú's Library — đo hiệu năng (phiên hiện tại)",
    `Phiên bản ${meta.version} · build ${meta.mode}`,
    'Đơn vị: ms · số đo chỉ có nghĩa trên máy thật / release build',
    '',
  ];
  for (const s of perfStats()) {
    lines.push(s.count === 0
      ? `${s.label}: (chưa đo)`
      : `${s.label}: gần nhất ${r(s.last)} · min ${r(s.min)} · median ${r(s.median)} · max ${r(s.max)} · n=${s.count}`);
  }
  return lines.join('\n');
}

/** Xóa toàn bộ số đo + cờ (dùng cho nút Reset và test). */
export function perfReset(): void {
  starts.clear();
  samples.clear();
  coldDone = false;
}
