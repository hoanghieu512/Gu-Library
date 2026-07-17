import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent,
  IonLabel,
} from '@ionic/react';
import { MON_PALETTE } from '../storage/palette';
import { validateFolderName, dupFolderError } from '../storage/folderName';
import NameField from './NameField';

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

  // Reset when opened
  useEffect(() => {
    if (isOpen) {
      setName('');
      setColorIdx(0);
      setError('');
      setBusy(false);
    }
  }, [isOpen]);

  const handleCreate = async () => {
    const result = validateFolderName(name);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    const value = result.value;
    // Trùng KHÔNG PHÂN BIỆT HOA/THƯỜNG (đĩa Samsung case-insensitive → "Slide" vs "slide" đụng nhau,
    // provider tự đẻ "slide (1)"). Chặn theo case-insensitive để không bao giờ ra "(1)".
    const lower = value.toLowerCase();
    if (existingNames.some((n) => n.toLowerCase() === lower)) {
      setError(dupFolderError(noun));
      return;
    }
    setBusy(true);
    try {
      await onCreate(value, withColor ? MON_PALETTE[colorIdx] : undefined);
      onClose();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('exists')) {
        setError(dupFolderError(noun));
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
        <NameField noun={noun} value={name} error={error} onChange={(v) => { setName(v); setError(''); }} />

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
