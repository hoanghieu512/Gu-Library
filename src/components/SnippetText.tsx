import type { ReactNode } from 'react';
import { makeSnippet } from '../search/snippet';

// Highlighted excerpt around the first match of `seq` — shared by the Search screen cards and the
// in-document search sheet so both always cut and mark text the same way.
export default function SnippetText({ text, seq }: { text: string; seq: string[] }) {
  const sn = makeSnippet(text, seq);
  const pieces: ReactNode[] = [];
  let at = 0;
  sn.marks.forEach((m, i) => {
    if (m.start > at) pieces.push(sn.text.slice(at, m.start));
    pieces.push(<mark key={i} style={{ background: 'rgba(231,197,110,.55)', color: 'inherit', padding: 0 }}>
      {sn.text.slice(m.start, m.end)}
    </mark>);
    at = m.end;
  });
  if (at < sn.text.length) pieces.push(sn.text.slice(at));
  return <>{sn.cutHead && '… '}{pieces}{sn.cutTail && ' …'}</>;
}
