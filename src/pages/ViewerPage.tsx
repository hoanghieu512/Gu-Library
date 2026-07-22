import { useEffect, useRef, useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent,
  IonInput, IonButton, IonFooter, IonIcon,
} from '@ionic/react';
import { browsersOutline, contractOutline } from 'ionicons/icons';
import { useParams } from 'react-router-dom';
import DocPane from '../components/DocPane';
import DocPicker from '../components/DocPicker';
import { useGuToast } from '../lib/useGuToast';
import { getResumePage, recordProgress } from '../reading/store';
import { getBaseScale } from '../viewer/fontScale';
import { resolveDocDisplayName } from '../storage/docRepo';
import { decodeUriParam } from '../storage/uriParam';
import { isPrintFlagged } from '../print/printRepo';
import PrintFlagButton from '../components/PrintFlagButton';
import { perfStart } from '../perf/perf';

function baseName(contentUri: string): string {
  const last = decodeURIComponent(contentUri).split('/').pop() ?? contentUri;
  return last.replace(/\.[^.]+$/, '');
}

export default function ViewerPage() {
  const { uri } = useParams<{ uri: string }>();
  const docUri = decodeUriParam(uri);
  const name = baseName(docUri);

  const [initialPage, setInitialPage] = useState<number | null>(null);
  const [jumpTo, setJumpTo] = useState<number | undefined>(undefined);
  const [target, setTarget] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [flagged, setFlagged] = useState(false);
  const [baseScale, setBaseScale] = useState<number | null>(null);
  const [title, setTitle] = useState(name); // tên hiển thị (đổi tên nếu có) > tên file
  // Split-screen (v1.27.0): pane trên = tài liệu này (ghi reading-state); pane dưới = tài liệu tra
  // cứu (KHÔNG ghi reading-state). `bottomUri` null = đang chọn file cho pane dưới (DocPicker).
  const [split, setSplit] = useState(false);
  const [bottomUri, setBottomUri] = useState<string | null>(null);
  const lastSaved = useRef(0);
  const { toastResult, node: toastNode } = useGuToast();

  useEffect(() => {
    let alive = true;
    perfStart('openDoc'); // đo tới lúc trang đầu raster xong (PdfView bắn onFirstPaint)
    (async () => {
      // Tên hiển thị: resolve SONG SONG ngay đầu (nhẹ) → header đổi tức thì, không đợi PDF nặng.
      resolveDocDisplayName(docUri).then((dn) => { if (alive && dn) setTitle(dn); }).catch(() => { /* giữ tên file */ });
      try {
        const resumePage = await getResumePage(docUri);
        const base = await getBaseScale();
        if (!alive) return;
        setBaseScale(base);
        setInitialPage(resumePage);
        setFlagged(await isPrintFlagged(docUri));
      } catch { /* lỗi meta nhẹ → DocPane vẫn tự thử đọc + báo "chết cho đẹp" nếu file hỏng */ }
    })();
    return () => { alive = false; };
  }, [docUri]);

  // Chỉ pane TRÊN ghi reading-state ("Đang đọc dở" / nhớ trang). Pane dưới là tra cứu → không ghi.
  const onTopPage = (page: number, totalPages: number) => {
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

  const exitSplit = () => { setSplit(false); setBottomUri(null); };
  const ready = initialPage != null && baseScale != null;

  // Back cứng Android: đang split → thoát split (nuốt), không rời Viewer; ngoài split → nhường
  // handler điều hướng (về folder/home). Cùng cơ chế priority-register như FolderPage v1.6.0.
  const splitRef = useRef(false);
  useEffect(() => { splitRef.current = split; }, [split]);
  useEffect(() => {
    const onBack = (ev: Event) => {
      (ev as CustomEvent<{ register: (p: number, h: (next: () => void) => void) => void }>).detail
        .register(60, (next) => { if (splitRef.current) { setSplit(false); setBottomUri(null); } else next(); });
    };
    document.addEventListener('ionBackButton', onBack);
    return () => document.removeEventListener('ionBackButton', onBack);
  }, []);

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/home" /></IonButtons>
          <IonTitle className="gu-serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--gu-brown-deep)' }}>
            {title}
          </IonTitle>
          <IonButtons slot="end">
            {/* Chia đôi / thoát chia đôi — quyết định sau khi đã mở tài liệu (v1.27.0). */}
            <IonButton
              onClick={() => (split ? exitSplit() : setSplit(true))}
              aria-label={split ? 'Thoát chia đôi' : 'Chia đôi màn hình'}
            >
              <IonIcon slot="icon-only" icon={split ? contractOutline : browsersOutline} />
            </IonButton>
            <PrintFlagButton docUri={docUri} flagged={flagged} onChanged={() => {
              setFlagged((v) => !v);
              toastResult(flagged ? 'Đã bỏ đánh dấu in gòi nha!' : 'Đã đánh dấu cần in gòi nha!', true);
            }} />
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent scrollY={false}>
        {!ready && <p className="ion-padding">Đang tải PDF…</p>}
        {ready && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Pane TRÊN — giữ mounted qua toggle split (key ổn định) → giữ đúng trang đang đọc. */}
            <div style={{ flex: 1, minHeight: 0 }}>
              <DocPane
                key="top"
                docUri={docUri}
                initialPage={initialPage}
                baseScale={baseScale}
                onPageChange={onTopPage}
                jumpTo={jumpTo}
              />
            </div>
            {split && (
              <>
                <div style={{ height: 4, background: 'var(--gu-brown)', flexShrink: 0 }} />
                {/* Pane DƯỚI — tra cứu: chọn file (DocPicker) rồi render; KHÔNG ghi reading-state. */}
                <div style={{ flex: 1, minHeight: 0 }}>
                  {bottomUri ? (
                    <DocPane
                      key={`bottom-${bottomUri}`}
                      docUri={bottomUri}
                      initialPage={1}
                      baseScale={baseScale}
                      compactError
                      onErrorAction={{ label: 'Chọn tài liệu khác', onClick: () => setBottomUri(null) }}
                    />
                  ) : (
                    <DocPicker onPick={(u) => setBottomUri(u)} />
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </IonContent>
      {/* Footer nhảy-trang chỉ ở chế độ 1 pane (split thì mỗi pane tự cuộn). */}
      {ready && !split && (
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
      {toastNode}
    </IonPage>
  );
}
