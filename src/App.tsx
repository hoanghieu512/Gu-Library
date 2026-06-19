import { IonApp, IonHeader, IonToolbar, IonTitle, IonContent, IonPage, setupIonicReact } from '@ionic/react';
import SafPoc from './poc/SafPoc';

/* Ionic core + theming CSS */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

setupIonicReact();

export default function App() {
  return (
    <IonApp>
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Gú's Library</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <p>Kho tài liệu học luật — M1 khung rỗng.</p>
          <SafPoc />
        </IonContent>
      </IonPage>
    </IonApp>
  );
}
