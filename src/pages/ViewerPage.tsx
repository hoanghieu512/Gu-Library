import { useEffect, useRef, useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent,
  IonInput, IonButton, IonText,
} from '@ionic/react';
import { useParams } from 'react-router-dom';
import PdfView from '../components/PdfView';
import { readPdfBytes } from '../storage/safFile';
import { getRootUri } from '../storage/repo';
import { getProgressFor, setProgress } from '../reading/progress';
import { decodeUriParam } from '../storage/uriParam';
import { monNameFromUris } from '../storage/monPath';

function baseName(contentUri: string): string {
  const last = decodeURIComponent(contentUri).split('/').pop() ?? contentUri;
  return last.replace(/\.[^.]+$/, '');
}

export default function ViewerPage() {
  const { uri } = useParams<{ uri: string }>();
  const docUri = decodeUriParam(uri);
  const name = baseName(docUri);

  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [initialPage, setInitialPage] = useState<number | null>(null);
  const [monName, setMonName] = useState('Tài liệu');
  const [jumpTo, setJumpTo] = useState<number | undefined>(undefined);
  const [target, setTarget] = useState('');
  const [err, setErr] = useState('');
  const lastSaved = useRef(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [prog, root] = await Promise.all([getProgressFor(docUri), getRootUri()]);
        if (!alive) return;
        setInitialPage(prog?.page ?? 1);
        setMonName((root && monNameFromUris(root, docUri)) || prog?.monName || 'Tài liệu');
        setBytes(await readPdfBytes(docUri));
      } catch (e: unknown) {
        if (alive) setErr(String(e instanceof Error ? e.message : e));
      }
    })();
    return () => { alive = false; };
  }, [docUri]);

  const onPageChange = (page: number, total: number) => {
    if (page === lastSaved.current) return;
    lastSaved.current = page;
    setProgress({ docUri, name, monName, page, total });
  };

  const doJump = () => {
    const n = parseInt(target, 10);
    if (!Number.isNaN(n)) setJumpTo(n);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/home" /></IonButtons>
          <IonTitle className="gu-title">{name}</IonTitle>
          <IonButtons slot="end">
            <IonInput
              style={{ maxWidth: 56 }} type="number" placeholder="Tr"
              value={target} onIonInput={(e) => setTarget(e.detail.value ?? '')}
            />
            <IonButton onClick={doJump}>Nhảy</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {err && <IonText color="danger"><p className="ion-padding">Không mở được PDF: {err}</p></IonText>}
        {!err && (!bytes || initialPage == null) && <p className="ion-padding">Đang tải PDF…</p>}
        {bytes && initialPage != null && (
          <PdfView
            bytes={bytes}
            initialPage={initialPage}
            onPageChange={onPageChange}
            jumpTo={jumpTo}
          />
        )}
      </IonContent>
    </IonPage>
  );
}
