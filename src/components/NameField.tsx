import { useState } from 'react';
import type { CSSProperties } from 'react';
import { IonInput } from '@ionic/react';

interface Props {
  noun: string;                 // "môn" | "thư mục" → nhãn "Tên môn" + placeholder "Nhập tên môn…"
  value: string;
  onChange: (v: string) => void;
  error: string;
}

// Ô nhập tên floating label TỰ VẼ (v1.21.0, tách dùng chung Tạo + Đổi tên v1.22.0): viền + nhãn dựng ở
// light-DOM, nhãn canh giữa `top:50% + translateY(-50%)` THẬT → render GIỐNG HỆT mọi WebView (KHÔNG
// dùng floating-label native Ionic vốn canh bằng translateY(100%) trong shadow DOM → lệch theo WebView).
// IonInput chỉ lo phần nhập (trong suốt, tắt gạch-chân/highlight mặc định). 4 trạng thái: mặc-định
// (nhãn giữa ô) / focus (nhãn trượt lên viền nâu, nền kem cắt viền, placeholder gợi ý) / đã-nhập / lỗi.
export default function NameField({ noun, value, onChange, error }: Props) {
  const [focused, setFocused] = useState(false);
  const floated = focused || value.length > 0;
  const accent = error ? 'var(--ion-color-danger)' : focused ? 'var(--gu-brown)' : 'var(--gu-grey)';

  return (
    <>
      <div
        style={{
          position: 'relative', display: 'flex', alignItems: 'stretch', minHeight: 54,
          border: `${focused || error ? 2 : 1.5}px solid ${accent}`, borderRadius: 10,
          background: 'var(--gu-cream)', marginTop: 4,
          transition: 'border-color 150ms ease-out',
        }}
      >
        <IonInput
          aria-label={`Tên ${noun}`}
          value={value}
          onIonInput={(e) => onChange(String(e.detail.value ?? ''))}
          onIonFocus={() => setFocused(true)}
          onIonBlur={() => setFocused(false)}
          placeholder={floated ? `Nhập tên ${noun}…` : ''}
          clearInput
          style={{
            flex: 1, '--background': 'transparent', '--padding-start': '12px',
            '--color': 'var(--gu-brown-deep)', fontSize: '16px',
            // Tắt gạch chân + highlight mặc định của IonInput không-fill (viền đã do div ngoài vẽ).
            '--border-width': '0', '--highlight-height': '0',
          } as CSSProperties}
        />
        <span
          aria-hidden
          style={{
            position: 'absolute', left: 10, pointerEvents: 'none', whiteSpace: 'nowrap',
            maxWidth: 'calc(100% - 24px)', overflow: 'hidden', textOverflow: 'ellipsis',
            top: floated ? 0 : '50%',
            transform: floated ? 'translateY(-50%) scale(0.8)' : 'translateY(-50%)',
            transformOrigin: 'left center',
            padding: '0 6px', background: floated ? 'var(--gu-cream)' : 'transparent',
            fontSize: 16, fontWeight: floated ? 600 : 400, lineHeight: 1, color: accent,
            transition: 'top 190ms ease-out, transform 190ms ease-out, color 150ms ease-out',
          }}
        >
          Tên {noun}
        </span>
      </div>
      {error ? (
        <p style={{ color: 'var(--ion-color-danger)', fontSize: 13, margin: '6px 0 0', paddingInlineStart: 4 }}>{error}</p>
      ) : null}
    </>
  );
}
