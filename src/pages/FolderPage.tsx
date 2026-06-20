import { useEffect, useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent,
  IonList, IonItem, IonLabel, IonIcon, IonBadge,
} from '@ionic/react';
import { folderOutline, documentTextOutline, chevronForward, hourglassOutline } from 'ionicons/icons';
import { useParams, useHistory } from 'react-router-dom';
import { listFolder } from '../storage/repo';
import { encodeUriParam, decodeUriParam } from '../storage/uriParam';
import type { FolderListing } from '../storage/types';

export default function FolderPage() {
  const { uri } = useParams<{ uri: string }>();
  const decoded = decodeUriParam(uri);
  const history = useHistory();
  const [listing, setListing] = useState<FolderListing | null>(null);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    setListing(null); setError('');
    listFolder(decoded)
      .then(setListing)
      .catch((e) => setError(String(e?.message ?? e)));
  }, [decoded]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/home" /></IonButtons>
          <IonTitle className="gu-title">Môn / Chương</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {!listing && !error && <p>Đang tải…</p>}
        {error && <p style={{ color: 'var(--ion-color-danger)' }}>Không đọc được thư mục: {error}</p>}
        {listing && listing.folders.length === 0 && listing.documents.length === 0 && listing.pending.length === 0 && (
          <p style={{ color: 'var(--gu-grey)' }}>Thư mục trống.</p>
        )}
        {listing && (
          <IonList>
            {listing.folders.map((f) => (
              <IonItem key={f.uri} button onClick={() => history.push(`/folder/${encodeUriParam(f.uri)}`)}>
                <IonIcon icon={folderOutline} slot="start" />
                <IonLabel className="gu-serif">{f.name}</IonLabel>
                <IonIcon icon={chevronForward} slot="end" />
              </IonItem>
            ))}
            {listing.documents.map((d) => (
              <IonItem key={d.pdfUri} button onClick={() => history.push(`/viewer/${encodeUriParam(d.pdfUri)}`)}>
                <IonIcon icon={documentTextOutline} slot="start" />
                <IonLabel className="gu-serif">{d.name}</IonLabel>
              </IonItem>
            ))}
            {listing.pending.map((p) => (
              <IonItem key={p.sourceUri} disabled>
                <IonLabel color="medium">{p.name}</IonLabel>
                <IonBadge slot="end" style={{ background: 'var(--gu-pending)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <IonIcon icon={hourglassOutline} style={{ fontSize: 13 }} />
                  chờ xử lý
                </IonBadge>
              </IonItem>
            ))}
          </IonList>
        )}
      </IonContent>
    </IonPage>
  );
}
