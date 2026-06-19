import { registerPlugin } from '@capacitor/core';

export interface SyncthingPlugin {
  request(options: { url: string; apiKey: string }): Promise<{ status: number; data: string }>;
}

export const Syncthing = registerPlugin<SyncthingPlugin>('Syncthing');
