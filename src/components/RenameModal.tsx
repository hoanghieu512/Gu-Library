import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent,
} from '@ionic/react';
import NameField from './NameField';

interface Props {
  isOpen: boolean;
  noun: string;                                   // "môn" | "thư mục"
  currentName: string;                            // điền sẵn tên hiện tại
  onSave: (newName: string) => Promise<string | null>; // trả chuỗi lỗi (hiện trong sheet) hoặc null = xong
  onClose: () => void;
}

// Sheet Đổi tên môn/thư mục (v1.22.0): ô NameField điền sẵn tên hiện tại, nút "Lưu". Toàn bộ
// validate/trùng/chặn-pending nằm trong `onSave` (repo renameFolder) — lỗi trả về hiện đỏ trong sheet.
export default function RenameModal({ isOpen, noun, currentName, onSave, onClose }: Props) {
  const [name, setName] = useState(currentName);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isOpen) { setName(currentName); setError(''); setBusy(false); }
  }, [isOpen, currentName]);

  const handleSave = async () => {
    setBusy(true);
    const err = await onSave(name);
    setBusy(false);
    if (err) setError(err); else onClose();
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle className="gu-title">Đổi tên {noun}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose} disabled={busy}>Huỷ</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent style={{ '--padding-start': '16px', '--padding-end': '16px', '--padding-top': '16px', '--padding-bottom': '16px' } as CSSProperties}>
        <NameField noun={noun} value={name} error={error} onChange={(v) => { setName(v); setError(''); }} />
        <IonButton expand="block" style={{ marginTop: 28 }} onClick={handleSave} disabled={busy}>
          {busy ? 'Đang lưu…' : 'Lưu'}
        </IonButton>
      </IonContent>
    </IonModal>
  );
}
