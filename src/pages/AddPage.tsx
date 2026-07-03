import { useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonIcon,
} from '@ionic/react';
import { addCircleOutline } from 'ionicons/icons';
import { Saf } from '../plugins/saf';
import type { SharedFile } from '../plugins/shareTarget';
import ImportDestinationFlow from '../import/ImportDestinationFlow';

// Đường nhập dự phòng (spec 5.3): chọn file từ máy → sheet chọn đích v1.3.0 → copy _inbox/.
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
      <IonHeader><IonToolbar><IonTitle>Thêm</IonTitle></IonToolbar></IonHeader>
      <IonContent className="ion-padding">
        <p style={{ color: 'var(--gu-grey)' }}>
          Chọn file từ máy (PDF / Word / PowerPoint) để nhập vào kho. Sau khi chọn, chọn môn / thư mục đích.
        </p>
        <IonButton expand="block" shape="round" onClick={pickFiles}>
          <IonIcon slot="start" icon={addCircleOutline} />
          Chọn file từ máy
        </IonButton>
        <ImportDestinationFlow batch={batch} onClear={() => setBatch([])} />
      </IonContent>
    </IonPage>
  );
}
