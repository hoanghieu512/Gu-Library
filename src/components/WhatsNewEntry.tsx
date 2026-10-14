import { useState } from 'react';
import { sparklesOutline } from 'ionicons/icons';
import WhatsNewSheet from './WhatsNewSheet';
import SettingsRow, { Chevron } from './SettingsRow';
import { RELEASE_NOTES } from '../whatsNew/notes';
import { recentNotes } from '../whatsNew/select';

// "Có gì mới" in Settings: opens the sheet with the 3 latest versions. Since 1.42.1 a card like the
// other Settings items (the grey line of 1.42.0 did not look tappable), and its version is the one the
// notes are picked by: the built `__APP_VERSION__` (Android's versionName comes from the same
// package.json). Looking here does not touch the "seen" mark; that belongs to the sheet shown after
// an update.
export default function WhatsNewEntry() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <SettingsRow
        icon={sparklesOutline} title="Có gì mới" value={`Phiên bản ${__APP_VERSION__}`}
        hint="Xem lại ghi chú các bản gần đây" trailing={<Chevron />}
        onClick={() => setOpen(true)} ariaLabel={`Xem có gì mới, phiên bản ${__APP_VERSION__}`}
      />
      <WhatsNewSheet isOpen={open} notes={recentNotes(RELEASE_NOTES, __APP_VERSION__)} onClose={() => setOpen(false)} />
    </>
  );
}
