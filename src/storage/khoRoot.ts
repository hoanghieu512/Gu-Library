// Folders at the kho root that the app makes itself (_inbox, _print), and the check that an
// empty root is a new kho rather than one Android is hiding.

import { Saf } from '../plugins/saf';
import { KhoUnreadableError } from './khoHidden';

/**
 * Saf.ensureDir for a folder at the kho root (_inbox, _print), refusing a kho Android is hiding.
 * Trust nothing the root cannot show: a folder ensured but not listed is one the worker and the
 * rest of the app would not find either.
 */
export async function ensureKhoDir(root: string, name: string): Promise<string> {
  const { uri } = await Saf.ensureDir({ parentUri: root, name });
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
