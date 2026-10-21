import { registerPlugin } from '@capacitor/core';

export interface SafEntry {
  name: string;
  isDirectory: boolean;
  uri: string;
  // Fingerprint that lets the search index tell which files changed (v1.38.0). Comes back on the
  // same cursor as listFolder, so it costs no extra SAF round trip. **-1 = the DocumentsProvider
  // does not return that column**: treat it as changed and read again, never as equal (two files
  // that are both -1 say nothing).
  size?: number;
  lastModified?: number;
}

export interface SafPlugin {
  pickFolder(): Promise<{ uri: string }>;
  pickFiles(): Promise<{ files: { uri: string; name: string }[] }>;
  hasPermission(options: { uri: string }): Promise<{ granted: boolean }>;
  listFolder(options: { uri: string }): Promise<{ entries: SafEntry[] }>;
  readFile(options: { uri: string }): Promise<{ data: string }>;
  readFileBase64(options: { uri: string }): Promise<{ data: string }>;
  probeReadable(options: { uri: string }): Promise<void>; // open test (v1.26.0): call before fetching a PDF; rejects when the file is gone or access was revoked

  copyToDir(options: { srcUri: string; dirUri: string; name: string }): Promise<{ uri: string; name: string }>;
  /* TEMP M6 spike */
  ensureDir(options: { parentUri: string; name: string }): Promise<{ uri: string }>;
  createDir(options: { parentUri: string; name: string }): Promise<{ uri: string; name: string }>;
  renameDir(options: { uri: string; newName: string }): Promise<{ uri: string }>;
  writeFile(options: { dirUri: string; name: string; content: string }): Promise<{ uri: string }>;
  deleteFile(options: { uri: string }): Promise<void>;
  /** android.util.Log.w under the tag GuApp; see appLog.ts. */
  logWarn(options: { message: string }): Promise<void>;
}

// The plugin as the native side answers. Code outside src/plugins goes through `Saf` (saf.ts);
// tests fake this one, so the JS that wraps it runs in them too.
export const SafNative = registerPlugin<SafPlugin>('Saf');
