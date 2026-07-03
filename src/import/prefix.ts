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

// Tách tiền tố lồng "[Môn][Con]... <tên>" -> {mon = NGOẶC ĐẦU, name}; null nếu không khớp.
export function parseInboxPrefix(fileName: string): { mon: string; name: string } | null {
  const first = /^\[([^\]]+)\]/.exec(fileName);
  if (!first) return null;
  const name = fileName.replace(/^(?:\[[^\]]+\])+\s/, ''); // bỏ mọi nhóm ngoặc đầu + một space
  if (name === fileName) return null; // không có "space + tên" → không phải mẫu của ta
  return { mon: first[1], name };
}
