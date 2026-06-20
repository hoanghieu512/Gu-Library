export const UNFILED = 'Chưa phân loại';

// Tên file trong _inbox: "[<môn>] <tên gốc>". Tiền tố là interface M6↔M7.
export function makeInboxName(monName: string, originalName: string): string {
  return `[${monName}] ${originalName}`;
}

// Tách "[<môn>] <tên>" -> {mon, name}; null nếu không khớp mẫu.
export function parseInboxPrefix(fileName: string): { mon: string; name: string } | null {
  const m = /^\[([^\]]+)\]\s(.+)$/.exec(fileName);
  if (!m) return null;
  return { mon: m[1], name: m[2] };
}
