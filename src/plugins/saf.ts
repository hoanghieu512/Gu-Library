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
}

export const Saf = registerPlugin<SafPlugin>('Saf');
