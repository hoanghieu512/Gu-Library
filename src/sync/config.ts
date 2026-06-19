import { Preferences } from '@capacitor/preferences';
import { stGet } from './client';

const KEY_API = 'st_api_key';
const KEY_MINIPC = 'st_minipc_id';
const KEY_FOLDER = 'st_folder_id';
const DEFAULT_FOLDER = 'gu-library-kho';

export interface SyncConfig {
  apiKey: string | null;
  minipcId: string | null;
  folderId: string;
}

export interface DeviceInfo { deviceID: string; name: string; }

export async function getSyncConfig(): Promise<SyncConfig> {
  const [apiKey, minipcId, folderId] = await Promise.all([
    Preferences.get({ key: KEY_API }),
    Preferences.get({ key: KEY_MINIPC }),
    Preferences.get({ key: KEY_FOLDER }),
  ]);
  return {
    apiKey: apiKey.value ?? null,
    minipcId: minipcId.value ?? null,
    folderId: folderId.value ?? DEFAULT_FOLDER,
  };
}

export async function setApiKey(value: string): Promise<void> {
  await Preferences.set({ key: KEY_API, value });
}
export async function setMinipcId(value: string): Promise<void> {
  await Preferences.set({ key: KEY_MINIPC, value });
}
export async function setFolderId(value: string): Promise<void> {
  await Preferences.set({ key: KEY_FOLDER, value });
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
