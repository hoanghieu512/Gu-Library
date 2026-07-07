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
  withColor: boolean;
  existingNames: string[];
  onCreate: (name: string, color?: string) => Promise<void>;
  onClose: () => void;
}

export default function CreateFolderModal({
  isOpen, title, withColor, existingNames, onCreate, onClose,
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
        <IonLabel position="stacked" style={{ fontWeight: 600, marginBottom: 4 }}>
          Tên
        </IonLabel>
        <IonInput
          value={name}
          onIonInput={(e) => {
            setName(String(e.detail.value ?? ''));
            setError('');
          }}
          placeholder="Nhập tên thư mục…"
          style={{
            border: '1px solid var(--ion-color-medium)',
            borderRadius: 8,
            padding: '4px 8px',
            marginTop: 6,
            marginBottom: 4,
          }}
          disabled={busy}
          clearInput
        />
        {error ? (
          <p style={{ color: 'var(--ion-color-danger)', marginTop: 4, fontSize: 13 }}>{error}</p>
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
