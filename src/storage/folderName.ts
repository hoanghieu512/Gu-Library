const FORBIDDEN = /[/\\:*?"<>|]/;
export type NameResult = { ok: true; value: string } | { ok: false; error: string };
export function validateFolderName(raw: string): NameResult {
  const value = raw.trim();
  if (!value) return { ok: false, error: 'Tên không được rỗng' };
  if (FORBIDDEN.test(value)) return { ok: false, error: 'Tên chứa ký tự cấm ( / \\ : * ? " < > | )' };
  return { ok: true, value };
}
