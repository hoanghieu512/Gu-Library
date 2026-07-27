// Dòng phụ dưới tên THƯ MỤC trong màn Trong Môn (Tuyến B — B2b.1): "bên trong có gì" mà khỏi mở.
// Đếm TRỰC TIẾP (con ngay dưới), KHÔNG đệ quy — để con số đúng bằng thứ sẽ thấy khi chạm vào.
// (Dialog xóa vẫn dùng đếm ĐỆ QUY `foldCounts` vì nó trả lời câu khác: "xóa cái này thì mất bao nhiêu".)
export function folderSubtitle(folders: number, docs: number): string {
  const parts: string[] = [];
  if (folders > 0) parts.push(`${folders} thư mục`);
  if (docs > 0) parts.push(`${docs} tài liệu`);
  return parts.length === 0 ? 'Trống' : parts.join(' · ');
}
