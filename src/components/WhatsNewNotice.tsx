import { useEffect, useRef, useState } from 'react';
import WhatsNewSheet from './WhatsNewSheet';
import { RELEASE_NOTES } from '../whatsNew/notes';
import { unseenNotes } from '../whatsNew/select';
import { getSeenVersion, setSeenVersion } from '../whatsNew/seen';
import type { ReleaseNote } from '../whatsNew/types';
import { whenOpeningDone } from '../opening/homeReady';

// Once after each update (v1.42.0), like CrashNotice: the notes of every version Pé has not seen,
// at most 3. Closing the sheet any way (Đã hiểu, Đóng, swipe, back) counts as seen. If the stored
// version cannot be read, show nothing — better than nagging on every launch.
//
// The sheet stays mounted and closes through `isOpen`: unmounting an open IonModal skips Ionic's
// dismiss, which left aria-hidden on the router outlet and hid Home from screen readers and the
// e2e suite (UBS1, 11/10). Closing then fires onClose twice (the button, then onDidDismiss), so the
// seen mark is written once. It opens only once the opening doors are gone (opening/homeReady.ts).
export default function WhatsNewNotice() {
  const [notes, setNotes] = useState<ReleaseNote[]>([]);
  const [open, setOpen] = useState(false);
  const recorded = useRef(false);
  useEffect(() => {
    let alive = true;
    getSeenVersion()
      .then(async (seen) => {
        const fresh = unseenNotes(RELEASE_NOTES, seen, __APP_VERSION__);
        if (fresh.length === 0) return;
        await whenOpeningDone();
        if (alive) { setNotes(fresh); setOpen(true); }
      })
      .catch(() => { /* unreadable storage → no sheet */ });
    return () => { alive = false; };
  }, []);
  if (notes.length === 0) return null;
  const close = () => {
    setOpen(false);
    if (recorded.current) return;
    recorded.current = true;
    setSeenVersion(__APP_VERSION__).catch(() => { /* shows again next launch — harmless */ });
  };
  return <WhatsNewSheet isOpen={open} notes={notes} onClose={close} acknowledge />;
}
