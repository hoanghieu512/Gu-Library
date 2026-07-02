import { Preferences } from '@capacitor/preferences';
import { stGet } from './client';

const KEY_API = 'st_api_key';
const KEY_MINIPC = 'st_minipc_id';

// KHÔNG lưu/giả định folder-ID: trạng thái sync đọc theo device (gộp mọi folder share với mini PC)
// → app local-first, chạy đúng với BẤT KỲ kho nào (QA `gu-library-kho`, Prod `gu-library-kho-prod`, …).
export interface SyncConfig {
  apiKey: string | null;
  minipcId: string | null;
}

export interface DeviceInfo { deviceID: string; name: string; }

export async function getSyncConfig(): Promise<SyncConfig> {
  const [apiKey, minipcId] = await Promise.all([
    Preferences.get({ key: KEY_API }),
    Preferences.get({ key: KEY_MINIPC }),
  ]);
  return {
    apiKey: apiKey.value ?? null,
    minipcId: minipcId.value ?? null,
  };
}

export async function setApiKey(value: string): Promise<void> {
  await Preferences.set({ key: KEY_API, value });
}
export async function setMinipcId(value: string): Promise<void> {
  await Preferences.set({ key: KEY_MINIPC, value });
}

export async function listOtherDevices(apiKey: string): Promise<DeviceInfo[]> {
  const status = await stGet<{ myID: string }>('/rest/system/status', apiKey);
  const cfg = await stGet<{ devices: { deviceID: string; name: string }[] }>('/rest/config', apiKey);
  return cfg.devices
    .filter((d) => d.deviceID !== status.myID)
    .map((d) => ({ deviceID: d.deviceID, name: d.name }));
}

export async function checkConnection(apiKey: string): Promise<string> {
  const v = await stGet<{ version: string }>('/rest/system/version', apiKey);
  return v.version;
}
