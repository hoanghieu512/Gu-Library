import { registerPlugin } from '@capacitor/core';

export interface SafEntry {
  name: string;
  isDirectory: boolean;
  uri: string;
}

export interface SafPlugin {
  pickFolder(): Promise<{ uri: string }>;
  hasPermission(options: { uri: string }): Promise<{ granted: boolean }>;
  listFolder(options: { uri: string }): Promise<{ entries: SafEntry[] }>;
  readFile(options: { uri: string }): Promise<{ data: string }>;
  readFileBase64(options: { uri: string }): Promise<{ data: string }>;
  copyToDir(options: { srcUri: string; dirUri: string; name: string }): Promise<{ uri: string; name: string }>;
  /* TEMP M6 spike */
  ensureDir(options: { parentUri: string; name: string }): Promise<{ uri: string }>;
  createDir(options: { parentUri: string; name: string }): Promise<{ uri: string; name: string }>;
  writeFile(options: { dirUri: string; name: string; content: string }): Promise<{ uri: string }>;
}

export const Saf = registerPlugin<SafPlugin>('Saf');
