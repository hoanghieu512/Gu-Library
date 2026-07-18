const FORBIDDEN = /[/\\:*?"<>|[\]]/; // thêm [ ] (phá hợp đồng tiền tố "[Môn][Con]")
export type NameResult = { ok: true; value: string } | { ok: false; error: string };
export function validateFolderName(raw: string): NameResult {
  const value = raw.trim();
  if (!value) return { ok: false, error: 'Tên không được rỗng' };
  if (value.startsWith('_')) return { ok: false, error: 'Tên không được bắt đầu bằng "_"' };
  if (FORBIDDEN.test(value)) return { ok: false, error: 'Tên chứa ký tự cấm ( / \\ : * ? " < > | [ ] )' };
  return { ok: true, value };
}

// Câu báo trùng tên theo ngữ cảnh (dùng chung Tạo + Đổi tên).
export function dupFolderError(noun: string): string {
  return noun === 'môn' ? 'Môn đã tồn tại gòi dợ iu' : 'Thư mục cùng tên gòi dợ iu';
}

// Câu xác nhận Xóa: NÊU SỐ LƯỢNG thật (đệ quy) để Gú tự cân — KHÔNG dọa "không thể hoàn tác"
// (sai vì có .stversions ~30 ngày, và không phải giọng app — bài học v1.13.0). Rỗng → không "0 tài liệu".
export function deleteFolderMessage(name: string, docs: number, folders: number): string {
  const parts: string[] = [];
  if (docs > 0) parts.push(`${docs} tài liệu`);
  if (folders > 0) parts.push(`${folders} thư mục con`);
  if (parts.length === 0) return `“${name}” đang trống.`;
  return `Bên trong “${name}” có ${parts.join(' và ')}.`;
}
