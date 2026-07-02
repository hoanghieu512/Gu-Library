export type SyncLight = 'synced' | 'syncing' | 'offline';

export interface ConnectionEntry {
  connected: boolean;
  paused: boolean;
}
export interface ConnectionsResp {
  connections: Record<string, ConnectionEntry>;
  total: { inBytesTotal: number; outBytesTotal: number };
}
export interface CompletionResp {
  completion: number;
  needBytes: number;
  needItems: number;
  needDeletes: number;
  remoteState?: string;
}

export function deriveLight(args: {
  connections: ConnectionsResp | null;
  completion: CompletionResp | null;
  minipcId: string;
}): SyncLight {
  const { connections, completion, minipcId } = args;
  const entry = connections?.connections?.[minipcId];
  // "Thấy mini PC" = thiết bị connected. offline ("chưa thấy") CHỈ khi thật sự không connected.
  if (!entry || entry.connected !== true) return 'offline';
  // Connected nhưng chưa biết tiến độ (completion lỗi/không có) → vẫn THẤY mini PC → không báo offline sai.
  if (!completion) return 'synced';
  const done = completion.completion >= 100 && completion.needBytes === 0 && completion.needItems === 0;
  return done ? 'synced' : 'syncing';
}
