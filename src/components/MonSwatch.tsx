const PALETTE = ['#75420E', '#553B08', '#8a5a2a', '#6b4f2a', '#9c6b3f'];

function colorFor(name: string, explicit?: string): string {
  if (explicit) return explicit;
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export default function MonSwatch({ name, color, icon }: { name: string; color?: string; icon?: string }) {
  const bg = colorFor(name, color);
  // icon override (từ _mon.json) cho phép một môn dùng chữ khác chữ cái đầu —
  // vd "Luật Đất đai" → "Đ" để khỏi đụng "Luật Công chứng" ("L").
  const initial = (icon?.trim() || name.trim()[0] || '?').toUpperCase();
  return (
    <div style={{
      width: 44, height: 44, borderRadius: 8, background: bg, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--gu-serif)', fontWeight: 700, fontSize: 20, flex: '0 0 auto',
    }}>{initial}</div>
  );
}
