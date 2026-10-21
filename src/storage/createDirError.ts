// Saf.createDir rejects "exists" when the name is taken. When the provider had already made a copy
// ("Slide (1)") that the plugin could not remove, the rejection names it (SafNames.takenMessage),
// so the screen can say an empty folder was left in the synced kho (review of 18/10).

const LEFT_BEHIND = /could not remove the empty copy '(.+)'$/;

/** `text` (the screen's "already taken" line), plus a sentence on the empty copy left behind. */
export function withLeftoverNote(text: string, message: string): string {
  const m = LEFT_BEHIND.exec(message);
  return m ? `${text}. Còn sót một thư mục trống “${m[1]}”, xoá giúp nha.` : text;
}
