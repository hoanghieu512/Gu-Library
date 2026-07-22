import { useEffect, useState } from 'react';
import PdfView from './PdfView';
import SadPandaState from './SadPandaState';
import { readPdfBytes } from '../storage/safFile';

// Một pane hiển thị PDF (v1.27.0 split-screen). Tự đọc bytes qua read-path v1.26.0
// (probe + guard-rỗng + stream, KHÔNG base64) rồi render PdfView (windowing + pinch-zoom).
// Lỗi đọc (file move/xóa/nặng) → SadPandaState "chết cho đẹp" NGAY trong pane này → pane kia +
// app vẫn sống. Dùng chung cho pane trên (Viewer thường + split) và pane dưới (tra cứu).
//
// `onErrorAction`: nếu truyền → nút empty-state thành nút này (pane tra cứu: "Chọn tài liệu khác",
// không đá cả Viewer về Home). Không truyền → nút mặc định "Về Trang chủ" (pane chính).
export default function DocPane({ docUri, initialPage, baseScale, onPageChange, jumpTo, onErrorAction, compactError }: {
  docUri: string;
  initialPage: number;
  baseScale: number;
  onPageChange?: (page: number, total: number) => void;
  jumpTo?: number;
  onErrorAction?: { label: string; onClick: () => void };
  compactError?: boolean;
}) {
  const [bytes, setBytes] = useState<Uint8Array | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    setBytes(null); setErr('');
    (async () => {
      try {
        const b = await readPdfBytes(docUri);
        if (alive) setBytes(b);
      } catch (e: unknown) {
        if (alive) setErr(String(e instanceof Error ? e.message : e));
      }
    })();
    return () => { alive = false; };
  }, [docUri]);

  if (err) {
    return (
      <SadPandaState
        compact={compactError}
        message="Không mở được tài liệu này gòi dợ iu — có thể file quá nặng, liên hệ với chùn để tìm cách fix ngay nà!"
        action={onErrorAction}
      />
    );
  }
  if (!bytes) return <p className="ion-padding">Đang tải PDF…</p>;
  return (
    <PdfView
      bytes={bytes}
      initialPage={initialPage}
      baseScale={baseScale}
      onPageChange={onPageChange ?? (() => {})}
      jumpTo={jumpTo}
    />
  );
}
