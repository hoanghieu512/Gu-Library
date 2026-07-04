import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { perfStart, perfEnd, perfCancel } from '../perf/perf';

// Worker offline (bundle, no CDN). This exact form built + ran correctly on device.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url,
).toString();

interface Props {
  bytes: Uint8Array;
  initialPage: number;            // trang khôi phục lúc mở
  baseScale?: number;             // cỡ chữ mặc định (zoom khởi tạo); pinch chồng lên base này
  onPageChange: (page: number, total: number) => void; // báo trang hiện tại để lưu
  jumpTo?: number;                // lệnh nhảy tới trang (đổi giá trị = nhảy)
}

const MAX_ZOOM = 4;
const BUFFER = 2;                 // số trang đệm mỗi phía quanh vùng nhìn (windowing)
const GAP = 12;                   // khoảng cách giữa các trang (px)
const DEFAULT_RATIO = 1.414;      // h/w mặc định (A4 dọc) trước khi đo xong

// Windowing + slot CỐ ĐỊNH chiều cao: chỉ render <Page> quanh khung nhìn (bộ nhớ có trần,
// zoom không OOM); placeholder = active cùng chiều cao → layout KHÔNG xê dịch. Điều hướng +
// neo-zoom bằng OFFSETS THẬT (gồm cả GAP/làm tròn) → không lệch tích lũy. Giữ transform tới
// khi DOM ở cỡ mới rồi mới clear trong useLayoutEffect → không "snap về nhỏ" (hết chớp đôi).
export default function PdfView({ bytes, initialPage, baseScale = 1, onPageChange, jumpTo }: Props) {
  const [numPages, setNumPages] = useState(0);
  const [zoom, setZoom] = useState(baseScale);    // zoom đã commit (init = cỡ chữ mặc định). State → GIỮ khi lật trang.
  const [ratios, setRatios] = useState<number[]>([]); // h/w từng trang (đo từ pdf, không render)
  const [win, setWin] = useState<[number, number]>([1, 1]);
  const containerRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const restored = useRef(false);
  const zoomRef = useRef(baseScale);
  const prevZoom = useRef(baseScale);
  const curPage = useRef(initialPage);
  // neo lúc đổi zoom: dọc (trang + frac + vpY) + ngang (pageX page-relative + vpX)
  const pendingAnchor = useRef<{ page: number; frac: number; vpY: number; pageX: number; vpX: number } | null>(null);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  // ---- Khử chớp lúc commit zoom (v1.2.3) ----
  // Root cause (react-pdf 10.4.1 dist/Page/Canvas.js drawPageOnCanvas): khi width đổi, effect
  // set canvas.width mới (XÓA pixel cũ) + visibility:hidden tới khi pdf.js render xong → slot lộ
  // nền = chớp. Fix: chụp pixel đang hiển thị vào overlay canvas cỡ viewport TRƯỚC commit, phủ lên
  // tới khi các trang nhìn thấy bắn onRenderSuccess (timeout đỡ) → cũ(mờ)→nét, không khoảng trống.
  // Bộ nhớ tạm = 1 canvas cỡ màn hình (~vài MB) — không đụng trần OOM của windowing.
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [swapping, setSwapping] = useState(false);
  const swappingRef = useRef(false);
  const pendingRender = useRef<Set<number> | null>(null);
  const swapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const firstPaint = useRef(false); // openDoc: chốt lần raster đầu tiên

  const endSwap = () => {
    if (swapTimer.current) { clearTimeout(swapTimer.current); swapTimer.current = null; }
    pendingRender.current = null;
    swappingRef.current = false;
    setSwapping(false);
    perfCancel('zoomCommit'); // bỏ start còn treo (nhánh timeout); nhánh thành công đã perfEnd trước đó
  };

  // Chụp nội dung đang hiển thị (kể cả preview transform — dùng bounding rect đã transform) — đồng bộ.
  const takeSnapshot = (): boolean => {
    const c = containerRef.current, ov = overlayRef.current;
    if (!c || !ov) return false;
    const dpr = window.devicePixelRatio || 1;
    ov.width = Math.round(c.clientWidth * dpr);
    ov.height = Math.round(c.clientHeight * dpr);
    const ctx = ov.getContext('2d');
    if (!ctx) return false;
    ctx.fillStyle = '#E9E5CD'; // --gu-cream: nền content, lấp vùng ngoài trang
    ctx.fillRect(0, 0, ov.width, ov.height);
    const cr = c.getBoundingClientRect();
    let drew = false;
    c.querySelectorAll('canvas').forEach((el) => {
      const cv = el as HTMLCanvasElement;
      if (cv.width === 0) return;
      const r = cv.getBoundingClientRect();
      if (r.bottom < cr.top || r.top > cr.bottom) return; // ngoài khung nhìn
      try {
        ctx.drawImage(cv, (r.left - cr.left) * dpr, (r.top - cr.top) * dpr, r.width * dpr, r.height * dpr);
        drew = true;
      } catch { /* canvas lỗi → bỏ qua */ }
    });
    return drew;
  };

  // Gọi NGAY TRƯỚC setZoom (cùng tick — DOM chưa reflow nên pixel cũ còn nguyên).
  const beginSwap = () => {
    if (!swappingRef.current) {
      if (!takeSnapshot()) return; // chưa có gì hiển thị → giữ hành vi cũ
      swappingRef.current = true;
      setSwapping(true);
    }
    perfStart('zoomCommit'); // commit zoom → đo tới lúc bản nét hiện đủ (onPageRendered)
    // Zoom nhiều nhịp liên tiếp: giữ overlay cũ (không chụp đè lúc canvas dưới đang trống), chỉ reset lưới đỡ.
    if (swapTimer.current) clearTimeout(swapTimer.current);
    swapTimer.current = setTimeout(endSwap, 1500);
  };

  const onPageRendered = (n: number) => {
    if (!firstPaint.current) { firstPaint.current = true; perfEnd('openDoc'); } // trang đầu vẽ xong
    const p = pendingRender.current;
    if (!p) return;
    p.delete(n);
    if (p.size === 0) { perfEnd('zoomCommit'); endSwap(); } // bản nét đã hiện đủ
  };

  useEffect(() => () => { if (swapTimer.current) clearTimeout(swapTimer.current); }, []);

  const fitWidth = Math.min(window.innerWidth - 8, 900);
  const pageWidth = Math.round(fitWidth * zoom);  // active page re-raster nét theo zoom

  // CRITICAL: pdf.js detaches the ArrayBuffer. Build the file object ONCE with a COPY.
  const file = useMemo(() => ({ data: bytes.slice(0) }), [bytes]);

  const slotH = useMemo(
    () => (n: number) => Math.round(pageWidth * (ratios[n - 1] ?? DEFAULT_RATIO)) + GAP,
    [pageWidth, ratios],
  );

  // offsets[n] = đỉnh của trang (n+1); đỉnh trang n = offsets[n-1]; cao trang n = offsets[n]-offsets[n-1]
  const offsets = useMemo(() => {
    const arr = [0];
    for (let n = 1; n <= numPages; n++) arr.push(arr[n - 1] + slotH(n));
    return arr;
  }, [numPages, slotH]);

  // refs để handler chạm (deps []) đọc được giá trị hiện tại
  const offsetsRef = useRef(offsets); offsetsRef.current = offsets;
  const numPagesRef = useRef(numPages); numPagesRef.current = numPages;

  const pageAtY = (off: number[], nP: number, y: number) => {
    for (let n = 1; n <= nP; n++) if (off[n] > y) return n;
    return nP || 1;
  };

  const goToPage = (n: number) => {
    const el = containerRef.current; if (!el || numPages === 0) return;
    el.scrollTop = offsets[Math.max(1, Math.min(n, numPages)) - 1];
  };

  const recompute = () => {
    const el = containerRef.current; if (!el || numPages === 0) return;
    const top = el.scrollTop, vh = el.clientHeight;
    const center = pageAtY(offsets, numPages, top + vh / 2);
    curPage.current = center;
    onPageChange(center, numPages);
    setWin([Math.max(1, pageAtY(offsets, numPages, top) - BUFFER),
            Math.min(numPages, pageAtY(offsets, numPages, top + vh) + BUFFER)]);
  };

  // Cập nhật trang hiện tại + cửa sổ render theo scroll (rAF throttle).
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    let raf = 0;
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; recompute(); }); };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => { el.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [numPages, offsets]); // eslint-disable-line react-hooks/exhaustive-deps

  const onLoad = async (pdf: PDFDocumentProxy) => {
    setNumPages(pdf.numPages);
    const p0 = Math.min(initialPage, pdf.numPages);
    onPageChange(p0, pdf.numPages);
    setWin([Math.max(1, p0 - BUFFER), Math.min(pdf.numPages, p0 + BUFFER)]);
    try {
      const rs: number[] = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        const vp = (await pdf.getPage(i)).getViewport({ scale: 1 });
        rs.push(vp.height / vp.width);
      }
      setRatios(rs);
    } catch {
      setRatios(new Array(pdf.numPages).fill(DEFAULT_RATIO));
    }
  };

  // Resume: chỉ scroll khi đã đo xong tỉ lệ (offsets chuẩn).
  useEffect(() => {
    if (numPages > 0 && ratios.length === numPages && !restored.current) {
      restored.current = true;
      requestAnimationFrame(() => { goToPage(initialPage); recompute(); });
    }
  }, [numPages, ratios]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (jumpTo && jumpTo >= 1 && jumpTo <= numPages) {
      goToPage(jumpTo);
      requestAnimationFrame(recompute);
    }
  }, [jumpTo]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sau khi zoom đổi (DOM đã reflow theo pageWidth mới) → đặt scrollTop theo offsets MỚI
  // (trang+frac chính xác, không lệch tích lũy) RỒI mới clear transform (hết "snap về nhỏ").
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (el && pendingAnchor.current) {
      const { page, frac, vpY, pageX, vpX } = pendingAnchor.current;
      el.scrollTop = offsets[page - 1] + frac * (offsets[page] - offsets[page - 1]) - vpY;
      // ngang: page-relative X scale theo r rồi đưa về đúng vị trí dưới ngón tay (clamp trong vùng pan)
      const r = zoom / prevZoom.current;
      el.scrollLeft = Math.max(0, Math.min(pageX * r - vpX, el.scrollWidth - el.clientWidth));
      pendingAnchor.current = null;
    }
    if (pagesRef.current) { pagesRef.current.style.transform = ''; pagesRef.current.style.transformOrigin = ''; }
    prevZoom.current = zoom;
    recompute();
    // Đang swap khử chớp: chốt danh sách trang NHÌN THẤY (theo scroll mới) phải render xong
    // trước khi gỡ overlay. Không tính trang buffer (ngoài khung nhìn) để gỡ sớm nhất có thể.
    if (swappingRef.current && el && numPages > 0) {
      const top = el.scrollTop, vh = el.clientHeight;
      const s = pageAtY(offsets, numPages, top);
      const e = pageAtY(offsets, numPages, top + vh);
      const set = new Set<number>();
      for (let n = s; n <= e; n++) set.add(n);
      pendingRender.current = set;
    }
  }, [zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Pinch + double-tap (native listeners để preventDefault được; React touchmove là passive) ---
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let pinching = false, startDist = 0, startZoom = 1, live = 1, lastTap = 0, originSet = false;
    let focalVpY = 0, focalPageX = 0, focalVpX = 0;
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const mid = (t: TouchList) => ({ x: (t[0].clientX + t[1].clientX) / 2, y: (t[0].clientY + t[1].clientY) / 2 });

    // dọc: {trang, frac} của toạ độ dọc vpY theo offsets hiện tại
    const anchorY = (vpY: number) => {
      const c = containerRef.current!; const off = offsetsRef.current; const nP = numPagesRef.current;
      const docY = c.scrollTop + vpY;
      const page = pageAtY(off, nP, docY);
      const frac = (docY - off[page - 1]) / Math.max(1, off[page] - off[page - 1]);
      return { page, frac: Math.max(0, Math.min(1, frac)), vpY };
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinching = true; originSet = false;
        startDist = dist(e.touches); startZoom = zoomRef.current; live = zoomRef.current;
      }
    };
    const onMove = (e: TouchEvent) => {
      if (!pinching || e.touches.length !== 2) return;
      e.preventDefault(); // chặn cuộn/zoom-trình-duyệt trong lúc pinch
      live = Math.max(1, Math.min(MAX_ZOOM, startZoom * (dist(e.touches) / startDist)));
      const p = pagesRef.current, c = containerRef.current;
      if (!p || !c) return;
      if (!originSet) {
        const m = mid(e.touches), pr = p.getBoundingClientRect(), cr = c.getBoundingClientRect();
        p.style.transformOrigin = `${m.x - pr.left}px ${m.y - pr.top}px`; // scale quanh ngón tay
        focalVpY = m.y - cr.top;       // dọc: vị trí ngón trong khung
        focalPageX = m.x - pr.left;    // ngang: X ngón so với mép trái trang (page-relative, chưa scale)
        focalVpX = m.x - cr.left;      // ngang: X ngón trong khung
        originSet = true;
      }
      // Preview mượt bằng CSS transform (GPU, KHÔNG re-raster → an toàn bộ nhớ).
      p.style.transform = `scale(${live / startZoom})`;
    };
    const onEnd = (e: TouchEvent) => {
      if (pinching && e.touches.length < 2) {
        pinching = false;
        if (Math.abs(live - zoomRef.current) > 0.01) {
          pendingAnchor.current = { ...anchorY(focalVpY), pageX: focalPageX, vpX: focalVpX }; // giữ điểm dưới ngón tay
          beginSwap();                                   // chụp overlay TRƯỚC khi DOM đổi (khử chớp)
          setZoom(live);                                 // commit → re-raster nét; transform clear ở layout effect
        } else if (pagesRef.current) {
          pagesRef.current.style.transform = '';         // pinch không đáng kể → bỏ preview ngay
        }
      } else if (e.touches.length === 0) {
        const now = Date.now();
        if (now - lastTap < 300) {                       // double-tap → fit-width, giữ tâm khung
          const c = containerRef.current, p = pagesRef.current;
          if (c && p) {
            const cr = c.getBoundingClientRect(), pr = p.getBoundingClientRect();
            pendingAnchor.current = {
              ...anchorY(c.clientHeight / 2),
              pageX: cr.left + c.clientWidth / 2 - pr.left,
              vpX: c.clientWidth / 2,
            };
          }
          if (Math.abs(zoomRef.current - 1) > 0.01) beginSwap(); // chỉ swap khi cỡ thật sự đổi (tránh treo overlay)
          setZoom(1);
          lastTap = 0;
        } else lastTap = now;
      }
    };
    el.addEventListener('touchstart', onStart, { passive: false });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
    };
  }, []);

  const [winStart, winEnd] = win;

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <div
        ref={containerRef}
        style={{ height: '100%', overflow: 'auto', touchAction: 'pan-x pan-y' }}
      >
        {/* width:max-content + margin auto → căn giữa khi vừa khung, pan tới mép khi đã phóng */}
        <div ref={pagesRef} style={{ width: 'max-content', margin: '0 auto' }}>
          <Document file={file} onLoadSuccess={onLoad}>
            {Array.from({ length: numPages }, (_, i) => {
              const n = i + 1;
              const active = n >= winStart && n <= winEnd;
              return (
                <div id={`pdf-page-${n}`} data-page={n} key={i} style={{ width: pageWidth, height: slotH(n) }}>
                  {active && (
                    <Page
                      pageNumber={n}
                      width={pageWidth}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                      onRenderSuccess={() => onPageRendered(n)}
                    />
                  )}
                </div>
              );
            })}
          </Document>
        </div>
      </div>
      {/* Overlay khử chớp: ảnh chụp nội dung cũ phủ tới khi raster mới sẵn sàng (không cuộn theo). */}
      <canvas
        ref={overlayRef}
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          zIndex: 2, pointerEvents: 'none', display: swapping ? 'block' : 'none',
        }}
      />
    </div>
  );
}
