import { IonIcon } from '@ionic/react';
import { alertCircle } from 'ionicons/icons';
import { KHO_UNREADABLE_MESSAGE } from '../storage/khoHidden';

// Shown in place of the kho's contents while Android will not list it (see khoHidden.ts), so an
// empty list never reads as "the kho is empty" and nothing on the screen offers to write.
export default function KhoUnreadableNotice() {
  return (
    <div role="alert" style={{
      display: 'flex', gap: 12, alignItems: 'flex-start', background: 'var(--gu-paper-2)',
      borderRadius: 12, padding: '14px 16px', margin: '16px 0 0', boxShadow: '0 2px 6px rgba(0,0,0,.12)',
    }}>
      <IonIcon icon={alertCircle} style={{ fontSize: 26, color: 'var(--ion-color-danger)', flex: '0 0 auto' }} />
      <div>
        <div style={{ fontFamily: 'var(--gu-serif)', fontWeight: 700, color: 'var(--gu-brown-deep)', fontSize: 16 }}>
          Không đọc được kho
        </div>
        <div style={{ fontSize: 14, color: 'var(--gu-brown-deep)', marginTop: 4, lineHeight: 1.45 }}>
          {KHO_UNREADABLE_MESSAGE}
        </div>
      </div>
    </div>
  );
}
