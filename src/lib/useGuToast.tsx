import { useEffect, useRef, useState } from 'react';
import { IonToast } from '@ionic/react';
import { checkmarkCircle, alertCircle, reloadOutline, close } from 'ionicons/icons';

// Hook toast 3 trạng thái dùng CHUNG (tách từ FolderPage v1.11.0, chia sẻ v1.25.0): palette nâu/kem
// (color=primary + cssClass gu-toast), loading=icon quay persistent, success=tích xanh, error=đỏ đất;
// success/error tự đóng 3s + nút X. Dùng ở Home + màn duyệt + Viewer để MỌI thao tác (đơn lẫn lô)
// đều có phản hồi. `node` = phần tử <IonToast> đặt cuối trang; `toastResult/toastLoading` để bắn.
export function useGuToast() {
  const [toast, setToast] = useState<{
    open: boolean; message: string; cls: string; icon?: string; showClose: boolean;
  }>({ open: false, message: '', cls: '', showClose: false });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const clear = () => { if (timer.current) { clearTimeout(timer.current); timer.current = undefined; } };
  useEffect(() => () => clear(), []);

  // Loading: icon quay + text, persistent, KHÔNG đóng tay được (không nút X, không auto).
  const toastLoading = (msg: string) => {
    clear();
    setToast({ open: true, message: msg, cls: 'gu-toast gu-toast-loading', icon: reloadOutline, showClose: false });
  };
  // Success/Error: icon + text, tự đóng 3s + nút X.
  const toastResult = (msg: string, ok: boolean) => {
    clear();
    setToast({ open: true, message: msg, cls: `gu-toast gu-toast-${ok ? 'success' : 'error'}`, icon: ok ? checkmarkCircle : alertCircle, showClose: true });
    timer.current = setTimeout(() => setToast((t) => ({ ...t, open: false })), 3000);
  };

  const node = (
    <IonToast
      isOpen={toast.open}
      message={toast.message}
      cssClass={toast.cls}
      icon={toast.icon}
      color="primary"
      position="bottom"
      buttons={toast.showClose ? [{ icon: close, role: 'cancel' }] : undefined}
      onDidDismiss={() => { clear(); setToast((t) => ({ ...t, open: false })); }}
    />
  );

  return { toastLoading, toastResult, node };
}
