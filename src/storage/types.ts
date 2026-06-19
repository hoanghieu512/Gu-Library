export type { SafEntry } from '../plugins/saf';

export interface Document {
  name: string;
  pdfUri: string;
  jsonUri: string;
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
}

export interface Mon {
  name: string;
  uri: string;
  meta: MonMeta;
}
