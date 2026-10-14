import type { CSSProperties } from 'react';
import GuSheet from './GuSheet';
import type { NoteKind, ReleaseNote } from '../whatsNew/types';

// "Có gì mới" (v1.42.0): the release notes for Pé, newest version first. The same sheet opens by
// itself once after an update (`acknowledge` → a "Đã hiểu" button) and from Settings (just "Đóng").

// Chips use the B1 row palette: brown for new, red-earth for fixes, moss green for improvements.
const KIND: Record<NoteKind, { label: string; bg: string }> = {
  new: { label: 'Mới', bg: 'var(--gu-brown)' },
  fix: { label: 'Sửa lỗi', bg: 'var(--ion-color-danger)' },
  improve: { label: 'Cải thiện', bg: '#4A5D3A' },
};

// One width for every chip (that of the widest, "Cải thiện"), so the note text starts on one line
// down the sheet (v1.42.1). In em, so it grows with the chip's text under the system font size.
const CHIP: CSSProperties = {
  flex: '0 0 auto', width: '6.4em', boxSizing: 'border-box', marginTop: 2, padding: '1px 0',
  borderRadius: 999, textAlign: 'center',
  color: '#fff', fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap',
};

export default function WhatsNewSheet({ isOpen, notes, onClose, acknowledge = false }: {
  isOpen: boolean;
  notes: ReleaseNote[];
  onClose: () => void;
  acknowledge?: boolean;
}) {
  return (
    <GuSheet isOpen={isOpen} title="Có gì mới" onClose={onClose} breakpoint={0.75}>
      {/* No scroll area of its own: GuSheet's IonContent scrolls, which keeps Ionic's "do not
          swipe the sheet closed while the content is scrolled" check working. */}
      <div style={{ padding: '4px 0 8px' }}>
        {notes.map((n) => (
          <section key={n.version} style={{ marginBottom: 18 }}>
            <h3 style={{
              fontFamily: 'var(--gu-serif)', fontWeight: 700, fontSize: 15, color: 'var(--gu-brown-deep)',
              margin: '8px 0 10px',
            }}>
              Phiên bản {n.version} · {n.date}
            </h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {n.items.map((it, i) => (
                <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                  <span style={{ ...CHIP, background: KIND[it.kind].bg }}>{KIND[it.kind].label}</span>
                  <span style={{ fontSize: 14, lineHeight: 1.5, color: 'var(--gu-brown-deep)' }}>{it.text}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {acknowledge && (
          // A native button styled like the app's round primary IonButton (a real button role for
          // screen readers and the e2e suite).
          <button type="button" onClick={onClose} style={{
            display: 'block', width: '100%', height: 48, marginTop: 4, border: 'none', borderRadius: 999,
            background: 'var(--ion-color-primary)', color: 'var(--ion-color-primary-contrast)',
            fontFamily: 'inherit', fontSize: 16, fontWeight: 500, cursor: 'pointer',
          }}>
            Đã hiểu
          </button>
        )}
      </div>
    </GuSheet>
  );
}
