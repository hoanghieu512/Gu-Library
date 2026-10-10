import { useState } from 'react';
import type { DocHit } from '../search/invertedIndex';
import DocResultCard from './DocResultCard';

// A common word matches 150+ documents; drawing every card at once is wasted work on a slow phone.
const PAGE = 20;

// Cards in rank order, PAGE at a time. The caller keys this by the query so a new query starts
// back at PAGE without resetting state inside an effect.
export default function DocResultList({ docs, seq, names, onOpenPage, onOpenAll }: {
  docs: DocHit[];
  seq: string[];
  names?: Map<string, string>;  // pdfUri → renamed name (refreshIndex); missing → file name
  onOpenPage: (pdfUri: string, page: number) => void;
  onOpenAll: (pdfUri: string) => void;
}) {
  const [shown, setShown] = useState(PAGE);
  return (
    <>
      {docs.slice(0, shown).map((h) => (
        <DocResultCard
          key={h.doc.pdfUri} hit={h} seq={seq} name={names?.get(h.doc.pdfUri) ?? h.doc.name}
          onOpenPage={(page) => onOpenPage(h.doc.pdfUri, page)}
          onOpenAll={() => onOpenAll(h.doc.pdfUri)}
        />
      ))}
      {docs.length > shown && (
        <button
          type="button" onClick={() => setShown((s) => s + PAGE)}
          style={{
            display: 'block', margin: '4px auto 12px', padding: '10px 18px', background: 'transparent',
            border: 'none', fontFamily: 'inherit', fontSize: 14, fontWeight: 600,
            color: 'var(--gu-brown)', cursor: 'pointer',
          }}
        >
          Hiện thêm tài liệu
        </button>
      )}
    </>
  );
}
