import { useEffect, useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel,
  IonNote,
} from '@ionic/react';
import { getRootUri, pickAndSaveRoot } from '../storage/repo';
import SyncSettings from '../sync/SyncSettings';

export default function SettingsPage() {
  const [root, setRoot] = useState<string | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);

  useEffect(() => { getRootUri().then(setRoot); }, []);

  const pick = async () => { await pickAndSaveRoot(); setRoot(await getRootUri()); };

  return (
    <IonPage>
      <IonHeader><IonToolbar><IonTitle>Cài đặt</IonTitle></IonToolbar></IonHeader>
      <IonContent className="ion-padding">
        <IonList>
          <IonItem button onClick={pick}>
            <IonLabel>
              <h2>Folder kho</h2>
              <IonNote>{root ?? 'Chưa chọn — bấm để chọn folder Syncthing'}</IonNote>
            </IonLabel>
          </IonItem>
          <IonItem button onClick={() => setSyncOpen(true)}>
            <IonLabel><h2>Đồng bộ (Syncthing)</h2><IonNote>API key + chọn mini PC</IonNote></IonLabel>
          </IonItem>
        </IonList>
        <SyncSettings isOpen={syncOpen} onClose={() => setSyncOpen(false)} />
      </IonContent>
    </IonPage>
  );
}
