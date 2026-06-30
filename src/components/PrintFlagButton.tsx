import { useState } from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { print, printOutline } from 'ionicons/icons';
import { setPrintFlag, clearPrintFlag } from '../print/printRepo';

// Nút tick "cần in" cho một tài liệu (đã có PDF). flagged = trạng thái hiện tại.
// onChanged() để caller reload sau khi toggle. stopPropagation: không kích hoạt mở viewer.
export default function PrintFlagButton({
  docUri, flagged, onChanged,
}: { docUri: string; flagged: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const toggle = async (ev: React.MouseEvent) => {
    ev.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      if (flagged) await clearPrintFlag(docUri);
      else await setPrintFlag(docUri);
      onChanged();
    } finally { setBusy(false); }
  };
  return (
    <IonButton
      fill="clear"
      onClick={toggle}
      disabled={busy}
      aria-label={flagged ? 'Bỏ cần in' : 'Đánh dấu cần in'}
      aria-pressed={flagged}
    >
      <IonIcon
        icon={flagged ? print : printOutline}
        style={{ color: flagged ? 'var(--gu-brown)' : 'var(--gu-grey)' }}
      />
    </IonButton>
  );
}
