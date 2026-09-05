import { useEffect, useRef, useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent,
  IonInput, IonButton, IonFooter, IonIcon, IonSpinner,
} from '@ionic/react';
import { browsersOutline } from 'ionicons/icons';
import { useLocation, useParams } from 'react-router-dom';
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

// Icon "chia đôi màn hình" — TỰ VẼ vì Ionicons không có glyph khung chia ngang đúng kiểu bản vẽ
// (browsersOutline là hai cửa sổ chồng nhau, contractOutline là mũi tên thu gọn).
//
// ĐÃ THỬ `IonIcon src=` với data-URI để ăn luật cỡ của Ionic → WebView KHÔNG render ra gì (icon mất
// hẳn, đo lại thấy trống). Nên giữ <svg> trần và chỉnh cỡ THEO SỐ ĐO THẬT: bản 22px ra glyph 52×46
// device-px trong khi browsersOutline ra 62×58 → nhỏ hơn thấy rõ. Nâng khung lên 26px và kéo chiều
// cao hộp (h 15→16 trong viewBox) cho khớp cả bề ngang lẫn bề cao.
function SplitIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
      <rect x="3.5" y="4" width="17" height="16" rx="2.5" strokeWidth="1.8" />
      <line x1="3.5" y1="12" x2="20.5" y2="12" strokeWidth="1.8" />
    </svg>
  );
}

function baseName(contentUri: string): string {
  const last = decodeURIComponent(contentUri).split('/').pop() ?? contentUri;
  return last.replace(/\.[^.]+$/, '');
}

export default function ViewerPage() {
  const { uri } = useParams<{ uri: string }>();
  // `?p=N` — mở thẳng tới trang, dùng khi vào từ kết quả tìm kiếm. Vắng thì theo trang đang đọc dở.
  // Nhớ trang vẫn ghi bình thường từ chỗ nhảy tới, không có ngoại lệ.
  const jumpParam = Number(new URLSearchParams(useLocation().search).get('p'));
  const fromSearch = Number.isFinite(jumpParam) && jumpParam > 0 ? jumpParam : null;
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
  // B4c — tỉ lệ chia (phần của pane TRÊN, 0..1). Nhớ TRONG PHIÊN split và sống sót qua thao tác
  // đổi tài liệu B4b (state này tách khỏi `bottomUri`). CỐ Ý **không** nhớ qua lần mở app sau:
  // thoát split rồi vào lại → về 50/50, đó là hành vi đúng ở beat này.
  const [ratio, setRatio] = useState(0.5);
  const [frameH, setFrameH] = useState(0);
  const roRef = useRef<ResizeObserver | null>(null);
  // Callback-ref (không dùng useEffect) → gắn/gỡ theo dõi ngay khi khung mount, khỏi phụ thuộc
  // thứ tự khai báo `ready`. Theo dõi cả gập/mở & xoay ngang → giữ TỈ LỆ, tính lại pixel.
  const frameRef = (el: HTMLDivElement | null) => {
    roRef.current?.disconnect(); roRef.current = null;
    if (!el) return;
    setFrameH(el.clientHeight);
    const ro = new ResizeObserver((es) => { for (const e of es) setFrameH(Math.round(e.contentRect.height)); });
    ro.observe(el); roRef.current = ro;
  };
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
        setInitialPage(fromSearch ?? resumePage);
        setFlagged(await isPrintFlagged(docUri));
      } catch { /* lỗi meta nhẹ → DocPane vẫn tự thử đọc + báo "chết cho đẹp" nếu file hỏng */ }
    })();
    return () => { alive = false; };
  }, [docUri, fromSearch]);

  // ĐỔI tài liệu pane tra cứu (B4b) — TUẦN TỰ, KHÔNG chồng lấn: đưa `bottomUri` về null trước để
  // `DocPane` cũ UNMOUNT HẲN (nhả `bytes`) rồi mới hiện DocPicker cho chọn cái mới. Hai tài liệu
  // pane dưới KHÔNG BAO GIỜ cùng tồn tại → đỉnh bộ nhớ vẫn là 2 tài liệu như luồng cũ, không phải 3.
  // Đánh đổi đã chốt: có một nhịp trắng ngắn (màn chọn tài liệu) — KHÔNG nạp trước cho mượt.
  const swapBottom = () => setBottomUri(null);

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

  const exitSplit = () => { setSplit(false); setBottomUri(null); setRatio(0.5); };

  // Kéo vạch chia. Cập nhật gói trong requestAnimationFrame → tối đa MỘT lần đổi bố cục mỗi khung
  // hình (luật đã chốt: mượt thắng đuổi-theo-tay-từng-khung). Chỉ gắn trên vạch chia nên cuộn
  // trong pane sát vạch KHÔNG kích nhầm.
  // B4c.1: bỏ tên tài liệu khỏi vạch → 38→22px, và HAI trạng thái dày BẰNG NHAU (vạch không
  // phình ra khi nạp tài liệu tra cứu). 22px là sàn theo VÙNG CHẠM để kéo, không phải theo chữ:
  // chữ "Đổi" 12px nằm vừa trong 22px, nên không phải đổi sang icon để lấy 4px này.
  const DIVIDER_H = 22;
  const MIN_PANE = 132;                       // chốt theo màn hẹp nhất (Flip gập) — cả hai pane còn đọc được
  const avail = Math.max(0, frameH - DIVIDER_H);
  const drag = useRef<{ y0: number; top0: number } | null>(null);
  const raf = useRef<number | null>(null);
  const clampTop = (px: number) => {
    if (avail <= MIN_PANE * 2) return avail / 2;   // khung quá thấp → chia đôi, không kẹt
    return Math.min(avail - MIN_PANE, Math.max(MIN_PANE, px));
  };
  const onDragStart = (e: React.TouchEvent) => {
    drag.current = { y0: e.touches[0].clientY, top0: ratio * avail };
  };
  const onDragMove = (e: React.TouchEvent) => {
    const d = drag.current; if (!d || avail <= 0) return;
    const next = clampTop(d.top0 + (e.touches[0].clientY - d.y0)) / avail;
    if (raf.current != null) return;            // đã có khung đang chờ → bỏ mẫu này
    raf.current = requestAnimationFrame(() => { raf.current = null; setRatio(next); });
  };
  const onDragEnd = () => { drag.current = null; };
  useEffect(() => () => { if (raf.current != null) cancelAnimationFrame(raf.current); }, []);

  // Tay-nắm: B4a CỐ Ý chưa vẽ (chưa kéo được thì vẽ là hứa suông). B4c mới vẽ.
  const grip = (
    <div aria-hidden style={{
      position: 'absolute', top: 3, left: '50%', transform: 'translateX(-50%)',
      width: 42, height: 4, borderRadius: 2, background: 'rgba(233,229,205,.55)',
    }} />
  );
  const dragProps = {
    onTouchStart: onDragStart, onTouchMove: onDragMove, onTouchEnd: onDragEnd, onTouchCancel: onDragEnd,
    role: 'separator' as const, 'aria-label': 'Kéo để đổi tỉ lệ hai khung',
    style: { touchAction: 'none' as const },
  };
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
          {/* Tên tài liệu dài + màn hẹp: bỏ padding mặc định của IonTitle để trả lại ~40px (cùng
              cách đã dùng cho breadcrumb ở B2b.1) — KHÔNG hạ cỡ chữ theo độ dài. Ionic tự cắt
              đuôi bằng `…`, dùng chung ngôn ngữ rút gọn với breadcrumb / phụ đề đọc-dở. */}
          <IonTitle
            className="gu-serif"
            style={{
              fontSize: 16, fontWeight: 700, color: 'var(--gu-brown-deep)',
              paddingInlineStart: 0, paddingInlineEnd: 0,
            }}
          >
            {title}
          </IonTitle>
          <IonButtons slot="end">
            {/* Chia đôi / thoát chia đôi — quyết định sau khi đã mở tài liệu (v1.27.0). */}
            <IonButton
              onClick={() => (split ? exitSplit() : setSplit(true))}
              aria-label={split ? 'Thoát chia đôi' : 'Chia đôi màn hình'}
            >
              {/* Màn ĐƠN: icon khung-chia-đôi (theo bản vẽ) = "bấm để chia". Trong SPLIT: đổi sang
                  browsersOutline (icon vốn dùng ở màn đơn) = "bấm để về một màn". */}
              {split ? <IonIcon slot="icon-only" icon={browsersOutline} /> : <SplitIcon />}
            </IonButton>
            <PrintFlagButton docUri={docUri} flagged={flagged} onChanged={() => {
              setFlagged((v) => !v);
              toastResult(flagged ? 'Đã bỏ đánh dấu in gòi nha!' : 'Đã đánh dấu cần in gòi nha!', true);
            }} />
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent scrollY={false}>
        {!ready && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, height: '100%' }}>
            <IonSpinner style={{ '--color': 'var(--gu-brown)' } as React.CSSProperties} />
            <span style={{ color: 'var(--gu-grey)' }}>Đang tải PDF…</span>
          </div>
        )}
        {ready && (
          <div ref={frameRef} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Pane TRÊN — giữ mounted qua toggle split (key ổn định) → giữ đúng trang đang đọc.
                Trong split: chiều cao theo TỈ LỆ kéo được (B4c); ngoài split: chiếm hết. */}
            <div style={split && avail > 0
              ? { flex: '0 0 auto', height: Math.round(clampTop(ratio * avail)), minHeight: 0 }
              : { flex: 1, minHeight: 0 }}>
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
                {/* Vạch chia hai pane. CỐ Ý không vẽ tay-nắm: kéo đổi tỉ lệ là B4c, vẽ grip bây
                    giờ là hứa một cử chỉ chưa tồn tại. Tỉ lệ vẫn cố định 50/50.
                    Khi pane dưới ĐANG có tài liệu thì vạch mang luôn tên tài liệu + nút "Đổi". */}
                {bottomUri ? (
                  <div {...dragProps} style={{
                    ...dragProps.style,
                    position: 'relative', flex: '0 0 auto', height: DIVIDER_H,
                    display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 10px',
                    background: 'linear-gradient(180deg, var(--gu-brown), var(--gu-brown-deep))',
                    boxShadow: '0 1px 3px rgba(0,0,0,.35)',
                  }}>
                    {grip}
                    {/* B4c.1: BỎ tên tài liệu khỏi thanh. Tên là thứ tự thêm ở B4b, không ai yêu cầu —
                        mà nội dung tài liệu đang hiện ngay dưới, và Gú vừa tự chọn nó vài giây trước.
                        Bỏ đi thì thanh mỏng lại 12px, đổi lại split có thêm chỗ đọc. Nút "Đổi" giữ,
                        dựng bằng <button> thường để ép đúng chiều cao 26px (IonButton có cao tối thiểu). */}
                    <button
                      type="button" onClick={swapBottom} aria-label="Đổi tài liệu tra cứu"
                      onTouchStart={(e) => e.stopPropagation()}
                      style={{
                        background: 'none', border: 'none', padding: '0 4px', height: '100%',
                        color: 'var(--gu-cream)', fontSize: 12, fontWeight: 600, lineHeight: 1, cursor: 'pointer',
                      }}
                    >
                      Đổi
                    </button>
                  </div>
                ) : (
                  /* Chưa chọn tài liệu tra cứu: vạch vẫn KÉO ĐƯỢC, và dày 22px cho ngón cái bắt
                     được (trước là 5px — quá mảnh để làm vùng chạm). */
                  <div {...dragProps} style={{
                    ...dragProps.style,
                    position: 'relative', flex: '0 0 auto', height: DIVIDER_H,
                    background: 'linear-gradient(180deg, var(--gu-brown), var(--gu-brown-deep))',
                    boxShadow: '0 1px 3px rgba(0,0,0,.35)',
                  }}>
                    {grip}
                  </div>
                )}
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
          <IonToolbar style={{ '--background': 'var(--gu-paper-2)', '--border-width': '0' } as React.CSSProperties}>
            {/* Vạch tiến độ đọc — cùng ngôn ngữ với thanh tiến độ trên thẻ "Đang đọc dở" ở Home */}
            <div style={{ height: 3, background: 'rgba(117,66,14,.14)' }}>
              <div style={{
                height: '100%', borderRadius: 3, background: 'var(--gu-brown)',
                width: total > 0 ? `${Math.min(100, (currentPage / total) * 100)}%` : '0%',
                transition: 'width .2s ease',
              }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px' }}>
              <span style={{
                fontFamily: 'var(--gu-serif)', fontWeight: 700, fontSize: 13,
                color: 'var(--gu-brown-deep)', whiteSpace: 'nowrap',
              }}>
                Trang {currentPage} / {total || '…'}
              </span>
              <div style={{ flex: 1 }} />
              <IonInput
                type="number" inputmode="numeric" placeholder="Tới trang…"
                value={target} onIonInput={(e) => setTarget(e.detail.value ?? '')}
                style={{
                  maxWidth: 118, borderRadius: 10, border: '1.5px solid var(--gu-grey)',
                  background: 'var(--gu-cream)', '--background': 'transparent',
                  '--color': 'var(--gu-brown-deep)', '--padding-start': '10px',
                  '--border-width': '0', '--highlight-height': '0',
                } as React.CSSProperties}
              />
              <IonButton size="small" fill="solid" shape="round" style={{ textTransform: 'none' }} onClick={doJump}>
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
