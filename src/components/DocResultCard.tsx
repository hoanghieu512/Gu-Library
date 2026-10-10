import type { DocHit } from '../search/invertedIndex';
import MonSwatch from './MonSwatch';
import SnippetText from './SnippetText';

// One document on the Search screen (v1.41.0): subject, name, match count, its best excerpt
// (tap → that page) and "Xem cả N đoạn" (tap → the document with its in-document search open).
// The excerpt is the first row that sheet will show, and N its row count — same `search` order.
// `name` is what to show: the renamed name when there is one (v1.41.1), else the file name. Labels
// name the subject too, so the same file filed under two subjects never gives two equal labels.
export default function DocResultCard({ hit, name, seq, onOpenPage, onOpenAll }: {
  hit: DocHit; name: string; seq: string[]; onOpenPage: (page: number) => void; onOpenAll: () => void;
}) {
  const { doc, count, best } = hit;
  const { unit } = best;
  const n = count.toLocaleString('vi-VN');
  return (
    <div style={{
      background: 'var(--gu-white)', borderRadius: 10, marginBottom: 8,
      border: '1px solid rgba(117,66,14,.10)', overflow: 'hidden',
    }}>
      <div
        onClick={() => onOpenPage(unit.page)} role="button" aria-label={`Mở ${name} (môn ${doc.mon}) tại trang ${unit.page}`}
        style={{ padding: '12px 14px', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <MonSwatch name={doc.mon} size={14} />
          <span style={{ fontSize: 12, color: 'var(--gu-grey)' }}>{doc.mon}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
          <span style={{
            flex: 1, minWidth: 0, fontSize: 13.5, color: 'var(--gu-brown-deep)', fontWeight: 600,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{name}</span>
          <span style={{
            flex: '0 0 auto', fontSize: 12, color: 'var(--gu-brown)', fontVariantNumeric: 'tabular-nums',
          }}>{n} đoạn</span>
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--gu-brown-deep)' }}>
          <SnippetText text={unit.text} seq={seq} />
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--gu-brown)', fontVariantNumeric: 'tabular-nums' }}>
          {unit.label ? `${unit.label} · ` : ''}trang {unit.page}
        </div>
      </div>
      {count >= 2 && (
        <button
          type="button" onClick={onOpenAll} aria-label={`Xem cả ${n} đoạn trong ${name} (môn ${doc.mon})`}
          style={{
            display: 'block', width: '100%', textAlign: 'left', padding: '10px 14px',
            background: 'transparent', border: 'none', borderTop: '1px solid rgba(117,66,14,.10)',
            fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: 'var(--gu-brown)', cursor: 'pointer',
          }}
        >
          Xem cả {n} đoạn ›
        </button>
      )}
    </div>
  );
}
