// Readers for the app's accessible labels — the e2e tests check by relation (read a number off the
// screen, compare it elsewhere), so these must parse exactly what the app renders.

export interface Card { name: string; mon: string; page: number; count: number }

// Since 1.41.1 the result labels name the subject: "(môn M)". A document name may hold parentheses,
// a subject (a top-level folder) does not — the greedy name group leaves the last "(môn …)" alone.

/** "Xem cả 1.489 đoạn trong X (môn M)" → { count: 1489, name: 'X', mon: 'M' } (vi-VN thousands dot). */
export function parseXemCa(label: string): { count: number; name: string; mon: string } | null {
  const m = /^Xem cả ([\d.]+) đoạn trong (.+) \(môn ([^()]+)\)$/.exec(label.trim());
  return m ? { count: Number(m[1].replace(/\./g, '')), name: m[2], mon: m[3] } : null;
}

/** "Mở X (môn M) tại trang 24" → { name: 'X', mon: 'M', page: 24 }. */
export function parseOpenAtPage(label: string): { name: string; mon: string; page: number } | null {
  const m = /^Mở (.+) \(môn ([^()]+)\) tại trang (\d+)$/.exec(label.trim());
  return m ? { name: m[1], mon: m[2], page: Number(m[3]) } : null;
}

/** Continue Reading card "Đọc tiếp X, trang 3 / 8" → { name: 'X', page: 3, total: 8 }. */
export function parseResume(label: string): { name: string; page: number; total: number } | null {
  const m = /^Đọc tiếp (.+), trang (\d+) \/ (\d+)$/.exec(label.trim());
  return m ? { name: m[1], page: Number(m[2]), total: Number(m[3]) } : null;
}

/** "Trang 24 / 38" → { page: 24, total: 38 }. */
export function parsePageFooter(text: string): { page: number; total: number } | null {
  const m = /Trang (\d+) \/ (\d+)/.exec(text);
  return m ? { page: Number(m[1]), total: Number(m[2]) } : null;
}

/**
 * The first card at or after `fromIndex` whose "Xem cả" label is unique on screen. Labels name the
 * subject since 1.41.1, so two copies in two subjects differ; two files with the same name in two
 * folders of ONE subject still share a label, and agent-device refuses an ambiguous tap
 * (AMBIGUOUS_MATCH) — `.first()` does not resolve it at the engine level.
 */
export function uniqueCardFrom(labels: string[], fromIndex = 0): Card {
  const cards = cardsFrom(labels);
  for (let i = fromIndex; i < cards.length; i++) {
    const label = `Xem cả ${cards[i].count.toLocaleString('vi-VN')} đoạn trong ${cards[i].name} (môn ${cards[i].mon})`;
    if (labels.filter((l) => l === label).length === 1) return cards[i];
  }
  const fix = ' — đổi câu tra trong tests';
  if (!labels.some((l) => parseOpenAtPage(l))) throw new Error(`câu tra mẫu không còn kết quả${fix}`);
  if (cards.length <= fromIndex) {
    throw new Error(`câu tra mẫu chỉ còn ${cards.length} thẻ có nút "Xem cả" (thẻ 1 đoạn không có nút này), test cần thẻ thứ ${fromIndex + 1}${fix}`);
  }
  throw new Error(`mọi thẻ có "Xem cả" từ thẻ thứ ${fromIndex + 1} đều trùng nhãn (hai file cùng tên trong cùng một môn)${fix}`);
}

/**
 * Result cards from button labels in screen order: each "Mở X (môn M) tại trang P" followed by
 * "Xem cả N đoạn trong X (môn M)" for the same X and M. A card with one match has no "Xem cả" and
 * is skipped.
 */
function cardsFrom(labels: string[]): Card[] {
  const cards: Card[] = [];
  for (let i = 0; i < labels.length - 1; i++) {
    const open = parseOpenAtPage(labels[i]);
    const all = parseXemCa(labels[i + 1]);
    if (open && all && open.name === all.name && open.mon === all.mon) cards.push({ name: open.name, mon: open.mon, page: open.page, count: all.count });
  }
  return cards;
}
