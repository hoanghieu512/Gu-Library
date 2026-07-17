export const UNFILED = 'Chưa phân loại';

// Một số nguồn share phơi tên file dạng "<tên>.<ext>.tmp" (file staging tạm / tải dở).
// App copy verbatim → worker skip ".tmp" → kẹt. Strip đuôi tạm để lộ tên thật trước khi ghi.
const TEMP_SUFFIX = /\.(tmp|crdownload|part|download|partial|opdownload)$/i;
export function stripTempSuffix(name: string): string {
  let out = name.trim();
  while (TEMP_SUFFIX.test(out)) out = out.replace(TEMP_SUFFIX, '');
  return out;
}

// Tên file trong _inbox: lặp ngoặc mỗi cấp đường đích "[Môn][Con]... <tên gốc>"
// (interface app↔worker v0.9.0). path = mảng đoạn từ môn xuống; một cấp = một ngoặc.
// Strip đuôi tạm của tên gốc để không bao giờ ghi "...x.pdf.tmp".
export function makeInboxName(path: string[], originalName: string): string {
  const prefix = path.map((seg) => `[${seg}]`).join('');
  return `${prefix} ${stripTempSuffix(originalName)}`;
}

// Tách TOÀN BỘ đường dẫn ngoặc "[A][B][C] <tên>" -> ["A","B","C"] (đủ tầng, đúng thứ tự);
// null nếu không phải mẫu (không nhóm ngoặc đầu + space). Dùng để biết file chờ trong _inbox
// nằm dưới thư mục nào (chặn đổi tên khi còn file chờ dưới cây).
export function parseInboxPath(fileName: string): string[] | null {
  const m = /^((?:\[[^\]]+\])+)\s/.exec(fileName);
  if (!m) return null;
  const segs = [...m[1].matchAll(/\[([^\]]+)\]/g)].map((x) => x[1]);
  return segs.length ? segs : null;
}

// Tách tiền tố lồng "[Môn][Con]... <tên>" -> {mon = NGOẶC ĐẦU, name}; null nếu không khớp.
export function parseInboxPrefix(fileName: string): { mon: string; name: string } | null {
  const first = /^\[([^\]]+)\]/.exec(fileName);
  if (!first) return null;
  const name = fileName.replace(/^(?:\[[^\]]+\])+\s/, ''); // bỏ mọi nhóm ngoặc đầu + một space
  if (name === fileName) return null; // không có "space + tên" → không phải mẫu của ta
  return { mon: first[1], name };
}
