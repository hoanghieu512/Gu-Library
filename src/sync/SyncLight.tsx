import { IonButton, IonIcon } from '@ionic/react';
import { checkmarkCircle, syncCircle, warningOutline, settingsOutline } from 'ionicons/icons';
import type { SyncState } from './useSyncStatus';

const MAP: Record<SyncState, { icon: string; color: string; label: string }> = {
  synced: { icon: checkmarkCircle, color: 'success', label: 'Đã đồng bộ' },
  syncing: { icon: syncCircle, color: 'warning', label: 'Đang đẩy…' },
  offline: { icon: warningOutline, color: 'danger', label: 'Chưa thấy mini PC' },
  unconfigured: { icon: settingsOutline, color: 'medium', label: 'Chưa cấu hình' },
};

export default function SyncLight({ state, onClick }: { state: SyncState; onClick: () => void }) {
  const m = MAP[state];
  return (
    <IonButton color={m.color} onClick={onClick} title={m.label} aria-label={m.label}>
      <IonIcon slot="icon-only" icon={m.icon} />
    </IonButton>
  );
}
