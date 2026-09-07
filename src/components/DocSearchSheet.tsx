import { useEffect, useRef, useState } from 'react';
import { IonIcon, IonSpinner } from '@ionic/react';
import { searchOutline, closeCircle } from 'ionicons/icons';
import GuSheet from './GuSheet';
import { indexOneDoc } from '../search/docIndex';
import { search, parseQuery } from '../search/invertedIndex';
import type { Hit, SearchIndex } from '../search/invertedIndex';
import { makeSnippet } from '../search/snippet';

// "Tìm trong tài liệu này" — mở từ Viewer (v1.39.0, đến từ góp ý thật của Gú sau khi dùng
// v1.38.1: tìm toàn kho đã tốt, nhưng đang đọc một quyển thì muốn tra ngay trong quyển đó).
//
// Vì sao là SHEET đoạn-trích chứ không phải thanh ‹ › kiểu Ctrl+F: pdf.js render ra CANVAS,
// KHÔNG có lớp text → không tô sáng được chữ khớp trên trang. Bấm › mà nhảy tới trang 47 rồi
// phải dò bằng mắt trên một trang luật dày là hụt. Đoạn trích chính là thứ thay cho tô sáng.

const DEBOUNCE_MS = 130;
const LIMIT = 50;

export default function DocSearchSheet({ isOpen, docUri, docName, onClose, onJump }: {
  isOpen: boolean;
  docUri: string | null;
  docName: string;
  onClose: () => void;
  onJump: (page: number) => void;
}) {
  return (
    <GuSheet isOpen={isOpen} title="Tìm trong tài liệu này" onClose={onClose} breakpoint={0.75}>
      {/* `key` theo tài liệu: đổi tài liệu là thân sheet mount lại → ô nhập và kết quả tự tươi.
          KHÔNG reset state bằng tay trong effect (đặt state đồng bộ trong effect gây vẽ lại
          dây chuyền — lint bắt đúng, và cách này còn ít chỗ sai hơn). */}
      {isOpen && docUri && (
        <Body key={docUri} docUri={docUri} docName={docName} onClose={onClose} onJump={onJump} />
      )}
    </GuSheet>
  );
}

function Body({ docUri, docName, onClose, onJump }: {
  docUri: string; docName: string; onClose: () => void; onJump: (page: number) => void;
}) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [ix, setIx] = useState<SearchIndex | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'image' | 'error'>('loading');
  const inputRef = useRef<HTMLInputElement>(null);

  // `autoFocus` KHÔNG ăn trong IonModal — đo trên máy: sheet mở ra mà bàn phím không bật, phải
  // chạm thêm một nhát vào ô. Hoãn một nhịp cho sheet trượt xong rồi mới focus.
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, []);

  // Nạp lại mỗi lần MỞ sheet cho một tài liệu — index một quyển rẻ (~80ms), khỏi giữ trong RAM
  // giữa các lần mở, và luôn tươi nếu worker vừa ghi đè sidecar.
  useEffect(() => {
    let alive = true;
    (async () => {
      const r = await indexOneDoc(docUri);
      if (!alive) return;
      if (!r) { setState('error'); return; }
      setIx(r.index);
      setState(r.imageOnly ? 'image' : 'ready');
    })();
    return () => { alive = false; };
  }, [docUri]);

  useEffect(() => {
    if (!ix) return;
    const t = setTimeout(() => setHits(q.trim() ? search(ix, q, LIMIT) : []), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [q, ix]);

  const { seq } = parseQuery(q);

  return (
    <div style={{ padding: '4px 16px 16px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, background: 'var(--gu-white)',
          border: '1px solid var(--gu-grey)', borderRadius: 999, padding: '9px 14px',
        }}>
          <IonIcon icon={searchOutline} style={{ color: 'var(--gu-grey)', flex: '0 0 auto' }} />
          <input
            ref={inputRef}
            value={q} onChange={(e) => setQ(e.target.value)}
            placeholder={`Tìm trong “${docName}”…`}
            aria-label="Tìm trong tài liệu này"
            enterKeyHint="search" autoCorrect="off" autoCapitalize="none" spellCheck={false}
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

        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          margin: '10px 2px 6px', fontSize: 12, color: 'var(--gu-grey)', minHeight: 16,
        }}>
          {state === 'loading' && <><IonSpinner name="dots" style={{ width: 18, height: 12 }} />đang đọc tài liệu…</>}
          {state === 'error' && 'không đọc được nội dung tài liệu này'}
          {state === 'image' && 'tài liệu này là ảnh chụp/scan — chưa tra được chữ bên trong'}
          {state === 'ready' && (q.trim()
            ? `${hits.length}${hits.length >= LIMIT ? '+' : ''} đoạn khớp`
            : 'gõ để tìm — có dấu hay không dấu đều được')}
        </div>

        {state === 'ready' && q.trim() && hits.length === 0 && (
          <p style={{ color: 'var(--gu-grey)', fontSize: 13.5, lineHeight: 1.6, margin: '12px 2px' }}>
            Không có đoạn nào khớp trong tài liệu này. Thử bớt chữ, hoặc tìm cả kho ở tab Tìm.
          </p>
        )}

        {hits.map((h, i) => {
          const sn = makeSnippet(h.unit.text, seq);
          const parts: React.ReactNode[] = [];
          let at = 0;
          sn.marks.forEach((m, k) => {
            if (m.start > at) parts.push(sn.text.slice(at, m.start));
            parts.push(<mark key={k} style={{ background: 'rgba(231,197,110,.55)', color: 'inherit', padding: 0 }}>
              {sn.text.slice(m.start, m.end)}
            </mark>);
            at = m.end;
          });
          if (at < sn.text.length) parts.push(sn.text.slice(at));
          return (
            <div
              key={`${h.unit.page}#${i}`}
              onClick={() => { onJump(h.unit.page); onClose(); }}
              role="button" aria-label={`Nhảy tới trang ${h.unit.page}`}
              style={{
                background: 'var(--gu-white)', borderRadius: 10, padding: '11px 13px',
                marginBottom: 8, cursor: 'pointer', border: '1px solid rgba(117,66,14,.10)',
              }}
            >
              <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--gu-brown-deep)' }}>
                {sn.cutHead && '… '}{parts}{sn.cutTail && ' …'}
              </div>
              <div style={{
                marginTop: 6, fontSize: 12, color: 'var(--gu-brown)', fontVariantNumeric: 'tabular-nums',
              }}>
                {h.unit.label ? `${h.unit.label} · ` : ''}trang {h.unit.page}
              </div>
            </div>
          );
      })}
    </div>
  );
}
