const PALETTE = ['#75420E', '#553B08', '#8a5a2a', '#6b4f2a', '#9c6b3f'];

function colorFor(name: string, explicit?: string): string {
  if (explicit) return explicit;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

// Avatar môn (v1.24.0) = Ô MÀU THUẦN, KHÔNG chữ cái. Màu là thứ Gú chủ động gán qua picker màu
// môn (v1.5.0) và nhớ; chữ cái là thứ máy tự suy — thường suy SAI/trùng với tên luật tiếng Việt
// (3 môn "Luật …" đều ra "L"). Bỏ cái tự-suy-sai, giữ cái người-chủ-động. KHÔNG đoán chữ "thông minh".
export default function MonSwatch({ name, color }: { name: string; color?: string }) {
  const bg = colorFor(name, color);
  return (
    <div style={{ width: 44, height: 44, borderRadius: 8, background: bg, flex: '0 0 auto' }} />
  );
}
