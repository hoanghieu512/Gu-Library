import { useState } from 'react';
import type { CSSProperties } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
} from '@ionic/react';
import { addCircleOutline, shareOutline, documentTextOutline } from 'ionicons/icons';
import { Saf } from '../plugins/saf';
import type { SharedFile } from '../plugins/shareTarget';
import ImportDestinationFlow from '../import/ImportDestinationFlow';

// Đường nhập dự phòng (spec 5.3): chọn file từ máy → sheet chọn đích v1.3.0 → copy `_inbox/`.
// B3: CHỈ áp da (header serif + thẻ giấy + nút nâu). Đường đi của file, quy tắc đặt tên và
// `_inbox/` GIỮ NGUYÊN TUYỆT ĐỐI — beat này không đụng một dòng nào của luồng nhập.
export default function AddPage() {
  const [batch, setBatch] = useState<SharedFile[]>([]);

  const pickFiles = async () => {
    try {
      const { files } = await Saf.pickFiles();
      if (files.length > 0) setBatch(files); // huỷ picker → files rỗng → không mở sheet
    } catch { /* huỷ / lỗi → không side effect */ }
  };

  return (
    <IonPage>
      <IonHeader><IonToolbar><IonTitle className="gu-title">Thêm</IonTitle></IonToolbar></IonHeader>
      {/* Lề ngang qua biến --padding-* (class ion-padding vô hiệu trên IonContent) → khớp Home. */}
      <IonContent style={{ '--padding-start': '16px', '--padding-end': '16px', '--padding-top': '16px', '--padding-bottom': '16px' } as CSSProperties}>
        {/* Thẻ giấy giải thích — cùng khuôn thẻ-rời với các màn khác */}
        <div style={{
          background: 'var(--gu-paper-2)', borderRadius: 14, padding: 16,
          display: 'flex', gap: 12, alignItems: 'flex-start',
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, flex: '0 0 auto',
            background: 'rgba(117,66,14,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <IonIcon icon={documentTextOutline} style={{ color: 'var(--gu-brown)', fontSize: 20 }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--gu-serif)', fontWeight: 700, color: 'var(--gu-brown-deep)', fontSize: 15 }}>
              Nhập tài liệu vào kho
            </div>
            <p style={{ color: 'var(--gu-grey)', fontSize: 13.5, margin: '4px 0 0', lineHeight: 1.5 }}>
              Chọn file từ máy (PDF / Word / PowerPoint), rồi chọn môn — thư mục đích.
            </p>
          </div>
        </div>

        <IonButton
          expand="block" shape="round" onClick={pickFiles}
          style={{ marginTop: 16, height: 48 } as CSSProperties}
        >
          <IonIcon slot="start" icon={addCircleOutline} />
          Chọn file từ máy
        </IonButton>

        {/* Nhắc đường vào CÒN LẠI (đã có sẵn từ M6): chia sẻ từ app khác. Chỉ là chữ nhắc — không
            phải nút, không đẻ luồng mới. */}
        <div style={{
          display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center',
          marginTop: 18, color: 'var(--gu-grey)', fontSize: 12.5,
        }}>
          <IonIcon icon={shareOutline} style={{ fontSize: 15 }} />
          Hoặc chia sẻ file từ app khác sang Gú's Library
        </div>

        <ImportDestinationFlow batch={batch} onClear={() => setBatch([])} onAddMore={pickFiles} />
      </IonContent>
    </IonPage>
  );
}
