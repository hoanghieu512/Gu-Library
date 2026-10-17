// The kho is there but Android will not list what is in it. Seen on dGen1 after a bad boot
// (2026-10-17): com.android.externalstorage could not see /storage/emulated, so it treated the
// whole kho as hidden. Every folder listed as empty while creating folders still worked, so
// ensureDir("_inbox") came back as a new, empty "_inbox (1)" that the worker never reads.

import { Saf } from '../plugins/saf';

export class KhoUnreadableError extends Error {
  constructor(detail: string) {
    super(`kho cannot be listed: ${detail}`);
    this.name = 'KhoUnreadableError';
  }
}

/** The code SafPlugin.ensureDir rejects with when the folder exists but is not listed. */
const HIDDEN_CODE = 'KHO_HIDDEN';

/**
 * Saf.ensureDir for a folder at the kho root (_inbox, _print), refusing a kho Android is hiding.
 * Trust nothing the root cannot show: a folder ensured but not listed is one the worker and the
 * rest of the app would not find either.
 */
export async function ensureKhoDir(root: string, name: string): Promise<string> {
  let uri: string;
  try {
    ({ uri } = await Saf.ensureDir({ parentUri: root, name }));
  } catch (err) {
    if ((err as { code?: string }).code === HIDDEN_CODE) throw new KhoUnreadableError((err as Error).message);
    throw err;
  }
  const { entries } = await Saf.listFolder({ uri: root });
  if (!entries.some((e) => e.isDirectory && e.name === name)) {
    throw new KhoUnreadableError(`root does not list ${name}`);
  }
  return uri;
}

/** What to tell Gú. Picking the folder again would not help: the phone is at fault, not the folder. */
export const KHO_UNREADABLE_MESSAGE =
  'Điện thoại đang không cho app đọc folder kho, thường do máy khởi động lỗi. '
  + 'Khởi động lại máy rồi mở lại app nha. Trong lúc này app không ghi gì vào kho.';
