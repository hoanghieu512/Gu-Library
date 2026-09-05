import { IonChip, IonIcon, IonLabel } from '@ionic/react';
import { checkmarkCircle, syncCircle, warningOutline, settingsOutline } from 'ionicons/icons';
import type { SyncState } from '../sync/useSyncStatus';

// Export để màn Cài đặt dùng LẠI đúng bộ nhãn + màu này — KHÔNG đẻ nguồn chữ trạng thái thứ hai.
export const SYNC_MAP: Record<SyncState, { icon: string; color: string; label: string }> = {
  synced: { icon: checkmarkCircle, color: 'success', label: 'Đã đồng bộ' },
  syncing: { icon: syncCircle, color: 'warning', label: 'Đang đẩy…' },
  offline: { icon: warningOutline, color: 'danger', label: 'Chưa thấy Atomman' },
  unconfigured: { icon: settingsOutline, color: 'medium', label: 'Chưa cấu hình' },
};

export default function SyncPill({ state, onClick }: { state: SyncState; onClick: () => void }) {
  const m = SYNC_MAP[state];
  return (
    <IonChip color={m.color} onClick={onClick} aria-label={m.label} style={{ cursor: 'pointer' }}>
      <IonIcon icon={m.icon} />
      <IonLabel>{m.label}</IonLabel>
    </IonChip>
  );
}
