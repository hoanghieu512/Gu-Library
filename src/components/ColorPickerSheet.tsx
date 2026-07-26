import type { CSSProperties } from 'react';
import { MON_PALETTE } from '../storage/palette';
import GuSheet from './GuSheet';

// Sheet đổi màu môn (v1.28.0) — tái dùng bảng màu MON_PALETTE (8 màu sách luật, v1.28.1). Chạm một
// ô → onPick(hex) (đóng + ghi ngay). B2a: vỏ chuyển sang `GuSheet` — kèm SỬA lề: sheet này đang dùng
// `className="ion-padding"` trên IonContent, VÔ HIỆU (bài học v1.10.0) nên trước giờ không có lề.
export default function ColorPickerSheet({ isOpen, monName, current, onPick, onClose }: {
  isOpen: boolean; monName: string; current?: string; onPick: (color: string) => void; onClose: () => void;
}) {
  return (
    <GuSheet isOpen={isOpen} title={`Đổi màu · ${monName}`} onClose={onClose} breakpoint={0.42}>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
        {MON_PALETTE.map((hex) => (
          <button
            key={hex}
            onClick={() => onPick(hex)}
            aria-label={`Chọn màu ${hex}`}
            style={{
              width: 56, height: 56, borderRadius: 10, background: hex, padding: 0, cursor: 'pointer',
              border: current === hex ? '3px solid var(--ion-color-primary)' : '3px solid transparent',
              outline: current === hex ? '2px solid #fff' : 'none',
              outlineOffset: current === hex ? '-6px' : undefined,
            } as CSSProperties}
          />
        ))}
      </div>
    </GuSheet>
  );
}
