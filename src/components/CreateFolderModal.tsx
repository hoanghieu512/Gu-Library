import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent,
  IonInput, IonLabel,
} from '@ionic/react';
import { MON_PALETTE } from '../storage/palette';
import { validateFolderName } from '../storage/folderName';

interface Props {
  isOpen: boolean;
  title: string;
  noun: string;        // ngữ cảnh: "môn" | "thư mục" — nhãn/placeholder suy từ đây (hết hardcode)
  withColor: boolean;
  existingNames: string[];
  onCreate: (name: string, color?: string) => Promise<void>;
  onClose: () => void;
}

export default function CreateFolderModal({
  isOpen, title, noun, withColor, existingNames, onCreate, onClose,
}: Props) {
  const [name, setName] = useState('');
  const [colorIdx, setColorIdx] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [focused, setFocused] = useState(false);

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setName('');
      setColorIdx(0);
      setError('');
      setBusy(false);
      setFocused(false);
    }
  }, [isOpen]);

  // Nhãn nổi lên viền khi đang gõ (focus) hoặc đã có chữ.
  const floated = focused || name.length > 0;
  const accent = error ? 'var(--ion-color-danger)' : focused ? 'var(--gu-brown)' : 'var(--gu-grey)';

  const handleCreate = async () => {
    const result = validateFolderName(name);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const value = result.value;
    if (existingNames.includes(value)) {
      setError('Đã tồn tại');
      return;
    }
    setBusy(true);
    try {
      await onCreate(value, withColor ? MON_PALETTE[colorIdx] : undefined);
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('exists')) {
        setError('Đã tồn tại');
      } else {
        setError(msg || 'Lỗi không xác định');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle className="gu-title">{title}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose} disabled={busy}>Huỷ</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      {/* Lề ngang qua biến --padding-* (class ion-padding vô hiệu trên IonContent) → khớp Home. */}
      <IonContent style={{ '--padding-start': '16px', '--padding-end': '16px', '--padding-top': '16px', '--padding-bottom': '16px' } as CSSProperties}>
        {/* Ô nhập floating label TỰ VẼ (v1.21.0): viền + nhãn do đệ dựng ở light-DOM, nhãn canh giữa
            bằng `top:50% + translateY(-50%)` THẬT → render GIỐNG HỆT mọi WebView (khác bản floating-label
            shadow của Ionic vốn dùng translateY(100%) phụ thuộc metric WebView → lệch khác nhau mỗi máy).
            IonInput chỉ lo phần nhập (trong suốt, KHÔNG viền/nhãn riêng). 4 trạng thái: mặc-định (nhãn
            giữa ô) / focus (nhãn trượt lên viền + placeholder gợi ý, viền+nhãn nâu) / đã-nhập (nhãn trên
            viền) / lỗi (viền+nhãn+dòng lỗi đỏ). */}
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
            value={name}
            onIonInput={(e) => { setName(String(e.detail.value ?? '')); setError(''); }}
            onIonFocus={() => setFocused(true)}
            onIonBlur={() => setFocused(false)}
            placeholder={floated ? `Nhập tên ${noun}…` : ''}
            clearInput
            style={{
              flex: 1, '--background': 'transparent', '--padding-start': '12px',
              '--color': 'var(--gu-brown-deep)', fontSize: '16px',
              // Tắt gạch chân + đường highlight mặc định của IonInput không-fill (viền đã do div ngoài vẽ).
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

        {withColor && (
          <div style={{ marginTop: 20 }}>
            <IonLabel style={{ fontWeight: 600 }}>Màu môn</IonLabel>
            <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
              {MON_PALETTE.map((hex, i) => (
                <button
                  key={hex}
                  onClick={() => setColorIdx(i)}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 8,
                    background: hex,
                    border: colorIdx === i ? '3px solid var(--ion-color-primary)' : '3px solid transparent',
                    cursor: 'pointer',
                    padding: 0,
                    outline: colorIdx === i ? '2px solid #fff' : 'none',
                    outlineOffset: colorIdx === i ? '-5px' : undefined,
                  }}
                  aria-label={`Màu ${hex}`}
                  aria-pressed={colorIdx === i}
                />
              ))}
            </div>
          </div>
        )}

        <IonButton
          expand="block"
          style={{ marginTop: 28 }}
          onClick={handleCreate}
          disabled={busy}
        >
          {busy ? 'Đang tạo…' : 'Tạo'}
        </IonButton>
      </IonContent>
    </IonModal>
  );
}
