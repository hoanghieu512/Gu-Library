export const PRINT_FLAG_SUFFIX = '.print.json';

// Tên file companion cờ "cần in", đặt cạnh cặp pdf+json trong folder môn.
export function printFlagName(base: string): string {
  return `${base}${PRINT_FLAG_SUFFIX}`;
}

export function isPrintFlag(name: string): boolean {
  return name.endsWith(PRINT_FLAG_SUFFIX);
}

export function baseFromFlag(name: string): string {
  return name.slice(0, -PRINT_FLAG_SUFFIX.length);
}

// Tên file trong _print/: tiền tố môn để chống trùng giữa các môn.
export function printedNameFor(mon: string, base: string): string {
  return `[${mon}] ${base}.pdf`;
}

// Một file trong _print/ có phải là bản đã gửi của (mon, base) không?
// Khớp tên đúng HOẶC biến thể dedup "[mon] base (k).pdf" (copyToDir chèn " (k)" trước đuôi).
export function isSentMatch(entryName: string, mon: string, base: string): boolean {
  if (!entryName.toLowerCase().endsWith('.pdf')) return false;
  if (entryName === printedNameFor(mon, base)) return true;
  return entryName.startsWith(`[${mon}] ${base} (`);
}
