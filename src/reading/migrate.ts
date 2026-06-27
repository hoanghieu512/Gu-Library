import { Preferences } from '@capacitor/preferences';
import { Saf } from '../plugins/saf';
import { getRootUri } from '../storage/repo';
import { relPathFromUris } from './paths';
import { upsertEntry, type DeviceReadingFile, type ReadingEntry } from './model';
import { getDeviceId } from './store';

const OLD_KEY = 'reading_progress';

interface OldProgress {
  docUri: string;
  name: string;
  monName: string;
  page: number;
  total: number;
  lastReadAt: number;
}

const readingFileName = (deviceId: string) => `_reading-${deviceId}.json`;

// One-time migration from Preferences-based progress to per-device SAF file.
// Idempotent: if OLD_KEY is already absent, this is a no-op.
// Best-effort: errors are swallowed; unresolvable entries are skipped.
export async function migrateOnce(): Promise<void> {
  try {
    const { value } = await Preferences.get({ key: OLD_KEY });
    if (!value) return; // already migrated or nothing to migrate

    const root = await getRootUri();
    if (!root) return; // no root yet — can't resolve paths, skip

    const old = JSON.parse(value) as Record<string, OldProgress>;
    const deviceId = await getDeviceId();

    // Load existing device file (or start fresh).
    let file: DeviceReadingFile = { deviceId, entries: {}, tombstones: {} };
    try {
      const { entries: rootEntries } = await Saf.listFolder({ uri: root });
      const existing = rootEntries.find(
        (e) => !e.isDirectory && e.name === readingFileName(deviceId)
      );
      if (existing) {
        const { data } = await Saf.readFile({ uri: existing.uri });
        const parsed = JSON.parse(data) as DeviceReadingFile;
        file = {
          deviceId,
          entries: parsed.entries ?? {},
          tombstones: parsed.tombstones ?? {},
        };
      }
    } catch { /* corrupt / missing — start fresh */ }

    for (const p of Object.values(old)) {
      try {
        const path = relPathFromUris(root, p.docUri);
        if (!path) continue; // can't derive path → skip
        // Only seed if not already tracked with a newer timestamp.
        const cur = file.entries[path];
        if (cur && cur.lastReadAt >= p.lastReadAt) continue;
        const entry: ReadingEntry = {
          path,
          name: p.name || path.split('/').pop()!.replace(/\.[^.]+$/, ''),
          monName: p.monName || path.split('/')[0],
          page: p.page,
          total: p.total,
          lastReadAt: p.lastReadAt,
        };
        file = upsertEntry(file, entry);
      } catch { /* skip this entry */ }
    }

    // Write merged file back.
    await Saf.writeFile({
      dirUri: root,
      name: readingFileName(deviceId),
      content: JSON.stringify(file),
    });

    // Mark migration done.
    await Preferences.remove({ key: OLD_KEY });
  } catch { /* best-effort: any top-level error silently ignored */ }
}
