import { useEffect, useState } from 'react';
import WhatsNewSheet from './WhatsNewSheet';
import { RELEASE_NOTES } from '../whatsNew/notes';
import { unseenNotes } from '../whatsNew/select';
import { getSeenVersion, setSeenVersion } from '../whatsNew/seen';
import type { ReleaseNote } from '../whatsNew/types';

// Once after each update (v1.42.0), like CrashNotice: the notes of every version Pé has not seen,
// at most 3. Closing the sheet any way (Đã hiểu, Đóng, swipe, back) counts as seen. If the stored
// version cannot be read, show nothing — better than nagging on every launch.
export default function WhatsNewNotice() {
  const [notes, setNotes] = useState<ReleaseNote[]>([]);
  useEffect(() => {
    let alive = true;
    getSeenVersion()
      .then((seen) => { if (alive) setNotes(unseenNotes(RELEASE_NOTES, seen, __APP_VERSION__)); })
      .catch(() => { /* unreadable storage → no sheet */ });
    return () => { alive = false; };
  }, []);
  if (notes.length === 0) return null;
  const close = () => {
    setNotes([]);
    setSeenVersion(__APP_VERSION__).catch(() => { /* shows again next launch — harmless */ });
  };
  return <WhatsNewSheet isOpen notes={notes} onClose={close} acknowledge />;
}
