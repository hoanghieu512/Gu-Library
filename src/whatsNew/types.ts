// Release notes for Pé (v1.42.0) — plain Vietnamese, in huynh's voice, one entry per version.

/** Shown as "Mới" / "Sửa lỗi" / "Cải thiện". */
export type NoteKind = 'new' | 'fix' | 'improve';

export interface ReleaseNote {
  version: string;   // x.y.z, as in package.json
  date: string;      // dd/mm/yyyy, the release day
  items: { kind: NoteKind; text: string }[];
}
