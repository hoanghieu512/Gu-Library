import { useCallback, useEffect, useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonIcon, IonContent,
  IonList, IonItem, IonLabel, IonBadge,
} from '@ionic/react';
import { folderOutline, documentTextOutline, chevronForward, hourglassOutline, add } from 'ionicons/icons';
import { useParams, useHistory } from 'react-router-dom';
import { listFolder, createSubfolder } from '../storage/repo';
import { encodeUriParam, decodeUriParam } from '../storage/uriParam';
import type { FolderListing } from '../storage/types';
import CreateFolderModal from '../components/CreateFolderModal';

export default function FolderPage() {
  const { uri } = useParams<{ uri: string }>();
  const decoded = decodeUriParam(uri);
  const history = useHistory();
  const [listing, setListing] = useState<FolderListing | null>(null);
  const [error, setError] = useState<string>('');
  const [createOpen, setCreateOpen] = useState(false);

  const loadListing = useCallback(() => {
    setListing(null); setError('');
    listFolder(decoded)
      .then(setListing)
      .catch((e) => setError(String(e?.message ?? e)));
  }, [decoded]);

  useEffect(() => {
    loadListing();
  }, [loadListing]);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/home" /></IonButtons>
          <IonTitle className="gu-title">Môn / Chương</IonTitle>
          <IonButtons slot="end">
            <IonButton fill="clear" onClick={() => setCreateOpen(true)} aria-label="Tạo thư mục mới">
              <IonIcon icon={add} />
            </IonButton>
          </IonButtons>
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

      <CreateFolderModal
        isOpen={createOpen}
        title="Thư mục mới"
        withColor={false}
        existingNames={listing?.folders.map((f) => f.name) ?? []}
        onCreate={async (name) => { await createSubfolder(decoded, name); loadListing(); }}
        onClose={() => setCreateOpen(false)}
      />
    </IonPage>
  );
}
