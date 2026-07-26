import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { IonButton } from '@ionic/react';
import NameField from './NameField';
import GuSheet from './GuSheet';

interface Props {
  isOpen: boolean;
  noun: string;                                   // "môn" | "thư mục"
  currentName: string;                            // điền sẵn tên hiện tại
  onSave: (newName: string) => Promise<string | null>; // trả chuỗi lỗi (hiện trong sheet) hoặc null = xong
  onClose: () => void;
}

// Đổi tên môn/thư mục (v1.22.0). B2a: vỏ chuyển sang `GuSheet` variant='full' — GIỮ dạng MODAL,
// KHÔNG dựng màn riêng dù prototype vẽ vậy (Reconcile Map xếp 9e vào nhóm reuse-chỉ-reskin).
// Ô nhập vẫn là `NameField` floating-label TỰ VẼ (v1.21.0) — KHÔNG quay lại floating-label native
// Ionic (canh trong shadow DOM → lệch ~14px giữa hai máy theo WebView). Nút X xoá nhanh = `clearInput`
// sẵn trong NameField. Toàn bộ validate/trùng/chặn-pending/case-only nằm trong `onSave` (renameFolder).
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
    <GuSheet
      isOpen={isOpen} variant="full"
      title={`Đổi tên ${noun}`}
      onClose={onClose} closeLabel="Huỷ" closeDisabled={busy}
    >
      <NameField noun={noun} value={name} error={error} onChange={(v) => { setName(v); setError(''); }} />
      {/* Nút Lưu NÂU LỚN (primary = nâu đậm, expand block) */}
      <IonButton
        expand="block" onClick={handleSave} disabled={busy}
        style={{ marginTop: 28, '--border-radius': '12px', height: 48 } as CSSProperties}
      >
        {busy ? 'Đang lưu…' : 'Lưu'}
      </IonButton>
    </GuSheet>
  );
}
