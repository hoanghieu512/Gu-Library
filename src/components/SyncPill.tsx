import { IonChip, IonIcon, IonLabel } from '@ionic/react';
import { checkmarkCircle, syncCircle, warningOutline, settingsOutline } from 'ionicons/icons';
import type { SyncState } from '../sync/useSyncStatus';

const MAP: Record<SyncState, { icon: string; color: string; label: string }> = {
  synced: { icon: checkmarkCircle, color: 'success', label: 'Đã đồng bộ' },
  syncing: { icon: syncCircle, color: 'warning', label: 'Đang đẩy…' },
  offline: { icon: warningOutline, color: 'danger', label: 'Chưa thấy mini PC' },
  unconfigured: { icon: settingsOutline, color: 'medium', label: 'Chưa cấu hình' },
};

export default function SyncPill({ state, onClick }: { state: SyncState; onClick: () => void }) {
  const m = MAP[state];
  return (
    <IonChip color={m.color} onClick={onClick} aria-label={m.label} style={{ cursor: 'pointer' }}>
      <IonIcon icon={m.icon} />
      <IonLabel>{m.label}</IonLabel>
    </IonChip>
  );
}
