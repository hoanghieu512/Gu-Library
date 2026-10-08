// Runs before every e2e run: fail fast, in Vietnamese, when the run could only fail for setup reasons.
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { APP_ID, DEFAULT_MODEL, parseAdbDevices, parseVersionName, preflightErrors } from '../lib/preflight.ts';

const adb = process.env.ANDROID_HOME ? join(process.env.ANDROID_HOME, 'platform-tools', 'adb') : 'adb';
// null = adb itself could not be run (ENOENT); '' = adb ran and failed.
const run = (args: string[]): string | null => {
  try {
    return execFileSync(adb, args, { encoding: 'utf8' });
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'ENOENT' ? null : '';
  }
};

const deviceName = process.env.E2E_DEVICE ?? 'UBS1';
const listed = run(['devices', '-l']);
const devices = listed === null ? null : parseAdbDevices(listed);
const device = devices?.find((d) => d.model === deviceName && d.state === 'device');
const versionName = device ? parseVersionName(run(['-s', device.serial, 'shell', 'dumpsys', 'package', APP_ID]) ?? '') : null;

const errors = preflightErrors({ env: process.env, devices, deviceName, versionName });
if (errors.length > 0) {
  for (const e of errors) console.error(`✗ ${e}`);
  process.exit(1);
}
console.log(`✓ app v${versionName} trên ${deviceName} · model ${process.env.E2E_MODEL ?? DEFAULT_MODEL}`);
