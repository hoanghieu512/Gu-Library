export type { SafEntry } from '../plugins/saf';

export interface Document {
  name: string;        // tên HIỂN THỊ (listFolder override = display; classify để = fileBase)
  fileBase?: string;   // base tên FILE (không đổi) — thao tác file (move/xóa/print) theo cái này
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
