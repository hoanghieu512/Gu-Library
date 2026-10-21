import { useEffect, useMemo, useRef, useState } from 'react';
import { IonIcon } from '@ionic/react';
import { closeCircle } from 'ionicons/icons';
import GuSheet from './GuSheet';
import { dieuQuery, filterToc, readingEntries } from '../viewer/dieuToc';
import type { TocEntry } from '../viewer/dieuToc';

// "Mục lục Điều" (spec 2026-10-21): the Chương/Điều of the open document, tap to jump.
//
// The filter is NOT focused on open, unlike the in-document search: the sheet opens scrolled to
// the Điều being read, and a keyboard would cover it. It is not kept on close either, so after a
// jump the reopened sheet shows the mark on the Điều just reached, its neighbours within reach.

// Same pause as the search sheet's focus: let the sheet finish sliding up first.
const SCROLL_DELAY_MS = 350;

export default function DieuTocSheet({ isOpen, docUri, entries, currentPage, onClose, onJump }: {
  isOpen: boolean;
  docUri: string | null;
  entries: TocEntry[] | null;
  currentPage: number;
  onClose: () => void;
  onJump: (page: number) => void;
}) {
  return (
    <GuSheet isOpen={isOpen} title="Mục lục Điều" onClose={onClose} breakpoint={0.75}>
      {/* Mounted only while open and keyed by document: closing drops the filter, opening scrolls again. */}
      {isOpen && docUri && entries && entries.length > 0 && (
        <Body key={docUri} entries={entries} currentPage={currentPage} onPick={(p) => { onJump(p); onClose(); }} />
      )}
    </GuSheet>
  );
}

function Body({ entries, currentPage, onPick }: {
  entries: TocEntry[]; currentPage: number; onPick: (page: number) => void;
}) {
  const [q, setQ] = useState('');
  const filtered = filterToc(entries, q);          // null = no filter
  const rows = filtered ?? entries;
  const reading = useMemo(() => readingEntries(entries, currentPage), [entries, currentPage]);
  const scrollTo = entries.find((e) => reading.has(e.i))?.i;
  const scrollRef = useRef<HTMLDivElement>(null);

  // Only the unfiltered list carries the ref, so a filter typed in the meantime cancels the scroll.
  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollIntoView({ block: 'center' }), SCROLL_DELAY_MS);
    return () => clearTimeout(t);
  }, []);

  let status: string;
  if (!filtered) status = `${entries.length.toLocaleString('vi-VN')} Điều`;
  else if (filtered.length > 0) status = `${filtered.length.toLocaleString('vi-VN')} Điều khớp`;
  else status = `Không có Điều nào số “${dieuQuery(q)}”`;

  return (
    <div style={{ padding: '4px 16px 16px' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, background: 'var(--gu-white)',
        border: '1px solid var(--gu-grey)', borderRadius: 999, padding: '9px 14px',
      }}>
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Lọc theo số Điều…" aria-label="Lọc theo số Điều"
          inputMode="numeric" enterKeyHint="done" autoComplete="off" autoCorrect="off" spellCheck={false}
          style={{
            flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
            fontSize: 15, color: 'var(--gu-brown-deep)', fontFamily: 'inherit',
          }}
        />
        {q && (
          <IonIcon
            icon={closeCircle} onClick={() => setQ('')} role="button" aria-label="Xoá ô lọc"
            style={{ color: 'var(--gu-grey)', flex: '0 0 auto', cursor: 'pointer', fontSize: 18 }}
          />
        )}
      </div>

      <div style={{ margin: '10px 2px 6px', fontSize: 12, color: 'var(--gu-grey)', minHeight: 16 }}>{status}</div>

      {rows.map((e, k) => {
        const header = !filtered && e.chapter !== '' && e.chapter !== rows[k - 1]?.chapter;
        const marked = reading.has(e.i);
        return (
          <div key={e.i}>
            {header && (
              <div className="gu-serif" style={{
                margin: k === 0 ? '4px 2px 6px' : '14px 2px 6px',
                fontSize: 12.5, fontWeight: 700, color: 'var(--gu-brown)',
              }}>
                {e.chapter}
              </div>
            )}
            <div
              ref={!filtered && e.i === scrollTo ? scrollRef : undefined}
              onClick={() => onPick(e.page)}
              role="button" aria-label={`Nhảy tới ${e.label}, trang ${e.page}`}
              style={{
                background: 'var(--gu-white)', borderRadius: 10, padding: '10px 13px',
                marginBottom: 8, cursor: 'pointer', border: '1px solid rgba(117,66,14,.10)',
                boxShadow: marked ? 'inset 3px 0 0 var(--gu-brown)' : undefined,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span className="gu-serif" style={{
                  fontWeight: 700, fontSize: 14, color: 'var(--gu-brown-deep)', whiteSpace: 'nowrap',
                }}>
                  {e.label}
                </span>
                <span style={{
                  flex: 1, minWidth: 0, fontSize: 13.5, color: 'var(--gu-brown-deep)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {e.title}
                </span>
                <span style={{
                  fontSize: 12, color: 'var(--gu-brown)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
                }}>
                  {`tr. ${e.page}`}
                </span>
              </div>
              {filtered && (
                <div style={{ marginTop: 4, fontSize: 12, color: 'var(--gu-grey)' }}>
                  {e.chapter ? `${e.chapter} · trang ${e.page}` : `trang ${e.page}`}
                </div>
              )}
              {marked && (
                <div style={{ marginTop: 4, fontSize: 11.5, fontWeight: 700, color: 'var(--gu-brown)' }}>đang đọc</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
