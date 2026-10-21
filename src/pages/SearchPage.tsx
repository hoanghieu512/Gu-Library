import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent, IonIcon, IonSpinner,
  useIonViewWillEnter, useIonViewDidLeave,
} from '@ionic/react';
import { App } from '@capacitor/app';
import { useHistory } from 'react-router-dom';
import { searchOutline, closeCircle } from 'ionicons/icons';
import { onIndexCleared } from '../search/store';
import { useDisplayNames } from '../search/useDisplayNames';
import { useSearchIndex } from '../search/useSearchIndex';
import { createIndexHold } from '../search/indexHold';
import { searchDocs, parseQuery } from '../search/invertedIndex';
import type { DocSearchResult } from '../search/invertedIndex';
import { viewerUrl } from '../nav/viewerUrl';
import DocResultList from '../components/DocResultList';

// Màn Tìm: tra toàn văn trong kho (Phase 2, spec §7).
//
// Chỉ mục nằm trong IndexedDB của máy, KHÔNG vào cây Syncthing (spec §4.3: dữ liệu phái sinh).
// Lần đầu phải đọc hết sidecar nên mất chục giây, có tiến độ nhìn thấy được; những lần sau nạp
// lại chưa tới một giây, rồi làm mới NGẦM ở phía sau nên gõ được ngay, không phải chờ.
//
// Ionic keeps this page alive for the whole session, so the index is let go 3 minutes after Search
// is left, or at once when the app goes to the background (`indexHold`, spec 2026-10-21). Coming
// back reloads it under the results still on screen.

const PAD = {
  '--padding-start': '16px', '--padding-end': '16px',
  '--padding-top': '12px', '--padding-bottom': '16px',
} as CSSProperties;

const DEBOUNCE_MS = 130;   // batches keystrokes, not waiting on the search — UBS1 v1.41.0: whole words ≤ 37 ms, half-typed "th" 132–144 ms
const NO_RESULT: DocSearchResult = { total: 0, docs: [] };

export default function SearchPage() {
  const history = useHistory();
  const [q, setQ] = useState('');
  // The query each result was made for: while the index is released, results show only for it.
  const [result, setResult] = useState<{ q: string; r: DocSearchResult }>({ q: '', r: NO_RESULT });
  // Renamed documents (pdfUri → name), fresh from every refresh and every rename (khoChanged);
  // cards fall back to the file name.
  const [names, setNames] = useDisplayNames();
  const { ix, phase, progress, refreshing, acquire, release } = useSearchIndex(setNames);
  const [hold] = useState(() => createIndexHold({ acquire, release }));

  useEffect(() => {
    hold.enter();                      // first entrance; later ones come through useIonViewWillEnter
    const offCleared = onIndexCleared(() => hold.invalidate());
    // The background is where Android kills the apps that hold the most: let go at once.
    const pause = App.addListener('pause', () => hold.pause());
    const resume = App.addListener('resume', () => hold.resume());
    return () => {
      hold.dispose();
      offCleared();
      pause.then((h) => h.remove());
      resume.then((h) => h.remove());
    };
  }, [hold]);
  useIonViewWillEnter(() => hold.enter());
  useIonViewDidLeave(() => hold.leave());

  useEffect(() => {
    // Chưa có index thì không đặt state ở đây (đặt đồng bộ trong effect gây vẽ lại dây chuyền);
    // the last result stays, and shows again once the index is back.
    if (!ix) return;
    const t = setTimeout(() => setResult({ q, r: q.trim() ? searchDocs(ix, q) : NO_RESULT }), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [q, ix]);
  // With the index held, the last result stays on screen while a new query waits out the debounce,
  // as before. Released, it shows only for the query that made it.
  const shown = ix || result.q === q ? result.r : NO_RESULT;

  const openPage = (pdfUri: string, page: number) => history.push(viewerUrl(pdfUri, { page }));
  // "Xem cả N đoạn": the document at the page being read, with its in-document search holding q.
  const openAll = (pdfUri: string) => history.push(viewerUrl(pdfUri, { q: q.trim() }));

  const { seq } = parseQuery(q);
  const docCount = ix?.docs.length ?? 0;
  // Tài liệu là ảnh scan chưa OCR: KHÔNG có chữ nào để tra. Phải nói ra, không thì Gú gõ chữ
  // mình biết chắc nằm trong tài liệu đó mà không ra gì, lại tưởng search hỏng.
  const imageOnly = ix?.imageOnly ?? 0;

  return (
    <IonPage>
      <IonHeader><IonToolbar><IonTitle className="gu-title">Tìm</IonTitle></IonToolbar></IonHeader>
      <IonContent style={PAD}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, background: 'var(--gu-white)',
          border: '1px solid var(--gu-grey)', borderRadius: 999, padding: '10px 16px',
        }}>
          <IonIcon icon={searchOutline} style={{ color: 'var(--gu-grey)', flex: '0 0 auto' }} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Tìm trong tài liệu…"
            aria-label="Tìm trong tài liệu"
            enterKeyHint="search"
            autoCorrect="off" autoCapitalize="none" spellCheck={false}
            style={{
              flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
              fontSize: 15, color: 'var(--gu-brown-deep)', fontFamily: 'inherit',
            }}
          />
          {q && (
            <IonIcon
              icon={closeCircle} onClick={() => setQ('')} role="button" aria-label="Xoá ô tìm"
              style={{ color: 'var(--gu-grey)', flex: '0 0 auto', cursor: 'pointer', fontSize: 18 }}
            />
          )}
        </div>

        {phase === 'building' && <BuildingState done={progress.done} total={progress.total} />}

        {phase === 'ready' && (
          <>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6, margin: '10px 2px 4px',
              fontSize: 12, color: 'var(--gu-grey)', minHeight: 16,
            }}>
              {refreshing && <IonSpinner name="dots" style={{ width: 18, height: 12 }} />}
              {refreshing ? 'đang cập nhật chỉ mục…'
                : q.trim()
                  ? `${shown.total.toLocaleString('vi-VN')} đoạn · ${shown.docs.length.toLocaleString('vi-VN')} tài liệu`
                  : `đã đọc ${docCount} tài liệu`
                    + (imageOnly ? ` · ${imageOnly} tài liệu là ảnh, chưa tra được chữ` : '')}
            </div>

            {q.trim() && shown.docs.length === 0 && !refreshing && (
              <Empty title="Không tìm thấy đoạn nào">
                Thử bớt chữ, hoặc gõ không dấu cũng được — “to tung” ra “Tố tụng”.
                {imageOnly > 0 && (
                  <>
                    <br />
                    Lưu ý: {imageOnly} tài liệu trong kho là ảnh chụp/scan nên chưa tra được chữ
                    bên trong.
                  </>
                )}
              </Empty>
            )}

            {!q.trim() && (
              <Empty title="Gõ để tìm trong toàn bộ kho">
                Tìm tới từng đoạn, chạm là mở đúng trang. Gõ có dấu hay không dấu đều được.
              </Empty>
            )}

            {/* Keyed by the query: a new query starts again at the first page of cards. */}
            <DocResultList key={q} docs={shown.docs} seq={seq} names={names} onOpenPage={openPage} onOpenAll={openAll} />
          </>
        )}
      </IonContent>
    </IonPage>
  );
}

function BuildingState({ done, total }: { done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div style={{ marginTop: '18vh', textAlign: 'center', padding: '0 24px' }}>
      <div style={{ fontFamily: 'var(--gu-serif)', fontWeight: 700, fontSize: 17, color: 'var(--gu-brown-deep)' }}>
        Đang đọc kho lần đầu nha dợ iu
      </div>
      <p style={{ color: 'var(--gu-grey)', fontSize: 13.5, lineHeight: 1.6, margin: '8px 0 16px' }}>
        Chỉ lâu lần này thôi, những lần sau mở là tìm được ngay. Iu lắm!
      </p>
      {/* Chạy bằng transform: scaleX chứ KHÔNG phải width — animate width bắt trình duyệt tính lại
          bố cục mỗi khung, mà thanh này nhích 178 lần trong lúc máy đang bận đọc kho. */}
      <div style={{ height: 6, borderRadius: 999, background: 'rgba(117,66,14,.14)', overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: '100%', background: 'var(--gu-brown)',
          transformOrigin: 'left center', transform: `scaleX(${pct / 100})`, transition: 'transform .2s',
        }} />
      </div>
      <div style={{ marginTop: 8, fontSize: 12.5, color: 'var(--gu-grey)', fontVariantNumeric: 'tabular-nums' }}>
        {done} / {total || '…'} tài liệu
      </div>
    </div>
  );
}

function Empty({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: '16vh', textAlign: 'center', padding: '0 24px' }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%', background: 'rgba(117,66,14,0.10)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
      }}>
        <IonIcon icon={searchOutline} style={{ fontSize: 34, color: 'var(--gu-brown)' }} />
      </div>
      <div style={{ fontFamily: 'var(--gu-serif)', fontWeight: 700, fontSize: 17, color: 'var(--gu-brown-deep)' }}>
        {title}
      </div>
      <p style={{ color: 'var(--gu-grey)', fontSize: 13.5, lineHeight: 1.6, margin: '8px 0 0' }}>{children}</p>
    </div>
  );
}
