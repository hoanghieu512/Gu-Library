// Đuôi các file cùng cụm của tài liệu <base> trong danh sách tên (name bắt đầu base + ".").
// Vd base "luat" → ["luat.pdf","luat.json","luat.print.json","luat.display.json"] (đuôi tính từ base).
export function clusterSuffixes(base: string, names: string[]): string[] {
  const out: string[] = [];
  for (const n of names) if (n.startsWith(base + '.')) out.push(n.slice(base.length));
  return out;
}

// Base không đụng ở đích cho CẢ cụm: né mọi <cand><suffix> trong existing. dedup "(k)" trước đuôi.
export function uniqueBase(base: string, existing: string[], suffixes: string[]): string {
  const has = (cand: string) => suffixes.some((s) => existing.includes(cand + s));
  if (!has(base)) return base;
  for (let k = 1; k < 1000; k++) {
    const cand = `${base} (${k})`;
    if (!has(cand)) return cand;
  }
  return base;
}
