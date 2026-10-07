// `npm run explore -- "<đề bài>"`: one read-only exploration with the `explorer` agent, fenced by a
// fingerprint of the QA kho before and after. A changed kho is a read-only violation (exit 4).
import { execFileSync, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { diffListing, hashListing, parseFindListing } from '../lib/fingerprint.ts';
import { parseAdbDevices } from '../lib/preflight.ts';

const adb = process.env.ANDROID_HOME ? join(process.env.ANDROID_HOME, 'platform-tools', 'adb') : 'adb';
const kho = process.env.E2E_KHO ?? '/sdcard/Download/kho';
const deviceName = process.env.E2E_DEVICE ?? 'UBS1';

const charter = process.argv.slice(2).join(' ').trim();
if (!charter) {
  console.error('Cách dùng: npm --prefix e2e run explore -- "<đề bài>"');
  process.exit(2);
}

const serial = parseAdbDevices(execFileSync(adb, ['devices', '-l'], { encoding: 'utf8' }))
  .find((d) => d.model === deviceName && d.state === 'device')?.serial;
if (!serial) {
  console.error(`✗ Không thấy máy "${deviceName}" trong adb devices.`);
  process.exit(1);
}

/** Throws rather than return an empty listing: two empty listings would hash equal and hide a change. */
function listing(): Map<string, number> {
  const out = execFileSync(adb, ['-s', serial!, 'shell', `cd '${kho}' && find . -type f -exec stat -c '%s %n' {} +`], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  const files = parseFindListing(out);
  if (files.size === 0) throw new Error(`kho ${kho} trên ${deviceName} không có file nào — sai E2E_KHO?`);
  return files;
}

const before = listing();
const hash = hashListing(before);
console.log(`kho ${kho}: ${before.size} file · ${hash.slice(0, 12)}`);

const run = spawnSync(
  'e2e',
  ['explore', '--agent', 'explorer', '--max-steps', '8', '--reporter', 'list,markdown', charter],
  { stdio: 'inherit', env: { ...process.env, E2E_TELEMETRY_DISABLED: '1' } },
);

const after = listing();
if (hashListing(after) !== hash) {
  const d = diffListing(before, after);
  console.error('VI PHẠM CHỈ-ĐỌC — kho đổi trong lúc khám phá:');
  for (const p of d.added) console.error(`  + ${p}`);
  for (const p of d.removed) console.error(`  - ${p}`);
  for (const p of d.resized) console.error(`  ~ ${p}`);
  process.exit(4);
}
console.log(`kho không đổi ✓ (${after.size} file)`);
process.exit(run.status ?? 1);
