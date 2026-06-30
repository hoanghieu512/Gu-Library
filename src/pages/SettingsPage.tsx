import { useEffect, useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel,
  IonNote,
} from '@ionic/react';
import { App } from '@capacitor/app';
import { getRootUri, pickAndSaveRoot } from '../storage/repo';
import SyncSettings from '../sync/SyncSettings';

export default function SettingsPage() {
  const [root, setRoot] = useState<string | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);
  const [version, setVersion] = useState<string>(__APP_VERSION__);

  useEffect(() => { getRootUri().then(setRoot); }, []);
  useEffect(() => {
    // Ưu tiên version native (versionName ← package.json lúc build); web/dev giữ __APP_VERSION__.
    App.getInfo().then((info) => setVersion(info.version)).catch(() => { /* không phải native */ });
  }, []);

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
        <p style={{ textAlign: 'center', color: 'var(--gu-grey)', fontSize: 13, marginTop: 24 }}>
          Phiên bản {version}
        </p>
      </IonContent>
    </IonPage>
  );
}
