import { describe, it, expect } from 'vitest';
import { deriveLight } from './status';
import type { ConnectionsResp, CompletionResp } from './status';

const MINIPC = 'KTW2JAW-SNGRD2W-6CR6Q35-ECTMGBC-ZBKJMO5-W5ZPC22-IISBMJK-3YALHQU';

const connConnected: ConnectionsResp = {
  connections: { [MINIPC]: { connected: true, paused: false } },
  total: { inBytesTotal: 0, outBytesTotal: 0 },
} as ConnectionsResp;

const connDisconnected: ConnectionsResp = {
  connections: { [MINIPC]: { connected: false, paused: false } },
  total: { inBytesTotal: 0, outBytesTotal: 0 },
} as ConnectionsResp;

const done: CompletionResp = { completion: 100, needBytes: 0, needItems: 0, needDeletes: 0, remoteState: 'valid' } as CompletionResp;
const pushing: CompletionResp = { completion: 42, needBytes: 1234, needItems: 3, needDeletes: 0, remoteState: 'valid' } as CompletionResp;

describe('deriveLight', () => {
  it('synced: connected + completion 100 + nothing needed', () => {
    expect(deriveLight({ connections: connConnected, completion: done, minipcId: MINIPC })).toBe('synced');
  });
  it('syncing: connected but completion < 100', () => {
    expect(deriveLight({ connections: connConnected, completion: pushing, minipcId: MINIPC })).toBe('syncing');
  });
  it('syncing: connected, completion 100 but needBytes > 0 (edge)', () => {
    const edge = { ...done, needBytes: 50 };
    expect(deriveLight({ connections: connConnected, completion: edge, minipcId: MINIPC })).toBe('syncing');
  });
  it('offline: mini PC not connected', () => {
    expect(deriveLight({ connections: connDisconnected, completion: done, minipcId: MINIPC })).toBe('offline');
  });
  it('offline: mini PC absent from connections map', () => {
    expect(deriveLight({ connections: { connections: {} } as ConnectionsResp, completion: done, minipcId: MINIPC })).toBe('offline');
  });
  it('offline: connections fetch failed (null)', () => {
    expect(deriveLight({ connections: null, completion: done, minipcId: MINIPC })).toBe('offline');
  });
  it('offline: completion fetch failed (null) even if connected', () => {
    expect(deriveLight({ connections: connConnected, completion: null, minipcId: MINIPC })).toBe('offline');
  });
});
