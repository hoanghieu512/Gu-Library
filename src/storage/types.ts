export type { SafEntry } from '../plugins/saf';

export interface Document {
  name: string;
  pdfUri: string;
  jsonUri: string;
  printFlagged: boolean;
  displayUri?: string; // companion <base>.display.json (nếu có) — tên hiển thị override
}

export interface PendingDoc {
  name: string;
  ext: string;
  sourceUri: string;
}

export interface SubFolder {
  name: string;
  uri: string;
}

export interface FolderListing {
  folders: SubFolder[];
  documents: Document[];
  pending: PendingDoc[];
  hasPending: boolean;
}

export interface MonMeta {
  color?: string;
  order?: number;
  /** Optional override for the swatch character (default = first letter of folder name). */
  icon?: string;
}

export interface Mon {
  name: string;
  uri: string;
  meta: MonMeta;
}
