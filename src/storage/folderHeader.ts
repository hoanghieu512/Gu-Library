// Tiêu đề header động theo path (Option C, spec 4.1 kho lồng sâu tùy ý):
//   cấp 1 (môn)      → tên môn
//   cấp 2            → "Môn / Thư mục"
//   cấp ≥3           → "… / Cha / Hiện tại" (chỉ giữ 2 tầng cuối để header hẹp Flip gập không tràn)
// `segs` = các đoạn tên folder từ môn xuống (relPath tách '/'). Không hardcode số tầng.
export function folderHeaderTitle(segs: string[]): string {
  const s = segs.filter(Boolean);
  if (s.length === 0) return 'Môn / Chương'; // fallback (không resolve được path)
  if (s.length === 1) return s[0];
  if (s.length === 2) return `${s[0]} / ${s[1]}`;
  return `… / ${s[s.length - 2]} / ${s[s.length - 1]}`;
}

// Phụ đề định vị "Đang đọc dở" (v1.24.0): môn + đường dẫn thư mục con của tài liệu, RÚT GỌN theo
// ĐÚNG luật `…` của breadcrumb (folderHeaderTitle v1.15.0/v1.20.0) — cấm logic định vị thứ hai.
// `relPath` = path tới FILE (gồm tên file ở cuối) → bỏ đoạn cuối, còn các đoạn thư mục từ môn xuống:
//   tài liệu ngay trong folder môn → chỉ tên môn (không `·`/`…` thừa); sâu → "… / Cha / Hiện tại".
export function readingLocator(relPath: string): string {
  const segs = relPath.split('/').filter(Boolean);
  const folderSegs = segs.slice(0, -1);
  if (folderSegs.length === 0) return segs[0] ?? ''; // tài liệu ngay gốc (không xảy ra thực tế)
  return folderHeaderTitle(folderSegs);
}
