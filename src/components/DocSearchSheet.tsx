import { useEffect, useRef, useState } from 'react';
import { IonIcon, IonSpinner } from '@ionic/react';
import { searchOutline, closeCircle } from 'ionicons/icons';
import GuSheet from './GuSheet';
import { indexOneDoc } from '../search/docIndex';
import { search, parseQuery } from '../search/invertedIndex';
import type { Hit, SearchIndex } from '../search/invertedIndex';
import SnippetText from './SnippetText';

// "Tìm trong tài liệu này" — mở từ Viewer (v1.39.0, đến từ góp ý thật của Gú sau khi dùng
// v1.38.1: tìm toàn kho đã tốt, nhưng đang đọc một quyển thì muốn tra ngay trong quyển đó).
//
// Vì sao là SHEET đoạn-trích chứ không phải thanh ‹ › kiểu Ctrl+F: pdf.js render ra CANVAS,
// KHÔNG có lớp text → không tô sáng được chữ khớp trên trang. Bấm › mà nhảy tới trang 47 rồi
// phải dò bằng mắt trên một trang luật dày là hụt. Đoạn trích chính là thứ thay cho tô sáng.

const DEBOUNCE_MS = 130;
// Rows drawn per step — a common word can match hundreds of units in one thick document.
const PAGE = 50;

export default function DocSearchSheet({ isOpen, docUri, docName, onClose, onJump, seed }: {
  isOpen: boolean;
  docUri: string | null;
  docName: string;
  onClose: () => void;
  onJump: (page: number) => void;
  /**
   * A query to start with (Search screen "Xem cả N đoạn"). A new `key` replaces the remembered
   * query and restarts the body — the Viewer may be a living page re-entered from another tab.
   */
  seed?: { docUri: string; q: string; key: string };
}) {
  // The body unmounts whenever the sheet closes (including after tapping a result), so the query
  // lives out here, per document: jump to a hit, it's the wrong one, reopen → same query, same hits.
  // A seed counts as a remembered query, so the keyboard stays down and the hits show at once.
  const [queries, setQueries] = useState<Record<string, string>>(() => (seed ? { [seed.docUri]: seed.q } : {}));
  // Adjust state while rendering when the seed changes (no effect → no extra render pass).
  const [seedKey, setSeedKey] = useState(seed?.key);
  if (seed && seed.key !== seedKey) {
    setSeedKey(seed.key);
    setQueries((m) => ({ ...m, [seed.docUri]: seed.q }));
  }
  return (
    <GuSheet isOpen={isOpen} title="Tìm trong tài liệu này" onClose={onClose} breakpoint={0.75}>
      {/* `key` theo tài liệu: đổi tài liệu là thân sheet mount lại → ô nhập và kết quả tự tươi.
          KHÔNG reset state bằng tay trong effect (đặt state đồng bộ trong effect gây vẽ lại
          dây chuyền — lint bắt đúng, và cách này còn ít chỗ sai hơn). */}
      {isOpen && docUri && (
        <Body
          key={`${docUri}#${seedKey ?? ''}`} docUri={docUri} docName={docName} onClose={onClose} onJump={onJump}
          initialQ={queries[docUri] ?? ''}
          onQueryChange={(v) => setQueries((m) => ({ ...m, [docUri]: v }))}
        />
      )}
    </GuSheet>
  );
}

function Body({ docUri, docName, onClose, onJump, initialQ, onQueryChange }: {
  docUri: string; docName: string; onClose: () => void; onJump: (page: number) => void;
  initialQ: string; onQueryChange: (q: string) => void;
}) {
  const [q, setQState] = useState(initialQ);
  const [reopened] = useState(initialQ !== '');   // fixed at mount; initialQ keeps changing as we type
  const setQ = (v: string) => { setQState(v); onQueryChange(v); };
  const [hits, setHits] = useState<Hit[]>([]);
  const [ix, setIx] = useState<SearchIndex | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'image' | 'error'>('loading');
  const inputRef = useRef<HTMLInputElement>(null);

  // `autoFocus` KHÔNG ăn trong IonModal — đo trên máy: sheet mở ra mà bàn phím không bật, phải
  // chạm thêm một nhát vào ô. Hoãn một nhịp cho sheet trượt xong rồi mới focus.
  // Reopened with a remembered query → leave the keyboard down so the hits stay visible.
  useEffect(() => {
    if (reopened) return;
    const t = setTimeout(() => inputRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, [reopened]);

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
    const t = setTimeout(() => setHits(q.trim() ? search(ix, q) : []), DEBOUNCE_MS);
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
            ? `${hits.length.toLocaleString('vi-VN')} đoạn khớp`
            : 'gõ để tìm — có dấu hay không dấu đều được')}
        </div>

        {state === 'ready' && q.trim() && hits.length === 0 && (
          <p style={{ color: 'var(--gu-grey)', fontSize: 13.5, lineHeight: 1.6, margin: '12px 2px' }}>
            Không có đoạn nào khớp trong tài liệu này. Thử bớt chữ, hoặc tìm cả kho ở tab Tìm.
          </p>
        )}

        {/* Keyed by the query: a new query starts again at the first PAGE rows. */}
        <HitRows key={q} hits={hits} seq={seq} onPick={(page) => { onJump(page); onClose(); }} />
    </div>
  );
}

function HitRows({ hits, seq, onPick }: { hits: Hit[]; seq: string[]; onPick: (page: number) => void }) {
  const [shown, setShown] = useState(PAGE);
  const more = Math.min(PAGE, hits.length - shown);
  return (
    <>
      {hits.slice(0, shown).map((h, i) => (
        <div
          key={`${h.unit.page}#${i}`}
          onClick={() => onPick(h.unit.page)}
          role="button" aria-label={`Nhảy tới trang ${h.unit.page}`}
          style={{
            background: 'var(--gu-white)', borderRadius: 10, padding: '11px 13px',
            marginBottom: 8, cursor: 'pointer', border: '1px solid rgba(117,66,14,.10)',
          }}
        >
          <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--gu-brown-deep)' }}>
            <SnippetText text={h.unit.text} seq={seq} />
          </div>
          <div style={{
            marginTop: 6, fontSize: 12, color: 'var(--gu-brown)', fontVariantNumeric: 'tabular-nums',
          }}>
            {h.unit.label ? `${h.unit.label} · ` : ''}trang {h.unit.page}
          </div>
        </div>
      ))}
      {more > 0 && (
        <button
          type="button" onClick={() => setShown((s) => s + PAGE)}
          style={{
            display: 'block', margin: '4px auto 8px', padding: '10px 18px', background: 'transparent',
            border: 'none', fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
            color: 'var(--gu-brown)', cursor: 'pointer',
          }}
        >
          Hiện thêm {more} đoạn
        </button>
      )}
    </>
  );
}
