// Readers for the app's accessible labels — the e2e tests check by relation (read a number off the
// screen, compare it elsewhere), so these must parse exactly what the app renders.

export interface Card { name: string; page: number; count: number }

/** "Xem cả 1.489 đoạn trong X" → { count: 1489, name: 'X' } (vi-VN thousands dot). */
export function parseXemCa(label: string): { count: number; name: string } | null {
  const m = /^Xem cả ([\d.]+) đoạn trong (.+)$/.exec(label.trim());
  return m ? { count: Number(m[1].replace(/\./g, '')), name: m[2] } : null;
}

/** "Mở X tại trang 24" → { name: 'X', page: 24 }. */
export function parseOpenAtPage(label: string): { name: string; page: number } | null {
  const m = /^Mở (.+) tại trang (\d+)$/.exec(label.trim());
  return m ? { name: m[1], page: Number(m[2]) } : null;
}

/** "Trang 24 / 38" → { page: 24, total: 38 }. */
export function parsePageFooter(text: string): { page: number; total: number } | null {
  const m = /Trang (\d+) \/ (\d+)/.exec(text);
  return m ? { page: Number(m[1]), total: Number(m[2]) } : null;
}

/**
 * Result cards from button labels in screen order: each "Mở X tại trang P" followed by
 * "Xem cả N đoạn trong X" for the same X. A card with one match has no "Xem cả" and is skipped.
 */
export function readCardFrom(labels: string[], index = 0): Card {
  const cards: Card[] = [];
  for (let i = 0; i < labels.length - 1; i++) {
    const open = parseOpenAtPage(labels[i]);
    const all = parseXemCa(labels[i + 1]);
    if (open && all && open.name === all.name) cards.push({ name: open.name, page: open.page, count: all.count });
  }
  if (cards.length <= index) throw new Error('câu tra mẫu không còn kết quả — đổi câu tra trong tests');
  return cards[index];
}
