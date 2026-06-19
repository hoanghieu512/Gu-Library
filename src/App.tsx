import { useState } from 'react';
import {
  IonApp, IonHeader, IonToolbar, IonTitle, IonContent, IonPage, IonButtons, setupIonicReact,
} from '@ionic/react';
import SafPoc from './poc/SafPoc';
import SyncSettings from './sync/SyncSettings';
import SyncLight from './sync/SyncLight';
import { useSyncStatus } from './sync/useSyncStatus';

/* Ionic core + theming CSS */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

setupIonicReact();

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { light, refresh } = useSyncStatus();
  return (
    <IonApp>
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Gú's Library</IonTitle>
            <IonButtons slot="end">
              <SyncLight state={light} onClick={() => setSettingsOpen(true)} />
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <p>Kho tài liệu học luật — M1 khung rỗng.</p>
          <SafPoc />
        </IonContent>
        <SyncSettings isOpen={settingsOpen} onClose={() => { setSettingsOpen(false); refresh(); }} />
      </IonPage>
    </IonApp>
  );
}
