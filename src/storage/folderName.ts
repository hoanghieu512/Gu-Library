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
