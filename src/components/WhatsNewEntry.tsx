import { useState } from 'react';
import WhatsNewSheet from './WhatsNewSheet';
import { RELEASE_NOTES } from '../whatsNew/notes';
import { recentNotes } from '../whatsNew/select';

// Settings' version line, now a button (v1.42.0): opens "Có gì mới" with the 3 latest versions.
// Looking here does not touch the "seen" mark — that belongs to the sheet shown after an update.
export default function WhatsNewEntry({ version }: { version: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button" onClick={() => setOpen(true)} aria-label={`Xem có gì mới, phiên bản ${version}`}
        style={{
          display: 'block', margin: '24px auto 0', padding: '8px 12px', background: 'none', border: 'none',
          fontFamily: 'inherit', fontSize: 13, color: 'var(--gu-grey)', cursor: 'pointer',
        }}
      >
        Có gì mới · Phiên bản {version}
      </button>
      <WhatsNewSheet isOpen={open} notes={recentNotes(RELEASE_NOTES, __APP_VERSION__)} onClose={() => setOpen(false)} />
    </>
  );
}
