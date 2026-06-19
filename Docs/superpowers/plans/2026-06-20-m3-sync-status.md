# M3 — Sync status reader (đèn trạng thái) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App đọc REST API của Syncthing **v2** chạy trên chính máy đó (localhost) và hiện 1 trong 3 trạng thái ở góc phải header: ✓ đã đẩy hết lên mini PC / ⟳ đang đẩy / ⚠ chưa thấy mini PC. Người dùng nhập API key một lần + chọn "đâu là mini PC" trong Settings.

**Architecture:** Một **custom Capacitor Android plugin `Syncthing`** (Java) làm cầu HTTP native tới `https://127.0.0.1:8384` — vì GUI Syncthing v2 chạy **HTTPS với cert tự ký** (đã soi instance thật), `CapacitorHttp`/`fetch` không tin được cert này; plugin tự dùng `TrustManager` chấp nhận self-signed **chỉ cho localhost**. Trên TS: một **logic suy đèn thuần** (connections + completion → 3 trạng thái) tách khỏi I/O nên unit-test được bằng JSON v2 thật làm fixture; một **client** gọi REST; một **hook poll ~10s**; **Settings tối thiểu** (nhập key + chọn mini PC, lưu Preferences); và **đèn ở header hiện tại** (App.tsx) — KHÔNG dựng Settings/Home thật của M4.

**Tech Stack:** Capacitor 8 custom plugin (`HttpsURLConnection` + permissive `TrustManager` localhost-only) · `@capacitor/preferences` (đã có) · React + Ionic (đã có) · Vitest (đã có).

**Phạm vi:** CHỈ M3. **KHÔNG** dựng Home lai / bottom-nav / trang Settings đầy đủ (M4) — M3 chỉ gắn đèn vào header IonToolbar sẵn có và một Settings *tối thiểu* (modal) đủ nhập key + chọn mini PC. **KHÔNG** ghi gì vào Syncthing (chỉ GET, read-only). **KHÔNG** dùng event API của Syncthing (poll ~10s là đủ cho MVP — spec 3.2). Không đụng storage/SAF (M2 đã xong) ngoài việc dùng chung App shell.

**Tiền đề (việc tay, ngoài app — phải xong trước nghiệm thu):** Syncthing-Fork trên điện thoại dev + Syncthing service trên mini PC, ghép cặp + share folder `gu-library-kho` (xem `Docs/gu-library-syncthing-setup.md`). Đã xác nhận: dev phone ↔ mini PC **Connected**, folder `gu-library-kho` sync.

---

## v2 REST API reference — ĐÃ SOI INSTANCE THẬT (2026-06-20, KHÔNG theo doc v1)

Soi qua tunnel `adb forward` tới Syncthing-Fork **v2.0.11** trên điện thoại dev (mini PC "HieuAtomMan" chạy v2.1.1). Field thực tế:

- **Transport:** `gui.address = "127.0.0.1:8384"`, **`gui.useTLS = true`** → phải gọi `https://127.0.0.1:8384`, cert **tự ký** (HTTP bị 307 redirect sang HTTPS). Mọi `/rest/*` (trừ `/rest/noauth/*`) cần header **`X-API-Key`** (thiếu → 403).

- **`GET /rest/system/version`** → `{ "version": "v2.0.11", "os": "android", "arch": "arm64", "longVersion": "...", ... }`. Dùng để "connection check" trong Settings.

- **`GET /rest/system/status`** → có `"myID": "<deviceID của máy này>"` (+ nhiều field khác). Dùng để loại máy mình ra khi liệt kê "mini PC".

- **`GET /rest/system/connections`** →
  ```json
  {
    "connections": {
      "<deviceID>": {
        "connected": true,
        "paused": false,
        "clientVersion": "v2.1.1",
        "address": "192.168.1.17:22000",
        "type": "tcp-server",
        "isLocal": true,
        "primary": { ... },          // v2 mới: multipath — BỎ QUA
        "secondary": [ ... ]          // v2 mới: BỎ QUA
      }
    },
    "total": { ... }
  }
  ```
  **"Thấy mini PC" = `connections[<minipcID>].connected === true`.**

- **`GET /rest/config`** →
  - `.devices[]` = `[{ "deviceID": "...", "name": "HieuAtomMan", "paused": false }, ...]` → danh sách để chọn mini PC (loại bỏ `myID`).
  - `.folders[]` = `[{ "id": "gu-library-kho", "label": "Kho", "path": "...", "type": "sendreceive", "paused": false, "devices": [...] }]`.

- **`GET /rest/db/completion?folder=gu-library-kho&device=<minipcID>`** →
  ```json
  { "completion": 100, "globalBytes": 7673513, "globalItems": 4,
    "needBytes": 0, "needItems": 0, "needDeletes": 0,
    "remoteState": "valid", "sequence": 12 }
  ```
  **"Đã đẩy hết lên mini PC" = `completion >= 100 && needBytes === 0 && needItems === 0`.** (`completion` là number 0–100, KHÔNG phải object. `remoteState` = "valid" khi biết device, "unknown" ở dạng aggregate.)

- **`GET /rest/db/status?folder=gu-library-kho`** (tham khảo) → `{ "state": "idle"|"syncing"|"scanning", "needBytes", "needTotalItems", "inSyncFiles", ... }`. M3 KHÔNG cần (dùng completion theo spec), nhưng đây là field thật nếu cần state cục bộ sau này.

> **Ba quyết định v2 ảnh hưởng plan (khác v1):** (1) HTTPS self-signed → native plugin trust localhost, không CapacitorHttp; (2) `completion` là number trực tiếp; (3) connections có `primary`/`secondary` — chỉ đọc `connected` ở cấp trên cùng.

---

## File Structure (M3 tạo/sửa)

- `android/app/src/main/java/com/gulibrary/app/SyncthingPlugin.java` — **tạo**: HTTP native tới localhost, trust self-signed.
- `android/app/src/main/java/com/gulibrary/app/MainActivity.java` — **sửa**: đăng ký thêm plugin.
- `src/plugins/syncthing.ts` — **tạo**: bridge TS.
- `src/sync/client.ts` — **tạo**: wrapper GET REST (base url + parse + lỗi).
- `src/sync/status.ts` — **tạo**: logic thuần suy 3 trạng thái đèn.
- `src/sync/status.test.ts` — **tạo**: unit test bằng JSON v2 thật.
- `src/sync/config.ts` — **tạo**: settings (đọc/ghi Preferences) + liệt kê devices.
- `src/sync/useSyncStatus.ts` — **tạo**: hook poll ~10s.
- `src/sync/SyncLight.tsx` — **tạo**: chấm đèn ở header.
- `src/sync/SyncSettings.tsx` — **tạo**: modal Settings tối thiểu (key + chọn mini PC + connection check).
- `src/App.tsx` — **sửa**: gắn `<SyncLight/>` vào header + nút mở Settings.

**Preferences keys:** `st_api_key`, `st_minipc_id`, `st_folder_id` (default `gu-library-kho`).

---

## Phase A — Native Syncthing HTTP bridge

### Task A1: Plugin `Syncthing` (Java)

**Files:**
- Create: `android/app/src/main/java/com/gulibrary/app/SyncthingPlugin.java`
- Modify: `android/app/src/main/java/com/gulibrary/app/MainActivity.java`

- [ ] **Step 1: Tạo SyncthingPlugin.java**

```java
package com.gulibrary.app;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;

import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

// Cầu HTTP native tới Syncthing trên localhost. Syncthing v2 GUI chạy HTTPS
// self-signed nên ở đây chấp nhận cert tự ký — NHƯNG chỉ cho host localhost
// (127.0.0.1/localhost), không dùng cho host khác.
@CapacitorPlugin(name = "Syncthing")
public class SyncthingPlugin extends Plugin {

    @PluginMethod
    public void request(PluginCall call) {
        String urlStr = call.getString("url");
        String apiKey = call.getString("apiKey", "");
        if (urlStr == null) { call.reject("url required"); return; }
        try {
            URL url = new URL(urlStr);
            String host = url.getHost();
            boolean isLocal = host.equals("127.0.0.1") || host.equalsIgnoreCase("localhost");
            if (!isLocal) { call.reject("only localhost allowed"); return; }

            HttpURLConnection conn;
            if ("https".equalsIgnoreCase(url.getProtocol())) {
                HttpsURLConnection https = (HttpsURLConnection) url.openConnection();
                https.setSSLSocketFactory(trustAllForLocalhost());
                https.setHostnameVerifier((h, s) -> h.equals("127.0.0.1") || h.equalsIgnoreCase("localhost"));
                conn = https;
            } else {
                conn = (HttpURLConnection) url.openConnection();
            }
            conn.setRequestMethod("GET");
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
            if (!apiKey.isEmpty()) conn.setRequestProperty("X-API-Key", apiKey);

            int code = conn.getResponseCode();
            InputStream is = (code >= 200 && code < 400) ? conn.getInputStream() : conn.getErrorStream();
            String body = readAll(is);

            JSObject ret = new JSObject();
            ret.put("status", code);
            ret.put("data", body);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("request failed: " + e.getMessage());
        }
    }

    private static String readAll(InputStream is) throws Exception {
        if (is == null) return "";
        try (BufferedReader r = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            StringBuilder sb = new StringBuilder();
            char[] buf = new char[4096];
            int n;
            while ((n = r.read(buf)) != -1) sb.append(buf, 0, n);
            return sb.toString();
        }
    }

    private static SSLSocketFactory trustAllForLocalhost() throws Exception {
        TrustManager[] tm = new TrustManager[]{ new X509TrustManager() {
            public void checkClientTrusted(X509Certificate[] c, String a) {}
            public void checkServerTrusted(X509Certificate[] c, String a) {}
            public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
        }};
        SSLContext ctx = SSLContext.getInstance("TLS");
        ctx.init(null, tm, new SecureRandom());
        return ctx.getSocketFactory();
    }
}
```

- [ ] **Step 2: Đăng ký plugin trong MainActivity.java**

Ghi đè `MainActivity.java` (đăng ký cả Saf cũ + Syncthing mới):

```java
package com.gulibrary.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SafPlugin.class);
        registerPlugin(SyncthingPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
```

- [ ] **Step 3: Verify biên dịch native**

Run: `bash -lc 'cd /Users/lavopavden/Dev/projects/Gu-Library/android && ./gradlew :app:compileDebugJavaWithJavac 2>&1 | tail -5'`
Expected: `BUILD SUCCESSFUL`.

- [ ] **Step 4: Commit**

```bash
cd /Users/lavopavden/Dev/projects/Gu-Library
git add -A && git commit -m "feat(m3): native Syncthing HTTP plugin (localhost self-signed TLS)"
```

### Task A2: Bridge TS + client

**Files:**
- Create: `src/plugins/syncthing.ts`
- Create: `src/sync/client.ts`

- [ ] **Step 1: Tạo src/plugins/syncthing.ts**

```ts
import { registerPlugin } from '@capacitor/core';

export interface SyncthingPlugin {
  request(options: { url: string; apiKey: string }): Promise<{ status: number; data: string }>;
}

export const Syncthing = registerPlugin<SyncthingPlugin>('Syncthing');
```

- [ ] **Step 2: Tạo src/sync/client.ts**

```ts
import { Syncthing } from '../plugins/syncthing';

const BASE = 'https://127.0.0.1:8384';

// GET một endpoint REST của Syncthing local. Ném lỗi nếu status != 200
// hoặc không gọi được (mất kết nối / Syncthing chết) — caller suy ra ⚠.
export async function stGet<T>(path: string, apiKey: string): Promise<T> {
  const { status, data } = await Syncthing.request({ url: BASE + path, apiKey });
  if (status !== 200) throw new Error(`Syncthing HTTP ${status}`);
  return JSON.parse(data) as T;
}

export { BASE as SYNCTHING_BASE };
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/lavopavden/Dev/projects/Gu-Library && npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(m3): TS bridge + REST client for Syncthing"
```

---

## Phase B — Logic suy đèn (TDD, thuần, fixture v2 thật)

### Task B1: Suy 3 trạng thái đèn

**Files:**
- Create: `src/sync/status.ts`
- Create: `src/sync/status.test.ts`

- [ ] **Step 1: Viết test thất bại trước (dùng JSON v2 thật)**

Tạo `src/sync/status.test.ts`:

```ts
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
```

- [ ] **Step 2: Chạy test → FAIL**

Run: `cd /Users/lavopavden/Dev/projects/Gu-Library && npx vitest run src/sync/status.test.ts`
Expected: FAIL (`deriveLight` chưa tồn tại).

- [ ] **Step 3: Implement**

Tạo `src/sync/status.ts`:

```ts
export type SyncLight = 'synced' | 'syncing' | 'offline';

// Shape rút gọn theo field v2 thật (chỉ field M3 dùng).
export interface ConnectionEntry {
  connected: boolean;
  paused: boolean;
}
export interface ConnectionsResp {
  connections: Record<string, ConnectionEntry>;
  total: { inBytesTotal: number; outBytesTotal: number };
}
export interface CompletionResp {
  completion: number;   // 0..100 (number trực tiếp ở v2)
  needBytes: number;
  needItems: number;
  needDeletes: number;
  remoteState?: string; // "valid" | "unknown" (v2)
}

// Suy đèn từ kết quả 2 lời gọi REST (null = gọi thất bại / mất kết nối).
//  - offline (⚠): không thấy mini PC connected, hoặc không đọc được Syncthing.
//  - syncing (⟳): thấy mini PC nhưng nó chưa nhận đủ (completion<100 hoặc còn need).
//  - synced  (✓): thấy mini PC + đã nhận đủ.
export function deriveLight(args: {
  connections: ConnectionsResp | null;
  completion: CompletionResp | null;
  minipcId: string;
}): SyncLight {
  const { connections, completion, minipcId } = args;
  const entry = connections?.connections?.[minipcId];
  if (!entry || entry.connected !== true) return 'offline';
  if (!completion) return 'offline';
  const done = completion.completion >= 100 && completion.needBytes === 0 && completion.needItems === 0;
  return done ? 'synced' : 'syncing';
}
```

- [ ] **Step 4: Chạy test → PASS**

Run: `npx vitest run src/sync/status.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Toàn bộ test + build**

Run: `cd /Users/lavopavden/Dev/projects/Gu-Library && npm test && npm run build`
Expected: tất cả PASS.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(m3): derive 3-state sync light from v2 connections+completion"
```

---

## Phase C — Settings tối thiểu (key + chọn mini PC) + connection check

### Task C1: Lưu/đọc cấu hình + liệt kê devices

**Files:**
- Create: `src/sync/config.ts`

- [ ] **Step 1: Tạo src/sync/config.ts**

```ts
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

// Liệt kê các device KHÁC máy này (ứng viên "mini PC").
// myID lấy từ /rest/system/status; danh sách từ /rest/config.
export async function listOtherDevices(apiKey: string): Promise<DeviceInfo[]> {
  const status = await stGet<{ myID: string }>('/rest/system/status', apiKey);
  const cfg = await stGet<{ devices: { deviceID: string; name: string }[] }>('/rest/config', apiKey);
  return cfg.devices
    .filter((d) => d.deviceID !== status.myID)
    .map((d) => ({ deviceID: d.deviceID, name: d.name }));
}

// Connection check: trả version string nếu key + TLS ổn (ném nếu lỗi).
export async function checkConnection(apiKey: string): Promise<string> {
  const v = await stGet<{ version: string }>('/rest/system/version', apiKey);
  return v.version;
}
```

- [ ] **Step 2: Verify build**

Run: `cd /Users/lavopavden/Dev/projects/Gu-Library && npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(m3): sync config persistence + device list + connection check"
```

### Task C2: Modal Settings tối thiểu

**Files:**
- Create: `src/sync/SyncSettings.tsx`

- [ ] **Step 1: Tạo src/sync/SyncSettings.tsx**

```tsx
import { useEffect, useState } from 'react';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonContent,
  IonItem, IonLabel, IonInput, IonList, IonRadioGroup, IonRadio, IonText, IonNote,
} from '@ionic/react';
import {
  getSyncConfig, setApiKey, setMinipcId, listOtherDevices, checkConnection,
  type DeviceInfo,
} from './config';

export default function SyncSettings({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [key, setKey] = useState('');
  const [minipc, setMinipc] = useState<string | null>(null);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [version, setVersion] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      const c = await getSyncConfig();
      setKey(c.apiKey ?? '');
      setMinipc(c.minipcId);
      setError(''); setVersion('');
    })();
  }, [isOpen]);

  const saveKeyAndLoad = async () => {
    setError(''); setVersion('');
    try {
      await setApiKey(key);
      const v = await checkConnection(key);
      setVersion(v);
      setDevices(await listOtherDevices(key));
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  };

  const pick = async (id: string) => {
    setMinipc(id);
    await setMinipcId(id);
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>Đồng bộ (Syncthing)</IonTitle>
          <IonButtons slot="end"><IonButton onClick={onClose}>Đóng</IonButton></IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <IonItem>
          <IonLabel position="stacked">API key (của Syncthing trên máy này)</IonLabel>
          <IonInput value={key} onIonInput={(e) => setKey(e.detail.value ?? '')} placeholder="dán API key" />
        </IonItem>
        <IonButton expand="block" onClick={saveKeyAndLoad}>Lưu key + kiểm tra kết nối</IonButton>

        {version && <IonText color="success"><p>Đã kết nối — Syncthing {version}</p></IonText>}
        {error && <IonText color="danger"><p>Lỗi: {error}</p></IonText>}

        {devices.length > 0 && (
          <>
            <IonNote>Chọn thiết bị nào là mini PC:</IonNote>
            <IonRadioGroup value={minipc} onIonChange={(e) => pick(e.detail.value)}>
              <IonList>
                {devices.map((d) => (
                  <IonItem key={d.deviceID}>
                    <IonLabel>{d.name}</IonLabel>
                    <IonRadio slot="end" value={d.deviceID} />
                  </IonItem>
                ))}
              </IonList>
            </IonRadioGroup>
          </>
        )}
      </IonContent>
    </IonModal>
  );
}
```

- [ ] **Step 2: Verify build + test**

Run: `cd /Users/lavopavden/Dev/projects/Gu-Library && npm test && npm run build`
Expected: smoke test vẫn pass, build PASS.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(m3): minimal sync settings modal (api key + pick mini PC)"
```

---

## Phase D — Đèn header + poll + nghiệm thu trên máy thật

### Task D1: Hook poll ~10s + component đèn

**Files:**
- Create: `src/sync/useSyncStatus.ts`
- Create: `src/sync/SyncLight.tsx`

- [ ] **Step 1: Tạo src/sync/useSyncStatus.ts**

```ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { stGet } from './client';
import { getSyncConfig } from './config';
import { deriveLight, type SyncLight, type ConnectionsResp, type CompletionResp } from './status';

const POLL_MS = 10000;

// Poll trạng thái Syncthing local mỗi ~10s; trả đèn hiện tại.
// 'unconfigured' khi chưa nhập key / chưa chọn mini PC.
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
      completion = await stGet<CompletionResp>(
        `/rest/db/completion?folder=${encodeURIComponent(cfg.folderId)}&device=${encodeURIComponent(cfg.minipcId)}`,
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
```

- [ ] **Step 2: Tạo src/sync/SyncLight.tsx**

```tsx
import { IonButton, IonIcon } from '@ionic/react';
import { checkmarkCircle, syncCircle, warningOutline, settingsOutline } from 'ionicons/icons';
import type { SyncState } from './useSyncStatus';

const MAP: Record<SyncState, { icon: string; color: string; label: string }> = {
  synced: { icon: checkmarkCircle, color: 'success', label: 'Đã đồng bộ' },
  syncing: { icon: syncCircle, color: 'warning', label: 'Đang đẩy…' },
  offline: { icon: warningOutline, color: 'danger', label: 'Chưa thấy mini PC' },
  unconfigured: { icon: settingsOutline, color: 'medium', label: 'Chưa cấu hình' },
};

export default function SyncLight({ state, onClick }: { state: SyncState; onClick: () => void }) {
  const m = MAP[state];
  return (
    <IonButton color={m.color} onClick={onClick} title={m.label} aria-label={m.label}>
      <IonIcon slot="icon-only" icon={m.icon} />
    </IonButton>
  );
}
```

- [ ] **Step 3: Verify build**

Run: `cd /Users/lavopavden/Dev/projects/Gu-Library && npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "feat(m3): 10s poll hook + header sync light component"
```

### Task D2: Gắn đèn + Settings vào App header

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Sửa src/App.tsx**

Gắn đèn vào `IonToolbar` (slot end) và mở `SyncSettings` khi bấm. Giữ nguyên `<IonTitle>Gú's Library</IonTitle>` (smoke test phụ thuộc) và `<SafPoc/>` (M2). Ví dụ cấu trúc:

```tsx
import { useState } from 'react';
import {
  IonApp, IonHeader, IonToolbar, IonTitle, IonContent, IonPage, IonButtons, setupIonicReact,
} from '@ionic/react';
import SafPoc from './poc/SafPoc';
import SyncSettings from './sync/SyncSettings';
import SyncLight from './sync/SyncLight';
import { useSyncStatus } from './sync/useSyncStatus';

/* Ionic core + theming CSS */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

setupIonicReact();

export default function App() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { light, refresh } = useSyncStatus();
  return (
    <IonApp>
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonTitle>Gú's Library</IonTitle>
            <IonButtons slot="end">
              <SyncLight state={light} onClick={() => setSettingsOpen(true)} />
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding">
          <p>Kho tài liệu học luật — M1 khung rỗng.</p>
          <SafPoc />
        </IonContent>
        <SyncSettings isOpen={settingsOpen} onClose={() => { setSettingsOpen(false); refresh(); }} />
      </IonPage>
    </IonApp>
  );
}
```

- [ ] **Step 2: Verify test + build**

Run: `cd /Users/lavopavden/Dev/projects/Gu-Library && npm test && npm run build`
Expected: smoke test "renders the app title" vẫn PASS; build PASS.
(Lưu ý: `useSyncStatus` chạy `setInterval` + gọi plugin trong jsdom — bọc trong try/catch và `getSyncConfig` trả 'unconfigured' khi chưa có key nên không vỡ test. Nếu test treo vì timer, đặt poll qua `setInterval` là đủ; Vitest tự kết thúc. Nếu thật sự lỗi, report — KHÔNG xoá smoke test.)

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(m3): wire sync light + settings into app header"
```

### Task D3: Build + cài + NGHIỆM THU trên máy thật

**Files:** không có; thao tác trên thiết bị.

- [ ] **Step 1: Build + sync + install**

```bash
bash -lc '
cd /Users/lavopavden/Dev/projects/Gu-Library
npm run build && npx cap sync android
cd android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
'
```
Expected: `BUILD SUCCESSFUL` + `Success`.

- [ ] **Step 2: Cấu hình trong app (thao tác tay)**

Trên điện thoại dev: mở app → bấm đèn (góc phải, đang "Chưa cấu hình") → modal Settings → dán **API key của Syncthing-Fork trên điện thoại này** → "Lưu key + kiểm tra kết nối" → thấy "Đã kết nối — Syncthing v2.0.x" → trong danh sách device chọn **mini PC ("HieuAtomMan")** → Đóng.

> ✅ **Cổng kết nối:** "Đã kết nối — Syncthing vX" xác nhận native plugin qua được HTTPS self-signed + key đúng. Nếu báo lỗi SSL/HTTP → dừng, kiểm tra plugin TLS trước khi test 3 trạng thái.

- [ ] **Step 3: NGHIỆM THU 3 trạng thái (đối chiếu build brief)**

1. **✓ synced:** ở trạng thái ổn định (đã sync xong, mini PC bật + cùng WiFi) → đèn xanh ✓ "Đã đồng bộ".
2. **⟳ syncing:** bỏ một file đủ lớn vào folder `kho` **trên điện thoại** (để nó đang đẩy lên mini PC) HOẶC vào `kho` trên mini PC (đang kéo về) → trong ~10s đèn chuyển ⟳ "Đang đẩy…", rồi về ✓ khi xong.
3. **⚠ offline:** tắt Syncthing trên mini PC (hoặc tắt WiFi điện thoại) → trong ~10s đèn chuyển ⚠ "Chưa thấy mini PC"; bật lại → về ✓.

✅ **M3 ĐẠT** khi cả "cổng kết nối" + 3 trạng thái đúng.

- [ ] **Step 4: Commit chốt M3**

```bash
cd /Users/lavopavden/Dev/projects/Gu-Library
git add -A && git commit -m "feat(m3): sync status light verified on device (3 states)"
```

---

## Nghiệm thu M3 (đối chiếu build brief)

- [ ] Nhập API key + chọn mini PC trong Settings → app đọc được trạng thái Syncthing local. → Task C2 + D2 + D3 Step 2.
- [ ] Còn file đang truyền lên mini PC → hiện ⟳. → D3 Step 3.2.
- [ ] Hết file chờ + thấy mini PC → hiện ✓. → D3 Step 3.1.
- [ ] Ngắt mạng / mini PC tắt → hiện ⚠. → D3 Step 3.3.

## Self-review notes (đối chiếu spec + field v2 thật)

- **Spec 3.2 "đọc localhost, không fetch, né CORS/mixed-content":** dùng native plugin HTTP (không fetch/WebView). Cải tiến so với "CapacitorHttp" vì soi thật thấy **HTTPS self-signed** → CapacitorHttp không tin cert; native plugin trust localhost-only đạt cùng mục tiêu (native, no CORS). ✓
- **Spec 3.2 "API key nhập tay, lưu Preferences":** Task C1/C2. ✓
- **Spec 3.2 "chọn mini PC từ danh sách devices":** `listOtherDevices` (config.devices trừ myID) + radio. ✓
- **Spec 3.2 map điều kiện:** "thấy mini PC" = `connections[minipc].connected` (field v2 thật); "đã đẩy hết" = `completion>=100 && needBytes==0 && needItems==0` (field v2 thật, `completion` là number). ✓
- **Spec 3.2 poll ~10s, không event API:** `useSyncStatus` interval 10s. ✓
- **Spec "không nút Sync now":** đèn chỉ hiển thị + mở Settings, không có lệnh sync. ✓
- **3 trạng thái = đúng bảng spec** (✓/⟳/⚠) + 'unconfigured' phụ khi chưa nhập key (không nằm trong 3 trạng thái chính nhưng cần cho lần đầu). ✓
- **Field v2 đã soi thật (không theo v1):** xem mục "v2 REST API reference". `completion` number, `connections[].connected`, `config.devices[].deviceID/name`, `status.myID`, HTTPS useTLS self-signed — tất cả từ instance v2.0.11/2.1.1 đang chạy. ✓
- **Phạm vi không lấn M4:** đèn gắn vào header App.tsx hiện có + Settings là modal tối thiểu, KHÔNG dựng Home/bottom-nav/Settings page đầy đủ. ✓
- **TDD:** logic `deriveLight` có vòng đỏ→xanh với fixture v2 thật; phần native/UI/poll là cổng verify trên thiết bị. ✓

## Điểm cần người dùng thao tác tay
- D3 Step 2: nhập API key (của Syncthing trên điện thoại dev) + chọn mini PC.
- D3 Step 3: tạo file để thấy ⟳; tắt mini PC/WiFi để thấy ⚠.
(Tiền đề Syncthing setup theo `gu-library-syncthing-setup.md` phải xong trước.)
