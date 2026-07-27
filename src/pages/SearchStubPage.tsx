import type { CSSProperties } from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonIcon } from '@ionic/react';
import { searchOutline } from 'ionicons/icons';

// Lề ngang qua biến --padding-* (class ion-padding VÔ HIỆU trên IonContent) → khớp Home.
const PAD = { '--padding-start': '16px', '--padding-end': '16px', '--padding-top': '16px', '--padding-bottom': '16px' } as CSSProperties;

// B3 (8e) — áp da bề mặt RỖNG của màn Tìm.
// LƯU Ý TRUNG THỰC: tìm-toàn-văn là Phase 2, CHƯA có. Nên màn này chưa hề có trạng thái "có kết
// quả" để mà giữ, và cũng chưa có ô nhập để gõ — đây là bề mặt rỗng DUY NHẤT của màn lúc này.
// Khi Phase 2 dựng tìm thật thì bề mặt này thành ca "không tìm thấy gì", chữ sẽ phải đổi theo.
export default function SearchStubPage() {
  return (
    <IonPage>
      <IonHeader><IonToolbar><IonTitle className="gu-title">Tìm</IonTitle></IonToolbar></IonHeader>
      <IonContent style={PAD}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          textAlign: 'center', marginTop: '22vh', padding: '0 24px',
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', background: 'rgba(117,66,14,0.10)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            <IonIcon icon={searchOutline} style={{ fontSize: 34, color: 'var(--gu-brown)' }} />
          </div>
          <div style={{ fontFamily: 'var(--gu-serif)', fontWeight: 700, fontSize: 17, color: 'var(--gu-brown-deep)' }}>
            Chưa tìm được trong tài liệu
          </div>
          <p style={{ color: 'var(--gu-grey)', fontSize: 13.5, lineHeight: 1.6, margin: '8px 0 0' }}>
            Đang phát triển tính năng này. Bấy giờ dợ mở theo Môn ở trang chủ nha!
          </p>
        </div>
      </IonContent>
    </IonPage>
  );
}
