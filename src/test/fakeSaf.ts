// In-memory stand-in for the Saf plugin, for tests that walk the kho through SAF.
//
// It behaves like the phone: a folder lists its children, the provider renames a name that is
// already taken ("_inbox" -> "_inbox (1)"), and `hideAll` mimics the provider bug seen on dGen1
// after a bad boot (2026-10-17), where every folder in the kho lists as empty but folders can
// still be created. `rejectHidden` mimics SafPlugin once it refuses that case with KHO_HIDDEN
// (ensureDir, createDir, copyToDir, writeFile); without it, the plugin behaves like the old one and
// hands back the copy the provider renamed.

import type { SafEntry, SafPlugin } from '../plugins/saf';

// URIs shaped like ExternalStorageProvider's, so relPathFromUris works on them.
const ROOT_DOC = 'primary:Download/kho';
export const ROOT = `content://com.android.externalstorage.documents/tree/${encodeURIComponent(ROOT_DOC)}`;

interface Node { name: string; isDirectory: boolean; parent: string | null; data: string; docId: string }

export interface FakeKho {
  saf: Partial<SafPlugin>;
  state: { hideAll: boolean; rejectHidden: boolean };
  /** Names of the folders directly under `parentUri`, as they are on disk (ignores hideAll). */
  dirNames(parentUri?: string): string[];
  /** Names of the files directly under `parentUri`, as they are on disk (ignores hideAll). */
  fileNames(parentUri?: string): string[];
  /** Create a folder or file by path under the root, e.g. mkdir('Logic/Slide'). Returns its uri. */
  mkdir(path: string): string;
  put(path: string, data?: string): string;
}

export function fakeKho(): FakeKho {
  const nodes = new Map<string, Node>([[ROOT, { name: 'kho', isDirectory: true, parent: null, data: '', docId: ROOT_DOC }]]);
  const state = { hideAll: false, rejectHidden: false };

  const children = (uri: string) => [...nodes.entries()].filter(([, n]) => n.parent === uri);
  const toEntry = ([uri, n]: [string, Node]): SafEntry =>
    ({ name: n.name, isDirectory: n.isDirectory, uri, size: n.data.length, lastModified: 1 });
  const taken = (parent: string, name: string) => children(parent).some(([, n]) => n.name === name);

  // Android dedups a folder as "x (1)" and a file as "x (1).pdf".
  const uniqueName = (parent: string, name: string, isDirectory: boolean) => {
    if (!taken(parent, name)) return name;
    const dot = isDirectory ? -1 : name.lastIndexOf('.');
    const base = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : '';
    for (let k = 1; ; k++) {
      const cand = `${base} (${k})${ext}`;
      if (!taken(parent, cand)) return cand;
    }
  };

  const add = (parent: string, name: string, isDirectory: boolean, data = '') => {
    const docId = `${nodes.get(parent)!.docId}/${name}`;
    const uri = `${ROOT}/document/${encodeURIComponent(docId)}`;
    nodes.set(uri, { name, isDirectory, parent, data, docId });
    return uri;
  };

  // What a fresh listing of `uri` shows: nothing while the provider hides the kho.
  const visible = (uri: string) => (state.hideAll ? [] : children(uri));

  // Create on disk, where the provider renames a taken name. A rename the plugin did not ask for
  // while the listing cannot see the original is the hidden kho: with `rejectHidden` the plugin
  // removes the copy and rejects with KHO_HIDDEN, without it (old plugin) the copy stays.
  const create = (parent: string, name: string, isDirectory: boolean, data = '') => {
    const got = uniqueName(parent, name, isDirectory);
    const uri = add(parent, got, isDirectory, data);
    if (got !== name && state.hideAll && state.rejectHidden) {
      nodes.delete(uri);
      throw Object.assign(new Error(`'${name}' is there but the provider does not list it`), { code: 'KHO_HIDDEN' });
    }
    return uri;
  };

  const walk = (path: string, leafIsDir: boolean, data = '') => {
    let cur = ROOT;
    const segs = path.split('/').filter(Boolean);
    segs.forEach((s, i) => {
      const last = i === segs.length - 1;
      const hit = children(cur).find(([, n]) => n.name === s);
      cur = hit ? hit[0] : add(cur, s, last ? leafIsDir : true, last ? data : '');
    });
    return cur;
  };

  const saf: Partial<SafPlugin> = {
    async listFolder({ uri }) {
      if (!nodes.has(uri)) throw new Error('list failed: no such folder');
      if (state.hideAll) return { entries: [] };
      return { entries: children(uri).map(toEntry) };
    },
    async readFile({ uri }) {
      const n = nodes.get(uri);
      if (!n || n.isDirectory) throw new Error('read failed');
      return { data: n.data };
    },
    // Mirrors SafPlugin.ensureDir: reuse the folder the listing shows, otherwise create one.
    async ensureDir({ parentUri, name }) {
      const seen = visible(parentUri).find(([, n]) => n.isDirectory && n.name === name);
      if (seen) return { uri: seen[0] };
      return { uri: create(parentUri, name, true) };
    },
    // Mirrors SafPlugin.createDir: refuse a name the listing shows, otherwise create it.
    async createDir({ parentUri, name }) {
      if (visible(parentUri).some(([, n]) => n.name === name)) throw new Error('exists');
      const uri = create(parentUri, name, true);
      return { uri, name: nodes.get(uri)!.name };
    },
    // Mirrors SafPlugin.copyToDir: its own " (k)" dedup only sees what the listing shows.
    async copyToDir({ dirUri, name }) {
      if (!nodes.get(dirUri)?.isDirectory) throw new Error('not a directory');
      let want = name;
      for (let k = 1; visible(dirUri).some(([, n]) => n.name === want); k++) {
        const dot = name.lastIndexOf('.');
        want = dot > 0 ? `${name.slice(0, dot)} (${k})${name.slice(dot)}` : `${name} (${k})`;
      }
      const uri = create(dirUri, want, false, 'copied');
      return { uri, name: nodes.get(uri)!.name };
    },
    // Mirrors SafPlugin.writeFile: replace the file the listing shows, otherwise create one.
    async writeFile({ dirUri, name, content }) {
      const old = visible(dirUri).find(([, n]) => n.name === name);
      if (old) nodes.delete(old[0]);
      return { uri: create(dirUri, name, false, content) };
    },
    async deleteFile({ uri }) {
      if (!nodes.delete(uri)) throw new Error('delete returned false');
    },
  };

  const names = (parentUri: string, isDirectory: boolean) =>
    children(parentUri).filter(([, n]) => n.isDirectory === isDirectory).map(([, n]) => n.name).sort();

  return {
    saf,
    state,
    dirNames: (parentUri = ROOT) => names(parentUri, true),
    fileNames: (parentUri = ROOT) => names(parentUri, false),
    mkdir: (path) => walk(path, true),
    put: (path, data = '') => walk(path, false, data),
  };
}
