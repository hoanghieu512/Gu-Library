// In-memory stand-in for the Saf plugin, for tests that walk the kho through SAF.
//
// It behaves like the phone: a folder lists its children, the provider renames a name that is
// already taken ("_inbox" -> "_inbox (1)"), and `hideAll` mimics the provider bug seen on dGen1
// after a bad boot (2026-10-17), where every folder in the kho lists as empty but folders can
// still be created. `rejectHidden` mimics SafPlugin.ensureDir once it refuses that case with
// KHO_HIDDEN; without it, ensureDir behaves like the old plugin and hands back the renamed copy.

import type { SafEntry, SafPlugin } from '../plugins/saf';

export const ROOT = 'content://kho';

interface Node { name: string; isDirectory: boolean; parent: string | null; data: string }

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
  const nodes = new Map<string, Node>([[ROOT, { name: 'kho', isDirectory: true, parent: null, data: '' }]]);
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
    const uri = `${parent}/${encodeURIComponent(name)}`;
    nodes.set(uri, { name, isDirectory, parent, data });
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
      const seen = state.hideAll ? undefined
        : children(parentUri).find(([, n]) => n.isDirectory && n.name === name);
      if (seen) return { uri: seen[0] };
      const got = uniqueName(parentUri, name, true);
      const uri = add(parentUri, got, true);
      if (got !== name && state.rejectHidden) {
        nodes.delete(uri);
        throw Object.assign(new Error(`'${name}' exists but the provider does not list it`), { code: 'KHO_HIDDEN' });
      }
      return { uri };
    },
    async copyToDir({ dirUri, name }) {
      if (!nodes.get(dirUri)?.isDirectory) throw new Error('not a directory');
      const got = uniqueName(dirUri, name, false);
      return { uri: add(dirUri, got, false, 'copied'), name: got };
    },
    async writeFile({ dirUri, name, content }) {
      const old = children(dirUri).find(([, n]) => n.name === name);
      if (old) nodes.delete(old[0]);
      return { uri: add(dirUri, uniqueName(dirUri, name, false), false, content) };
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
