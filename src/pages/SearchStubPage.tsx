import type { CSSProperties } from 'react';
import { IonPage, IonHeader, IonToolbar, IonTitle, IonContent } from '@ionic/react';

// Lề ngang qua biến --padding-* (class ion-padding VÔ HIỆU trên IonContent) → khớp Home.
const PAD = { '--padding-start': '16px', '--padding-end': '16px', '--padding-top': '16px', '--padding-bottom': '16px' } as CSSProperties;

export default function SearchStubPage() {
  return (
    <IonPage>
      <IonHeader><IonToolbar><IonTitle>Tìm</IonTitle></IonToolbar></IonHeader>
      <IonContent style={PAD}><p>Tìm kiếm toàn văn — Phase 2.</p></IonContent>
    </IonPage>
  );
}
