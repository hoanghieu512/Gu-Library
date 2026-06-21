import { IonIcon } from '@ionic/react';
import { helpOutline } from 'ionicons/icons';

// Ô đại diện cho "Chưa phân loại" — KHÔNG phải môn thật nên dùng ô xám viền đứt
// (khác swatch màu của môn). Dùng chung cho Home + sheet để concept nhất quán.
export default function UnfiledSwatch() {
  return (
    <div style={{
      width: 44, height: 44, borderRadius: 8, flex: '0 0 auto',
      border: '1px dashed var(--gu-grey)', color: 'var(--gu-grey)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <IonIcon icon={helpOutline} style={{ fontSize: 20 }} />
    </div>
  );
}
