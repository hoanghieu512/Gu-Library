import { test } from 'node:test';
import { deepEqual, equal, match } from 'node:assert/strict';
import { parseAdbDevices, parseVersionName, preflightErrors } from '../lib/preflight.ts';

const UBS1 = { serial: 's', model: 'UBS1', state: 'device' };

test('parseAdbDevices reads model from -l output', () =>
  deepEqual(parseAdbDevices('List of devices attached\nUBS1240902002011       device usb:20-2 product:Universal_Phone_1 model:UBS1 device:Universal_Phone_1 transport_id:6\n\n'),
    [{ serial: 'UBS1240902002011', model: 'UBS1', state: 'device' }]));

test('parseVersionName', () => equal(parseVersionName('    versionCode=2 minSdk=24\n    versionName=1.41.0\n'), '1.41.0'));

test('missing key → message naming OPENROUTER_API_KEY', () =>
  match(preflightErrors({ env: {}, devices: [UBS1], deviceName: 'UBS1', versionName: '1.41.0' }).join('\n'), /OPENROUTER_API_KEY/));

test('device not plugged → message naming the device', () =>
  match(preflightErrors({ env: { OPENROUTER_API_KEY: 'x' }, devices: [], deviceName: 'UBS1', versionName: null }).join('\n'), /UBS1/));

test('app missing → message', () =>
  match(preflightErrors({ env: { OPENROUTER_API_KEY: 'x' }, devices: [UBS1], deviceName: 'UBS1', versionName: null }).join('\n'), /com\.gulibrary\.app/));

test('all good → []', () =>
  deepEqual(preflightErrors({ env: { OPENROUTER_API_KEY: 'x' }, devices: [UBS1], deviceName: 'UBS1', versionName: '1.41.0' }), []));
