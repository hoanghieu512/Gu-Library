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

export default function PdfView({ bytes, initialPage, onPageChange, jumpTo }: Props) {
  const [numPages, setNumPages] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const restored = useRef(false);

  // CRITICAL: pdf.js transfers (detaches) the ArrayBuffer to its worker.
  // Passing { data: bytes } and re-rendering crashes with "ArrayBuffer is already detached".
  // Build the file object ONCE with a COPY so the original bytes remain intact.
  const file = useMemo(() => ({ data: bytes.slice(0) }), [bytes]);

  const scrollToPage = (n: number) => {
    document.getElementById(`pdf-page-${n}`)?.scrollIntoView();
  };

  const onLoad = (d: { numPages: number }) => {
    setNumPages(d.numPages);
    onPageChange(Math.min(initialPage, d.numPages), d.numPages);
  };

  // Khôi phục trang sau khi load xong.
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

  return (
    <div ref={containerRef} style={{ height: '100%', overflowY: 'auto' }}>
      <Document file={file} onLoadSuccess={onLoad}>
        {Array.from({ length: numPages }, (_, i) => (
          <div
            id={`pdf-page-${i + 1}`}
            data-page={i + 1}
            key={i}
            style={{ display: 'flex', justifyContent: 'center', padding: '6px 0' }}
          >
            <Page
              pageNumber={i + 1}
              width={Math.min(window.innerWidth - 8, 900)}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </div>
        ))}
      </Document>
    </div>
  );
}
