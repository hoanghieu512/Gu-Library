// Reads ONE sidecar for the Điều table of the open document. Same lookup as the in-document
// search (`indexOneDoc`): the cached kho snapshot gives the sidecar's uri, then one readFile.
// Only the small TocEntry list outlives this call; the sidecar text and its parse do not.

import { Saf } from '../plugins/saf';
import { findDocInKho, getKhoSnapshot } from '../storage/khoSnapshot';
import type { Sidecar } from '../search/invertedIndex';
import { buildToc } from './dieuToc';
import type { TocEntry } from './dieuToc';

/**
 * `null` = no table to offer: the document is not in the kho, its sidecar is missing or broken,
 * or Android hides the kho. Never rejects; the Viewer just shows no button. Not logged: a missing
 * sidecar is normal for a document the worker has not processed yet.
 */
export async function loadToc(pdfUri: string): Promise<TocEntry[] | null> {
  try {
    const found = findDocInKho(await getKhoSnapshot(), pdfUri);
    if (!found) return null;
    const raw = (await Saf.readFile({ uri: found.jsonUri })).data;
    return buildToc(JSON.parse(raw) as Sidecar);
  } catch {
    return null;
  }
}
