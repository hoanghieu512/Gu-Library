// The kho is there but Android will not list what is in it. Seen on dGen1 after a bad boot
// (2026-10-17): com.android.externalstorage could not see /storage/emulated, so it treated the
// whole kho as hidden. Every folder listed as empty while creating folders still worked, so
// ensureDir("_inbox") came back as a new, empty "_inbox (1)" that the worker never reads.

import { Saf } from '../plugins/saf';

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

/** The code SafPlugin rejects with when a name is taken on disk but the listing does not show it. */
const HIDDEN_CODE = 'KHO_HIDDEN';

/** A write to the kho through Saf, with KHO_HIDDEN turned into KhoUnreadableError. */
export async function khoWrite<T>(write: Promise<T>): Promise<T> {
  try {
    return await write;
  } catch (err) {
    if ((err as { code?: string } | null | undefined)?.code === HIDDEN_CODE) {
      throw new KhoUnreadableError((err as Error).message);
    }
    throw err;
  }
}

/**
 * Saf.ensureDir for a folder at the kho root (_inbox, _print), refusing a kho Android is hiding.
 * Trust nothing the root cannot show: a folder ensured but not listed is one the worker and the
 * rest of the app would not find either.
 */
export async function ensureKhoDir(root: string, name: string): Promise<string> {
  const { uri } = await khoWrite(Saf.ensureDir({ parentUri: root, name }));
  const { entries } = await Saf.listFolder({ uri: root });
  // Any case: on a case-insensitive disk (UBS1) "_Inbox" is the folder ensureDir handed back.
  const want = name.toLowerCase();
  if (!entries.some((e) => e.isDirectory && e.name.toLowerCase() === want)) {
    throw new KhoUnreadableError(`root does not list ${name}`);
  }
  return uri;
}

/**
 * An empty root is a brand-new kho, or one Android is hiding. Call this with the root's listing
 * before acting on "nothing is there": a new kho just gains its _inbox, a hidden one throws.
 */
export async function assertRootListed(root: string, rootEntries: readonly unknown[]): Promise<void> {
  if (rootEntries.length === 0) await ensureKhoDir(root, '_inbox');
}
