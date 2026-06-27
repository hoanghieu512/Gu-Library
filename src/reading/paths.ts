function treeId(uri: string): string | null { const m = uri.match(/\/tree\/([^/]+)/); return m ? decodeURIComponent(m[1]) : null; }
function documentId(uri: string): string | null { const m = uri.match(/\/document\/([^/]+)/); return m ? decodeURIComponent(m[1]) : null; }

export function relPathFromUris(rootUri: string, docUri: string): string | null {
  const root = treeId(rootUri);
  const doc = documentId(docUri) ?? treeId(docUri);
  if (!root || !doc) return null;
  const prefix = root.endsWith('/') ? root : root + '/';
  if (!doc.startsWith(prefix)) return null;
  return doc.slice(prefix.length);
}
