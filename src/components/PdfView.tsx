import { useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

// Worker offline (bundle, no CDN). This exact form built + ran correctly on device.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url,
).toString();

interface Props {
  bytes: Uint8Array;
  initialPage: number;            // trang khôi phục lúc mở
  onPageChange: (page: number, total: number) => void; // báo trang hiện tại để lưu
  jumpTo?: number;                // lệnh nhảy tới trang (đổi giá trị = nhảy)
}

const MAX_ZOOM = 4;

export default function PdfView({ bytes, initialPage, onPageChange, jumpTo }: Props) {
  const [numPages, setNumPages] = useState(0);
  const [zoom, setZoom] = useState(1);            // zoom đã commit (1 = fit-width). State → GIỮ khi lật trang.
  const containerRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const restored = useRef(false);
  const zoomRef = useRef(1);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  const fitWidth = Math.min(window.innerWidth - 8, 900);
  const pageWidth = Math.round(fitWidth * zoom); // re-raster nét theo zoom

  // CRITICAL: pdf.js detaches the ArrayBuffer. Build the file object ONCE with a COPY.
  const file = useMemo(() => ({ data: bytes.slice(0) }), [bytes]);

  const scrollToPage = (n: number) => {
    document.getElementById(`pdf-page-${n}`)?.scrollIntoView();
  };

  const onLoad = (d: { numPages: number }) => {
    setNumPages(d.numPages);
    onPageChange(Math.min(initialPage, d.numPages), d.numPages);
  };

  // Khôi phục trang sau khi load xong (zoom=1 lúc mở → scrollIntoView chuẩn).
  useEffect(() => {
    if (numPages > 0 && !restored.current) {
      restored.current = true;
      if (initialPage > 1) setTimeout(() => scrollToPage(initialPage), 50);
    }
  }, [numPages, initialPage]);

  // Lệnh nhảy trang từ ngoài.
  useEffect(() => {
    if (jumpTo && jumpTo >= 1 && jumpTo <= numPages) scrollToPage(jumpTo);
  }, [jumpTo, numPages]);

  // Theo dõi trang hiển thị nhiều nhất -> báo ra ngoài để lưu progress.
  // Keyed [numPages] (không phụ thuộc zoom) → observer quan sát ĐÚNG các #pdf-page-n,
  // đổi zoom chỉ resize box, observer vẫn chạy → page-tracking + nhớ-trang không vỡ.
  useEffect(() => {
    if (numPages === 0 || !containerRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) {
          const n = Number((visible.target as HTMLElement).dataset.page);
          if (n) onPageChange(n, numPages);
        }
      },
      { root: containerRef.current, threshold: [0.25, 0.5, 0.75] },
    );
    Array.from({ length: numPages }, (_, i) =>
      document.getElementById(`pdf-page-${i + 1}`),
    ).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [numPages]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Pinch + double-tap (native listeners để preventDefault được; React touchmove là passive) ---
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let pinching = false, startDist = 0, startZoom = 1, live = 1, lastTap = 0;
    const dist = (t: TouchList) =>
      Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinching = true;
        startDist = dist(e.touches);
        startZoom = zoomRef.current;
        live = zoomRef.current;
      }
    };
    const onMove = (e: TouchEvent) => {
      if (pinching && e.touches.length === 2) {
        e.preventDefault(); // chặn cuộn/zoom-trình-duyệt trong lúc pinch
        const ratio = dist(e.touches) / startDist;
        live = Math.max(1, Math.min(MAX_ZOOM, startZoom * ratio));
        if (pagesRef.current) {
          pagesRef.current.style.transformOrigin = 'top center';
          pagesRef.current.style.transform = `scale(${live / zoomRef.current})`; // preview mượt
        }
      }
    };
    const onEnd = (e: TouchEvent) => {
      if (pinching && e.touches.length < 2) {
        pinching = false;
        if (pagesRef.current) pagesRef.current.style.transform = ''; // bỏ preview
        if (Math.abs(live - zoomRef.current) > 0.01) setZoom(live);   // commit → re-raster nét
      } else if (e.touches.length === 0) {
        const now = Date.now();
        if (now - lastTap < 300) { setZoom(1); lastTap = 0; } // double-tap → fit-width
        else lastTap = now;
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

  return (
    <div
      ref={containerRef}
      style={{ height: '100%', overflow: 'auto', touchAction: 'pan-x pan-y' }}
    >
      {/* width:max-content + margin auto → căn giữa khi vừa khung, pan tới mép khi đã phóng */}
      <div ref={pagesRef} style={{ width: 'max-content', margin: '0 auto' }}>
        <Document file={file} onLoadSuccess={onLoad}>
          {Array.from({ length: numPages }, (_, i) => (
            <div id={`pdf-page-${i + 1}`} data-page={i + 1} key={i} style={{ padding: '6px 0' }}>
              <Page
                pageNumber={i + 1}
                width={pageWidth}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
}
