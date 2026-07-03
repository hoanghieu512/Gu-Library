import { useEffect, useRef, useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent,
  IonInput, IonButton, IonFooter,
} from '@ionic/react';
import { useParams } from 'react-router-dom';
import PdfView from '../components/PdfView';
import { readPdfBytes } from '../storage/safFile';
import { getResumePage, recordProgress } from '../reading/store';
import { getBaseScale } from '../viewer/fontScale';
import { decodeUriParam } from '../storage/uriParam';
import { isPrintFlagged } from '../print/printRepo';
import PrintFlagButton from '../components/PrintFlagButton';

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
  const [jumpTo, setJumpTo] = useState<number | undefined>(undefined);
  const [target, setTarget] = useState('');
  const [err, setErr] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [flagged, setFlagged] = useState(false);
  const [baseScale, setBaseScale] = useState<number | null>(null);
  const lastSaved = useRef(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const resumePage = await getResumePage(docUri);
        const base = await getBaseScale();
        if (!alive) return;
        setBaseScale(base);
        setInitialPage(resumePage);
        setBytes(await readPdfBytes(docUri));
        setFlagged(await isPrintFlagged(docUri));
      } catch (e: unknown) {
        if (alive) setErr(String(e instanceof Error ? e.message : e));
      }
    })();
    return () => { alive = false; };
  }, [docUri]);

  const onPageChange = (page: number, totalPages: number) => {
    setCurrentPage(page);
    setTotal(totalPages);
    if (page === lastSaved.current) return;
    lastSaved.current = page;
    recordProgress(docUri, page, totalPages);
  };

  const doJump = () => {
    const n = parseInt(target, 10);
    if (!Number.isNaN(n)) setJumpTo(n);
    setTarget('');
  };

  const ready = bytes && initialPage != null && baseScale != null;

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/home" /></IonButtons>
          <IonTitle className="gu-serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--gu-brown-deep)' }}>
            {name}
          </IonTitle>
          <IonButtons slot="end">
            <PrintFlagButton docUri={docUri} flagged={flagged} onChanged={() => setFlagged((v) => !v)} />
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        {err && (
          <div className="ion-padding" style={{ color: 'var(--gu-brown-deep)' }}>
            <p style={{ fontSize: 15 }}>
              Không mở được tài liệu này gòi dợ iu — có thể file quá nặng, liên hệ với chùn để
              tìm cách fix ngay nà!
            </p>
          </div>
        )}
        {!err && !ready && <p className="ion-padding">Đang tải PDF…</p>}
        {ready && (
          <PdfView
            bytes={bytes}
            initialPage={initialPage}
            baseScale={baseScale}
            onPageChange={onPageChange}
            jumpTo={jumpTo}
          />
        )}
      </IonContent>
      {ready && !err && (
        <IonFooter>
          <IonToolbar>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px' }}>
              <span style={{ fontSize: 13, color: 'var(--gu-brown-deep)', whiteSpace: 'nowrap' }}>
                Trang {currentPage} / {total || '…'}
              </span>
              <div style={{ flex: 1 }} />
              <IonInput
                type="number" inputmode="numeric" placeholder="Tới trang…"
                value={target} onIonInput={(e) => setTarget(e.detail.value ?? '')}
                style={{ maxWidth: 110, '--background': 'var(--gu-white)', '--padding-start': '10px', borderRadius: 8 } as React.CSSProperties}
              />
              <IonButton size="small" fill="solid" style={{ textTransform: 'none' }} onClick={doJump}>
                Nhảy
              </IonButton>
            </div>
          </IonToolbar>
        </IonFooter>
      )}
    </IonPage>
  );
}
