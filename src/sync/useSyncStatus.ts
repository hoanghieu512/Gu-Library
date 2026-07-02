import { useEffect, useRef, useState, useCallback } from 'react';
import { stGet } from './client';
import { getSyncConfig } from './config';
import { deriveLight, type SyncLight, type ConnectionsResp, type CompletionResp } from './status';

const POLL_MS = 10000;

export type SyncState = SyncLight | 'unconfigured';

export function useSyncStatus(): { light: SyncState; refresh: () => void } {
  const [light, setLight] = useState<SyncState>('unconfigured');
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const tick = useCallback(async () => {
    const cfg = await getSyncConfig();
    if (!cfg.apiKey || !cfg.minipcId) { setLight('unconfigured'); return; }
    let connections: ConnectionsResp | null = null;
    let completion: CompletionResp | null = null;
    try { connections = await stGet<ConnectionsResp>('/rest/system/connections', cfg.apiKey); } catch { connections = null; }
    try {
      // Chỉ theo device (Syncthing gộp tiến độ mọi folder share với mini PC) — KHÔNG hardcode folder-ID môi trường.
      completion = await stGet<CompletionResp>(
        `/rest/db/completion?device=${encodeURIComponent(cfg.minipcId)}`,
        cfg.apiKey,
      );
    } catch { completion = null; }
    setLight(deriveLight({ connections, completion, minipcId: cfg.minipcId }));
  }, []);

  useEffect(() => {
    tick();
    timer.current = setInterval(tick, POLL_MS);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [tick]);

  return { light, refresh: tick };
}
