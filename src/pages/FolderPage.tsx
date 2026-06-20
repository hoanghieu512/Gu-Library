import { useEffect, useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent,
  IonList, IonItem, IonLabel, IonIcon, IonBadge,
} from '@ionic/react';
import { folderOutline, documentTextOutline, chevronForward } from 'ionicons/icons';
import { useParams, useHistory } from 'react-router-dom';
import { listFolder } from '../storage/repo';
import type { FolderListing } from '../storage/types';

export default function FolderPage() {
  const { uri } = useParams<{ uri: string }>();
  const decoded = decodeURIComponent(uri);
  const history = useHistory();
  const [listing, setListing] = useState<FolderListing | null>(null);

  useEffect(() => { listFolder(decoded).then(setListing).catch(() => setListing(null)); }, [decoded]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/home" /></IonButtons>
          <IonTitle className="gu-title">Môn / Chương</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {!listing && <p>Đang tải…</p>}
        {listing && (
          <IonList>
            {listing.folders.map((f) => (
              <IonItem key={f.uri} button onClick={() => history.push(`/folder/${encodeURIComponent(f.uri)}`)}>
                <IonIcon icon={folderOutline} slot="start" />
                <IonLabel className="gu-serif">{f.name}</IonLabel>
                <IonIcon icon={chevronForward} slot="end" />
              </IonItem>
            ))}
            {listing.documents.map((d) => (
              <IonItem key={d.pdfUri} button onClick={() => history.push(`/viewer/${encodeURIComponent(d.pdfUri)}`)}>
                <IonIcon icon={documentTextOutline} slot="start" />
                <IonLabel className="gu-serif">{d.name}</IonLabel>
              </IonItem>
            ))}
            {listing.pending.map((p) => (
              <IonItem key={p.sourceUri} disabled>
                <IonLabel color="medium">{p.name}</IonLabel>
                <IonBadge slot="end" style={{ background: 'var(--gu-pending)' }}>⏳ chờ xử lý</IonBadge>
              </IonItem>
            ))}
          </IonList>
        )}
      </IonContent>
    </IonPage>
  );
}
