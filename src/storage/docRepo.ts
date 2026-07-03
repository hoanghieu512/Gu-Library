import { Saf } from '../plugins/saf';
import { getRootUri } from './repo';
import { relPathFromUris } from '../reading/paths';
import { parseDisplayName } from './displayName';
import { emitKhoChanged } from '../lib/khoEvents';
import { clusterSuffixes, uniqueBase } from './docCluster';

const isBinary = (suffix: string) => suffix.toLowerCase() === '.pdf';

// Các entry (name,uri,suffix) cùng cụm của tài liệu base trong folderUri.
async function clusterEntries(folderUri: string, base: string): Promise<{ name: string; uri: string; suffix: string }[]> {
  const { entries } = await Saf.listFolder({ uri: folderUri });
  const names = entries.filter((e) => !e.isDirectory).map((e) => e.name);
  const suffixes = new Set(clusterSuffixes(base, names));
  return entries
    .filter((e) => !e.isDirectory && e.name.startsWith(base + '.') && suffixes.has(e.name.slice(base.length)))
    .map((e) => ({ name: e.name, uri: e.uri, suffix: e.name.slice(base.length) }));
}

// Đặt tên hiển thị (override). name rỗng → xoá companion (về tên file mặc định).
export async function setDisplayName(folderUri: string, base: string, name: string): Promise<void> {
  const trimmed = name.trim();
  const { entries } = await Saf.listFolder({ uri: folderUri });
  const existing = entries.find((e) => !e.isDirectory && e.name === `${base}.display.json`);
  if (trimmed) {
    await Saf.writeFile({ dirUri: folderUri, name: `${base}.display.json`, content: JSON.stringify({ name: trimmed }) });
  } else if (existing) {
    await Saf.deleteFile({ uri: existing.uri });
  }
  emitKhoChanged();
}

// Chuyển trọn cụm sang folder đích (copy+delete, dedup hợp nhất). Trả base MỚI ở đích.
export async function moveDocument(folderUri: string, base: string, destFolderUri: string): Promise<string> {
  const cluster = await clusterEntries(folderUri, base);
  const { entries: destEntries } = await Saf.listFolder({ uri: destFolderUri });
  const destNames = destEntries.filter((e) => !e.isDirectory).map((e) => e.name);
  const newBase = uniqueBase(base, destNames, cluster.map((c) => c.suffix));
  // Copy trước cả cụm (tên đã unique → copyToDir không auto-dedup lệch từng file).
  for (const f of cluster) {
    const newName = newBase + f.suffix;
    if (isBinary(f.suffix)) {
      await Saf.copyToDir({ srcUri: f.uri, dirUri: destFolderUri, name: newName }); // stream, mime pdf — an toàn bộ nhớ + .tmp
    } else {
      const { data } = await Saf.readFile({ uri: f.uri });
      await Saf.writeFile({ dirUri: destFolderUri, name: newName, content: data }); // json text — tránh octet-mime .tmp
    }
  }
  for (const f of cluster) await Saf.deleteFile({ uri: f.uri }); // xoá gốc SAU khi copy xong cả cụm
  emitKhoChanged();
  return newBase;
}

// Tên hiển thị (.display.json) của tài liệu theo pdf-URI; null nếu không có (caller dùng tên file).
export async function resolveDocDisplayName(docUri: string): Promise<string | null> {
  const root = await getRootUri(); if (!root) return null;
  const rel = relPathFromUris(root, docUri); if (!rel) return null;
  const segs = rel.split('/').filter(Boolean);
  const fileSeg = segs.pop(); if (!fileSeg) return null;
  const base = fileSeg.replace(/\.[^.]+$/, '');
  let cur = root;
  for (const s of segs) {
    const { entries } = await Saf.listFolder({ uri: cur });
    const h = entries.find((e) => e.isDirectory && e.name === s);
    if (!h) return null;
    cur = h.uri;
  }
  const { entries } = await Saf.listFolder({ uri: cur });
  const d = entries.find((e) => !e.isDirectory && e.name === `${base}.display.json`);
  if (!d) return null;
  try { const { data } = await Saf.readFile({ uri: d.uri }); return parseDisplayName(data); } catch { return null; }
}

// Xoá trọn cụm (pdf + sidecar + mọi companion).
export async function deleteDocument(folderUri: string, base: string): Promise<void> {
  const cluster = await clusterEntries(folderUri, base);
  for (const f of cluster) await Saf.deleteFile({ uri: f.uri });
  emitKhoChanged();
}
