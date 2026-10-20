// The kho is there but Android will not list what is in it. Seen on dGen1 after a bad boot
// (2026-10-17): com.android.externalstorage could not see /storage/emulated, so it treated the
// whole kho as hidden. Every folder listed as empty while creating folders still worked, so
// ensureDir("_inbox") came back as a new, empty "_inbox (1)" that the worker never reads.
// SafPlugin now refuses that case with KHO_HIDDEN, which src/plugins/saf.ts turns into
// KhoUnreadableError for every call.

/** What to tell Gú. Picking the folder again would not help: the phone is at fault, not the folder. */
export const KHO_UNREADABLE_MESSAGE =
  'Điện thoại đang không cho app đọc folder kho, thường do máy khởi động lỗi. '
  + 'Khởi động lại máy rồi mở lại app nha. Trong lúc này app không ghi gì vào kho.';

/**
 * Its message is the one to show Gú, like the other errors the repos throw, so a screen that
 * shows `err.message` says the right thing; `detail` says what was not listed.
 */
export class KhoUnreadableError extends Error {
  readonly detail: string;
  constructor(detail: string) {
    super(KHO_UNREADABLE_MESSAGE);
    this.name = 'KhoUnreadableError';
    this.detail = detail;
  }
}
