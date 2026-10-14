import { IonChip, IonIcon, IonLabel } from '@ionic/react';
import type { SyncState } from '../sync/useSyncStatus';
import { SYNC_MAP } from '../sync/syncLabels';

export default function SyncPill({ state, onClick }: { state: SyncState; onClick: () => void }) {
  const m = SYNC_MAP[state];
  return (
    <IonChip color={m.color} onClick={onClick} aria-label={m.label} style={{ cursor: 'pointer' }}>
      <IonIcon icon={m.icon} />
      <IonLabel>{m.label}</IonLabel>
    </IonChip>
  );
}
