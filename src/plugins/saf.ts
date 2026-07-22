import { registerPlugin } from '@capacitor/core';

export interface SafEntry {
  name: string;
  isDirectory: boolean;
  uri: string;
}

export interface SafPlugin {
  pickFolder(): Promise<{ uri: string }>;
  pickFiles(): Promise<{ files: { uri: string; name: string }[] }>;
  hasPermission(options: { uri: string }): Promise<{ granted: boolean }>;
  listFolder(options: { uri: string }): Promise<{ entries: SafEntry[] }>;
  readFile(options: { uri: string }): Promise<{ data: string }>;
  readFileBase64(options: { uri: string }): Promise<{ data: string }>;
  probeReadable(options: { uri: string }): Promise<void>; // mở thử (v1.26.0) — gọi trước fetch PDF, gone/thu-quyền → reject

  copyToDir(options: { srcUri: string; dirUri: string; name: string }): Promise<{ uri: string; name: string }>;
  /* TEMP M6 spike */
  ensureDir(options: { parentUri: string; name: string }): Promise<{ uri: string }>;
  createDir(options: { parentUri: string; name: string }): Promise<{ uri: string; name: string }>;
  renameDir(options: { uri: string; newName: string }): Promise<{ uri: string }>;
  writeFile(options: { dirUri: string; name: string; content: string }): Promise<{ uri: string }>;
  deleteFile(options: { uri: string }): Promise<void>;
}

export const Saf = registerPlugin<SafPlugin>('Saf');
