import { monColor } from '../lib/monColor';

// Avatar môn (v1.24.0) = Ô MÀU THUẦN, KHÔNG chữ cái. Màu là thứ Gú chủ động gán qua picker màu
// môn (v1.5.0) và nhớ; chữ cái là thứ máy tự suy — thường suy SAI/trùng với tên luật tiếng Việt
// (3 môn "Luật …" đều ra "L"). Bỏ cái tự-suy-sai, giữ cái người-chủ-động. KHÔNG đoán chữ "thông minh".
// `size` cho chỗ cần ô nhỏ hơn (header nhóm môn màn Đi in) — mặc định 44 như cũ.
export default function MonSwatch({ name, color, size = 44 }: { name: string; color?: string; size?: number }) {
  const bg = monColor(name, color);
  return (
    <div style={{ width: size, height: size, borderRadius: size < 30 ? 5 : 8, background: bg, flex: '0 0 auto' }} />
  );
}
