export const UNFILED = 'Chưa phân loại';

// Một số nguồn share phơi tên file dạng "<tên>.<ext>.tmp" (file staging tạm / tải dở).
// App copy verbatim → worker skip ".tmp" → kẹt. Strip đuôi tạm để lộ tên thật trước khi ghi.
const TEMP_SUFFIX = /\.(tmp|crdownload|part|download|partial|opdownload)$/i;
export function stripTempSuffix(name: string): string {
  let out = name.trim();
  while (TEMP_SUFFIX.test(out)) out = out.replace(TEMP_SUFFIX, '');
  return out;
}

// Tên file trong _inbox: "[<môn>] <tên gốc>". Tiền tố là interface M6↔M7.
// Strip đuôi tạm của tên gốc để không bao giờ ghi "[<môn>] x.pdf.tmp".
export function makeInboxName(monName: string, originalName: string): string {
  return `[${monName}] ${stripTempSuffix(originalName)}`;
}

// Tách "[<môn>] <tên>" -> {mon, name}; null nếu không khớp mẫu.
export function parseInboxPrefix(fileName: string): { mon: string; name: string } | null {
  const m = /^\[([^\]]+)\]\s(.+)$/.exec(fileName);
  if (!m) return null;
  return { mon: m[1], name: m[2] };
}
