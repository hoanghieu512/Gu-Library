/* TEMP M6 spike */
import { registerPlugin } from '@capacitor/core';

export interface ShareTargetPlugin {
  getSharedFile(): Promise<{ uri: string | null; name: string | null }>;
}

export const ShareTarget = registerPlugin<ShareTargetPlugin>('ShareTarget');
