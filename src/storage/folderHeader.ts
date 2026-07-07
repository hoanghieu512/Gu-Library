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
