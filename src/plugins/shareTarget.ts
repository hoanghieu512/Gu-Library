import { registerPlugin } from '@capacitor/core';

export interface SharedFile {
  uri: string;
  name: string;
}

export interface ShareTargetPlugin {
  // Trả danh sách file đang chờ từ lần share gần nhất (đọc xong native tự clear).
  getSharedFiles(): Promise<{ files: SharedFile[] }>;
}

export const ShareTarget = registerPlugin<ShareTargetPlugin>('ShareTarget');
