# M2 — Storage layer & data model — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App đọc/hiểu được cấu trúc kho dạng folder ngoài sandbox (folder Syncthing ở shared storage): xin quyền SAF giữ được qua restart, liệt kê cây môn/chương độ sâu bất kỳ, đọc `_mon.json` (color/order tùy chọn), nhận diện cặp PDF+JSON là một tài liệu, và nhận ra tài liệu "chờ xử lý".

**Architecture:** Một **custom Capacitor Android plugin** (`Saf`, viết Java) bọc Storage Access Framework: `ACTION_OPEN_DOCUMENT_TREE` để người dùng chọn folder kho một lần, `takePersistableUriPermission` để giữ quyền qua đóng/mở app, `DocumentFile` để liệt kê con và đọc file. Trên TS: một **domain model thuần** (phân loại entries → môn / tài liệu / chờ xử lý) tách hẳn khỏi I/O nên unit-test được không cần thiết bị, và một **repository** nối model với plugin + `@capacitor/preferences` (nhớ URI gốc). UI M2 tối thiểu — chỉ đủ để nghiệm thu; bộ mặt thật là M4.

**Tech Stack:** Capacitor 8.4.0 (custom plugin API: `@CapacitorPlugin`, `@PluginMethod`, `@ActivityCallback`) · `androidx.documentfile:documentfile` · `@capacitor/preferences` · React + Ionic (đã có) · Vitest (đã có) cho domain model.

**Phạm vi:** CHỈ M2. **KHÔNG** ghi/sửa/xoá file (đó là M9 — chỉ ĐỌC ở M2, dù plugin có giữ luôn quyền write để M9 khỏi xin lại). KHÔNG build index search (derived, để M-search Phase 2 — chỉ chừa chỗ, không code). KHÔNG dựng UI Home thật (M4). KHÔNG mở/parse nội dung PDF (M5). Sidecar `.json` ở M2 chỉ để *nhận diện cặp*, KHÔNG parse nội dung sidecar.

**Tiền đề:** M1 đã xong — app Capacitor + Ionic + React build APK chạy trên máy thật (Samsung SM-S908E). Toolchain: JDK 21 + Android SDK 36. `android/` hiện đang bị `.gitignore` (đặt ở M1 vì thuần boilerplate) — **M2 sẽ bỏ ignore** vì giờ có code native tự viết phải version-control.

**Đã chốt từ spec (đọc kèm `Docs/gu-library-design-spec.md` mục 4, 4.1b, 4.4 + build brief M2):**
- **Tên hiển thị của môn = chính folder name** (Unicode tiếng Việt có dấu, không slug ASCII).
- **`_mon.json` chỉ ở cấp môn (cấp 1)**, chỉ giữ `color` (string) + `order` (number), **cả hai tùy chọn** — thiếu thì app dùng mặc định (màu palette + sắp alphabet).
- **Metadata phân tán**, không manifest trung tâm.
- **Điều hướng độ sâu bất kỳ** — không hardcode số tầng.
- **Tài liệu = cặp `X.pdf` + `X.json`** (cùng basename). **Chờ xử lý = chỉ có file gốc**, chưa có cặp PDF+JSON.
- **Fixture tự dựng**, KHÔNG test bằng kho thật của Gú.

---

## File Structure (M2 tạo/sửa)

- `android/app/src/main/java/com/gulibrary/app/SafPlugin.java` — **tạo**: plugin SAF (pickFolder, hasPermission, listFolder, readFile).
- `android/app/src/main/java/com/gulibrary/app/MainActivity.java` — **sửa**: đăng ký plugin.
- `android/app/build.gradle` — **sửa**: thêm dependency `androidx.documentfile`.
- `.gitignore` — **sửa**: bỏ dòng `android/`.
- `src/plugins/saf.ts` — **tạo**: bridge TS + interface plugin.
- `src/storage/types.ts` — **tạo**: kiểu dữ liệu domain (Mon, FolderEntry, Document, PendingDoc, FolderListing).
- `src/storage/classify.ts` — **tạo**: logic thuần phân loại entries (không I/O).
- `src/storage/classify.test.ts` — **tạo**: unit test cho classify + parseMon.
- `src/storage/monjson.ts` — **tạo**: parse `_mon.json` (an toàn, có default).
- `src/storage/monjson.test.ts` — **tạo**: unit test parseMon.
- `src/storage/repo.ts` — **tạo**: repository nối plugin + preferences + model.
- `src/poc/SafPoc.tsx` — **tạo**: màn PoC tối thiểu (Phase 0), gỡ/giữ tuỳ M4.
- `scripts/make-fixture.mjs` — **tạo**: sinh kho mẫu nhiều tầng để test trên thiết bị.

---

## Phase 0 — SAF PoC (SPIKE — CỔNG CHẶN)

> **Mục đích:** chứng minh trên máy thật rằng app chọn được folder kho ngoài sandbox, **giữ được quyền sau khi đóng/mở lại app**, và liệt kê + đọc được file trong đó. Nếu Phase 0 KHÔNG đạt → DỪNG, báo người dùng, không xây tiếp Phase 1-3. Đây là điều kiện tiên quyết.

### Task 0.1: Bỏ ignore `android/` và thêm dependency DocumentFile

**Files:**
- Modify: `.gitignore`
- Modify: `android/app/build.gradle`

- [ ] **Step 1: Bỏ `android/` khỏi .gitignore**

Sửa `.gitignore`, xoá đúng dòng `android/`. (Giữ `node_modules/`, `dist/`, `.DS_Store`, `*.log`.) Lý do: từ M2 có code native tự viết trong `android/`, phải được version-control; không thể tái sinh bằng `cap add` nữa.

- [ ] **Step 2: Thêm dependency DocumentFile vào android/app/build.gradle**

Trong `android/app/build.gradle`, khối `dependencies { ... }`, thêm dòng:

```gradle
    implementation "androidx.documentfile:documentfile:1.0.1"
```

- [ ] **Step 3: Verify Gradle vẫn sync được**

Run:
```bash
bash -lc 'cd /Users/lavopavden/Dev/projects/Gu-Library/android && ./gradlew :app:dependencies --configuration debugRuntimeClasspath 2>&1 | grep -i documentfile | head'
```
Expected: thấy dòng `androidx.documentfile:documentfile:1.0.1`.

- [ ] **Step 4: Commit**

```bash
cd /Users/lavopavden/Dev/projects/Gu-Library
git add -A
git commit -m "chore(m2): track android/ + add androidx.documentfile dependency"
```

### Task 0.2: Viết plugin SAF (Java)

**Files:**
- Create: `android/app/src/main/java/com/gulibrary/app/SafPlugin.java`

- [ ] **Step 1: Tạo SafPlugin.java**

Tạo file `android/app/src/main/java/com/gulibrary/app/SafPlugin.java`:

```java
package com.gulibrary.app;

import android.app.Activity;
import android.content.Intent;
import android.content.UriPermission;
import android.net.Uri;

import androidx.activity.result.ActivityResult;
import androidx.documentfile.provider.DocumentFile;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name = "Saf")
public class SafPlugin extends Plugin {

    // Mở document picker để người dùng chọn folder kho. Trả { uri }.
    @PluginMethod
    public void pickFolder(PluginCall call) {
        Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);
        intent.addFlags(
            Intent.FLAG_GRANT_READ_URI_PERMISSION
            | Intent.FLAG_GRANT_WRITE_URI_PERMISSION
            | Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION
        );
        startActivityForResult(call, intent, "folderPicked");
    }

    @ActivityCallback
    private void folderPicked(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null) {
            call.reject("cancelled");
            return;
        }
        Uri uri = result.getData().getData();
        // Giữ quyền qua restart (read + write; write để M9 khỏi xin lại).
        final int flags = Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION;
        getContext().getContentResolver().takePersistableUriPermission(uri, flags);
        JSObject ret = new JSObject();
        ret.put("uri", uri.toString());
        call.resolve(ret);
    }

    // Kiểm tra app còn quyền đọc trên URI này không (sau restart). Trả { granted }.
    @PluginMethod
    public void hasPermission(PluginCall call) {
        String uriStr = call.getString("uri");
        boolean granted = false;
        if (uriStr != null) {
            for (UriPermission p : getContext().getContentResolver().getPersistedUriPermissions()) {
                if (p.getUri().toString().equals(uriStr) && p.isReadPermission()) {
                    granted = true;
                    break;
                }
            }
        }
        JSObject ret = new JSObject();
        ret.put("granted", granted);
        call.resolve(ret);
    }

    // Liệt kê con trực tiếp của một tree/dir URI. Trả { entries: [{name,isDirectory,uri}] }.
    @PluginMethod
    public void listFolder(PluginCall call) {
        String uriStr = call.getString("uri");
        if (uriStr == null) { call.reject("uri required"); return; }
        DocumentFile dir = DocumentFile.fromTreeUri(getContext(), Uri.parse(uriStr));
        if (dir == null || !dir.isDirectory()) { call.reject("not a directory"); return; }
        JSArray entries = new JSArray();
        for (DocumentFile f : dir.listFiles()) {
            JSObject o = new JSObject();
            o.put("name", f.getName());
            o.put("isDirectory", f.isDirectory());
            o.put("uri", f.getUri().toString());
            entries.put(o);
        }
        JSObject ret = new JSObject();
        ret.put("entries", entries);
        call.resolve(ret);
    }

    // Đọc nội dung text (UTF-8) của một file URI — dùng cho _mon.json. Trả { data }.
    @PluginMethod
    public void readFile(PluginCall call) {
        String uriStr = call.getString("uri");
        if (uriStr == null) { call.reject("uri required"); return; }
        try (InputStream is = getContext().getContentResolver().openInputStream(Uri.parse(uriStr))) {
            BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            char[] buf = new char[4096];
            int n;
            while ((n = reader.read(buf)) != -1) sb.append(buf, 0, n);
            JSObject ret = new JSObject();
            ret.put("data", sb.toString());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("read failed: " + e.getMessage());
        }
    }
}
```

### Task 0.3: Đăng ký plugin trong MainActivity

**Files:**
- Modify: `android/app/src/main/java/com/gulibrary/app/MainActivity.java`

- [ ] **Step 1: Đăng ký SafPlugin**

Ghi đè `MainActivity.java`:

```java
package com.gulibrary.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(SafPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
```

- [ ] **Step 2: Verify biên dịch native**

Run:
```bash
bash -lc 'cd /Users/lavopavden/Dev/projects/Gu-Library/android && ./gradlew :app:compileDebugJavaWithJavac 2>&1 | tail -5'
```
Expected: `BUILD SUCCESSFUL` (plugin + MainActivity compile sạch).

- [ ] **Step 3: Commit**

```bash
cd /Users/lavopavden/Dev/projects/Gu-Library
git add -A
git commit -m "feat(m2): SAF Capacitor plugin (pick/list/read + persistable permission)"
```

### Task 0.4: Bridge TS cho plugin

**Files:**
- Create: `src/plugins/saf.ts`
- Modify: `package.json` (cài @capacitor/preferences)

- [ ] **Step 1: Cài @capacitor/preferences**

```bash
cd /Users/lavopavden/Dev/projects/Gu-Library
npm install @capacitor/preferences
```

- [ ] **Step 2: Tạo src/plugins/saf.ts**

```ts
import { registerPlugin } from '@capacitor/core';

export interface SafEntry {
  name: string;
  isDirectory: boolean;
  uri: string;
}

export interface SafPlugin {
  pickFolder(): Promise<{ uri: string }>;
  hasPermission(options: { uri: string }): Promise<{ granted: boolean }>;
  listFolder(options: { uri: string }): Promise<{ entries: SafEntry[] }>;
  readFile(options: { uri: string }): Promise<{ data: string }>;
}

export const Saf = registerPlugin<SafPlugin>('Saf');
```

- [ ] **Step 3: Verify type-check**

Run: `cd /Users/lavopavden/Dev/projects/Gu-Library && npm run build`
Expected: PASS (TypeScript compile sạch).

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat(m2): TS bridge for Saf plugin + @capacitor/preferences"
```

### Task 0.5: Màn PoC tối thiểu + nghiệm thu trên máy thật (CỔNG)

**Files:**
- Create: `src/poc/SafPoc.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Tạo src/poc/SafPoc.tsx**

```tsx
import { useEffect, useState } from 'react';
import { IonButton, IonList, IonItem, IonLabel, IonText } from '@ionic/react';
import { Preferences } from '@capacitor/preferences';
import { Saf, SafEntry } from '../plugins/saf';

const ROOT_KEY = 'saf_root_uri';

export default function SafPoc() {
  const [rootUri, setRootUri] = useState<string | null>(null);
  const [granted, setGranted] = useState<boolean | null>(null);
  const [entries, setEntries] = useState<SafEntry[]>([]);
  const [error, setError] = useState<string>('');

  // Khi mở app: nạp URI đã lưu, kiểm tra quyền còn không, rồi liệt kê.
  useEffect(() => {
    (async () => {
      const { value } = await Preferences.get({ key: ROOT_KEY });
      if (!value) return;
      setRootUri(value);
      try {
        const { granted } = await Saf.hasPermission({ uri: value });
        setGranted(granted);
        if (granted) {
          const { entries } = await Saf.listFolder({ uri: value });
          setEntries(entries);
        }
      } catch (e: any) {
        setError(String(e?.message ?? e));
      }
    })();
  }, []);

  const pick = async () => {
    setError('');
    try {
      const { uri } = await Saf.pickFolder();
      await Preferences.set({ key: ROOT_KEY, value: uri });
      setRootUri(uri);
      setGranted(true);
      const { entries } = await Saf.listFolder({ uri });
      setEntries(entries);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  };

  return (
    <div>
      <IonButton onClick={pick}>Chọn folder kho (SAF)</IonButton>
      <IonText><p>rootUri: {rootUri ?? '(chưa chọn)'}</p></IonText>
      <IonText><p>granted sau restart: {granted === null ? '—' : String(granted)}</p></IonText>
      {error && <IonText color="danger"><p>Lỗi: {error}</p></IonText>}
      <IonList>
        {entries.map((e) => (
          <IonItem key={e.uri}>
            <IonLabel>{e.isDirectory ? '📁 ' : '📄 '}{e.name}</IonLabel>
          </IonItem>
        ))}
      </IonList>
    </div>
  );
}
```

- [ ] **Step 2: Gắn PoC vào App.tsx (tạm thời, trong IonContent)**

Trong `src/App.tsx`, import và render `<SafPoc />` bên trong `<IonContent>` (thay cho/đặt dưới dòng `<p>...</p>` hiện có). Thêm:
```tsx
import SafPoc from './poc/SafPoc';
```
và trong `<IonContent className="ion-padding">` thêm `<SafPoc />`.

> Lưu ý cho người thực thi: KHÔNG xoá smoke test `App.test.tsx`. Nếu test "renders the app title" vẫn pass thì OK; SafPoc gọi Capacitor nên trong jsdom có thể warn — bọc gọi plugin trong try/catch (đã làm) để không vỡ render. Chạy `npm test` xác nhận vẫn 1 passed.

- [ ] **Step 3: Build + cài lên máy**

```bash
bash -lc '
cd /Users/lavopavden/Dev/projects/Gu-Library
npm run build && npx cap sync android
cd android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
'
```
Expected: `BUILD SUCCESSFUL` + `Success`.

- [ ] **Step 4: NGHIỆM THU PoC trên máy thật (thao tác tay)**

Trên điện thoại:
1. Mở app → bấm **"Chọn folder kho (SAF)"** → document picker hiện ra → chọn một folder bất kỳ có vài file con (vd `Download/`) → **Use this folder / Allow**.
2. Xác nhận: danh sách con của folder hiện ra dưới nút, `rootUri` có giá trị `content://...`.
3. **Force-close app hoàn toàn** (vuốt khỏi recent apps).
4. **Mở lại app.** Xác nhận: `granted sau restart: true` VÀ danh sách con tự hiện lại **mà KHÔNG cần chọn folder lại**.

✅ **CỔNG PoC ĐẠT** khi bước 4 cho `granted=true` + tự liệt kê lại. Nếu `granted=false` hoặc list trống sau restart → DỪNG, điều tra (thường là chưa gọi `takePersistableUriPermission` đúng, hoặc lưu/đọc Preferences sai) trước khi sang Phase 1.

- [ ] **Step 5: Commit**

```bash
cd /Users/lavopavden/Dev/projects/Gu-Library
git add -A
git commit -m "feat(m2): SAF PoC screen — folder pick + permission survives restart (verified on device)"
```

---

## Phase 1 — Domain model thuần (TDD, không I/O)

> Logic phân loại tách hẳn khỏi SAF nên test được bằng mảng entry trong bộ nhớ — nhanh, không cần thiết bị.

### Task 1.1: Kiểu dữ liệu storage

**Files:**
- Create: `src/storage/types.ts`

- [ ] **Step 1: Tạo src/storage/types.ts**

```ts
// Một entry thô từ SAF (đã có name/isDirectory/uri) — re-export cho tiện.
export type { SafEntry } from '../plugins/saf';

// Tài liệu đã xử lý = cặp PDF + JSON cùng basename.
export interface Document {
  name: string;      // basename không đuôi, vd "luat-cong-chung-2024"
  pdfUri: string;
  jsonUri: string;   // sidecar (KHÔNG parse nội dung ở M2)
}

// Tài liệu chờ xử lý = chỉ có file gốc, chưa thành cặp PDF+JSON.
export interface PendingDoc {
  name: string;      // tên file đầy đủ, vd "bai-tap.docx"
  ext: string;       // "docx" | "pptx" | "pdf" | ...
  sourceUri: string;
}

// Một folder con (Chương/Buổi/…) để điều hướng tiếp.
export interface SubFolder {
  name: string;      // = folder name (tên hiển thị)
  uri: string;
}

// Kết quả liệt kê một folder bất kỳ.
export interface FolderListing {
  folders: SubFolder[];
  documents: Document[];
  pending: PendingDoc[];
  hasPending: boolean; // tiện cho badge ⏳ (kể cả pending nằm trong folder con sẽ tính ở repo)
}

// Metadata môn từ _mon.json (cả hai field tùy chọn).
export interface MonMeta {
  color?: string;
  order?: number;
}

// Một môn (folder cấp 1).
export interface Mon {
  name: string;      // = folder name
  uri: string;
  meta: MonMeta;     // {} nếu không có _mon.json
}
```

- [ ] **Step 2: Verify type-check**

Run: `cd /Users/lavopavden/Dev/projects/Gu-Library && npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(m2): storage domain types"
```

### Task 1.2: Parse `_mon.json` an toàn (TDD)

**Files:**
- Create: `src/storage/monjson.ts`
- Create: `src/storage/monjson.test.ts`

- [ ] **Step 1: Viết test thất bại trước**

Tạo `src/storage/monjson.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseMonMeta } from './monjson';

describe('parseMonMeta', () => {
  it('reads color and order when present', () => {
    expect(parseMonMeta('{"color":"#75420E","order":2}')).toEqual({ color: '#75420E', order: 2 });
  });
  it('returns empty object for missing fields', () => {
    expect(parseMonMeta('{}')).toEqual({});
  });
  it('ignores wrong-typed fields', () => {
    expect(parseMonMeta('{"color":123,"order":"x"}')).toEqual({});
  });
  it('returns empty object on invalid JSON instead of throwing', () => {
    expect(parseMonMeta('not json')).toEqual({});
  });
  it('keeps only known fields', () => {
    expect(parseMonMeta('{"color":"#000","order":1,"junk":true}')).toEqual({ color: '#000', order: 1 });
  });
});
```

- [ ] **Step 2: Chạy test → FAIL**

Run: `cd /Users/lavopavden/Dev/projects/Gu-Library && npx vitest run src/storage/monjson.test.ts`
Expected: FAIL (`parseMonMeta` chưa tồn tại).

- [ ] **Step 3: Implement**

Tạo `src/storage/monjson.ts`:

```ts
import type { MonMeta } from './types';

// Parse nội dung _mon.json an toàn: chỉ lấy color (string) + order (number),
// bỏ qua mọi thứ khác, KHÔNG ném lỗi nếu JSON hỏng (để app vẫn chạy với default).
export function parseMonMeta(text: string): MonMeta {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return {};
  }
  if (typeof raw !== 'object' || raw === null) return {};
  const obj = raw as Record<string, unknown>;
  const meta: MonMeta = {};
  if (typeof obj.color === 'string') meta.color = obj.color;
  if (typeof obj.order === 'number') meta.order = obj.order;
  return meta;
}
```

- [ ] **Step 4: Chạy test → PASS**

Run: `npx vitest run src/storage/monjson.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(m2): safe _mon.json parser (color/order optional)"
```

### Task 1.3: Phân loại entries → tài liệu / chờ xử lý / folder (TDD)

**Files:**
- Create: `src/storage/classify.ts`
- Create: `src/storage/classify.test.ts`

- [ ] **Step 1: Viết test thất bại trước**

Tạo `src/storage/classify.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { classifyEntries } from './classify';
import type { SafEntry } from '../plugins/saf';

const e = (name: string, isDirectory: boolean): SafEntry => ({
  name, isDirectory, uri: `content://x/${encodeURIComponent(name)}`,
});

describe('classifyEntries', () => {
  it('pairs X.pdf + X.json into one processed document', () => {
    const r = classifyEntries([e('luat.pdf', false), e('luat.json', false)]);
    expect(r.documents).toHaveLength(1);
    expect(r.documents[0].name).toBe('luat');
    expect(r.documents[0].pdfUri).toContain('luat.pdf');
    expect(r.documents[0].jsonUri).toContain('luat.json');
    expect(r.pending).toHaveLength(0);
  });

  it('treats a lone source file as pending (chờ xử lý)', () => {
    const r = classifyEntries([e('bai-tap.docx', false)]);
    expect(r.pending).toHaveLength(1);
    expect(r.pending[0].name).toBe('bai-tap.docx');
    expect(r.pending[0].ext).toBe('docx');
    expect(r.documents).toHaveLength(0);
  });

  it('treats a pdf without sidecar as pending', () => {
    const r = classifyEntries([e('slide.pdf', false)]);
    expect(r.pending).toHaveLength(1);
    expect(r.pending[0].ext).toBe('pdf');
    expect(r.documents).toHaveLength(0);
  });

  it('excludes _mon.json from documents and pending', () => {
    const r = classifyEntries([e('_mon.json', false), e('luat.pdf', false), e('luat.json', false)]);
    expect(r.documents).toHaveLength(1);
    expect(r.pending).toHaveLength(0);
  });

  it('collects subfolders separately', () => {
    const r = classifyEntries([e('Chương 1', true), e('luat.pdf', false), e('luat.json', false)]);
    expect(r.folders.map((f) => f.name)).toEqual(['Chương 1']);
    expect(r.documents).toHaveLength(1);
  });

  it('sets hasPending true when any pending exists at this level', () => {
    const r = classifyEntries([e('x.docx', false)]);
    expect(r.hasPending).toBe(true);
  });

  it('hasPending false when only processed pairs', () => {
    const r = classifyEntries([e('a.pdf', false), e('a.json', false)]);
    expect(r.hasPending).toBe(false);
  });

  it('ignores hidden/system files starting with dot except _mon.json handled above', () => {
    const r = classifyEntries([e('.DS_Store', false), e('a.pdf', false), e('a.json', false)]);
    expect(r.documents).toHaveLength(1);
    expect(r.pending).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Chạy test → FAIL**

Run: `npx vitest run src/storage/classify.test.ts`
Expected: FAIL (`classifyEntries` chưa tồn tại).

- [ ] **Step 3: Implement**

Tạo `src/storage/classify.ts`:

```ts
import type { SafEntry } from '../plugins/saf';
import type { Document, PendingDoc, SubFolder, FolderListing } from './types';

const MON_JSON = '_mon.json';

function splitExt(name: string): { base: string; ext: string } {
  const i = name.lastIndexOf('.');
  if (i <= 0) return { base: name, ext: '' };
  return { base: name.slice(0, i), ext: name.slice(i + 1).toLowerCase() };
}

// Phân loại con trực tiếp của MỘT folder thành: folder con, tài liệu đã xử lý
// (cặp pdf+json), và tài liệu chờ xử lý (mọi file nội dung còn lại).
export function classifyEntries(entries: SafEntry[]): FolderListing {
  const folders: SubFolder[] = [];
  // Gom file theo basename để ghép cặp.
  const byBase = new Map<string, { pdf?: SafEntry; json?: SafEntry; others: SafEntry[] }>();

  for (const en of entries) {
    if (en.isDirectory) {
      folders.push({ name: en.name, uri: en.uri });
      continue;
    }
    const name = en.name;
    if (name === MON_JSON) continue;            // metadata môn, không phải tài liệu
    if (name.startsWith('.')) continue;          // file ẩn/hệ thống (.DS_Store…)
    const { base, ext } = splitExt(name);
    const slot = byBase.get(base) ?? { others: [] };
    if (ext === 'pdf') slot.pdf = en;
    else if (ext === 'json') slot.json = en;
    else slot.others.push(en);
    byBase.set(base, slot);
  }

  const documents: Document[] = [];
  const pending: PendingDoc[] = [];

  for (const [base, slot] of byBase) {
    if (slot.pdf && slot.json) {
      // cặp đầy đủ = tài liệu đã xử lý
      documents.push({ name: base, pdfUri: slot.pdf.uri, jsonUri: slot.json.uri });
      // file gốc còn sót cùng basename (hiếm) → coi như chờ xử lý
      for (const o of slot.others) {
        pending.push({ name: o.name, ext: splitExt(o.name).ext, sourceUri: o.uri });
      }
    } else {
      // thiếu pdf hoặc thiếu json → mọi file của basename này là chờ xử lý
      if (slot.pdf) pending.push({ name: slot.pdf.name, ext: 'pdf', sourceUri: slot.pdf.uri });
      // json mồ côi (json không có pdf): không tự là tài liệu, coi như rác/đang xử lý dở
      for (const o of slot.others) {
        pending.push({ name: o.name, ext: splitExt(o.name).ext, sourceUri: o.uri });
      }
    }
  }

  return { folders, documents, pending, hasPending: pending.length > 0 };
}
```

- [ ] **Step 4: Chạy test → PASS**

Run: `npx vitest run src/storage/classify.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Chạy toàn bộ test + build**

Run: `cd /Users/lavopavden/Dev/projects/Gu-Library && npm test && npm run build`
Expected: tất cả test PASS (smoke + monjson + classify), build PASS.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(m2): classify folder entries into documents/pending/subfolders"
```

---

## Phase 2 — Repository (nối model + SAF + Preferences)

### Task 2.1: Storage repository

**Files:**
- Create: `src/storage/repo.ts`

- [ ] **Step 1: Tạo src/storage/repo.ts**

```ts
import { Preferences } from '@capacitor/preferences';
import { Saf } from '../plugins/saf';
import { classifyEntries } from './classify';
import { parseMonMeta } from './monjson';
import type { FolderListing, Mon, MonMeta } from './types';

const ROOT_KEY = 'saf_root_uri';

// Lấy URI gốc kho đã lưu (null nếu chưa chọn).
export async function getRootUri(): Promise<string | null> {
  const { value } = await Preferences.get({ key: ROOT_KEY });
  return value ?? null;
}

// Người dùng chọn folder kho; lưu lại URI; trả URI.
export async function pickAndSaveRoot(): Promise<string> {
  const { uri } = await Saf.pickFolder();
  await Preferences.set({ key: ROOT_KEY, value: uri });
  return uri;
}

// Kho gốc còn quyền truy cập không (sau restart)?
export async function rootHasPermission(): Promise<boolean> {
  const uri = await getRootUri();
  if (!uri) return false;
  const { granted } = await Saf.hasPermission({ uri });
  return granted;
}

// Liệt kê + phân loại con trực tiếp của một folder bất kỳ (độ sâu bất kỳ:
// gọi lại hàm này với uri của folder con để đi sâu hơn — không hardcode tầng).
export async function listFolder(uri: string): Promise<FolderListing> {
  const { entries } = await Saf.listFolder({ uri });
  return classifyEntries(entries);
}

// Đọc _mon.json của một folder môn (cấp 1). Trả {} nếu không có/không đọc được.
async function readMonMeta(monUri: string, entries: { name: string; uri: string; isDirectory: boolean }[]): Promise<MonMeta> {
  const monFile = entries.find((e) => !e.isDirectory && e.name === '_mon.json');
  if (!monFile) return {};
  try {
    const { data } = await Saf.readFile({ uri: monFile.uri });
    return parseMonMeta(data);
  } catch {
    return {};
  }
}

// Liệt kê các MÔN (folder cấp 1 dưới gốc kho), kèm metadata, đã sắp xếp.
// Bỏ qua các folder hệ thống _inbox/_print.
export async function listMon(): Promise<Mon[]> {
  const root = await getRootUri();
  if (!root) return [];
  const { entries } = await Saf.listFolder({ uri: root });
  const monDirs = entries.filter(
    (e) => e.isDirectory && e.name !== '_inbox' && e.name !== '_print'
  );
  const mons: Mon[] = [];
  for (const d of monDirs) {
    const { entries: children } = await Saf.listFolder({ uri: d.uri });
    const meta = await readMonMeta(d.uri, children);
    mons.push({ name: d.name, uri: d.uri, meta });
  }
  // Sắp xếp: order tăng dần trước (nếu có), rồi alphabet theo locale VN.
  mons.sort((a, b) => {
    const ao = a.meta.order;
    const bo = b.meta.order;
    if (ao !== undefined && bo !== undefined && ao !== bo) return ao - bo;
    if (ao !== undefined && bo === undefined) return -1;
    if (ao === undefined && bo !== undefined) return 1;
    return a.name.localeCompare(b.name, 'vi');
  });
  return mons;
}
```

- [ ] **Step 2: Verify build (type-check)**

Run: `cd /Users/lavopavden/Dev/projects/Gu-Library && npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(m2): storage repository (root persistence, listMon, listFolder, _mon.json)"
```

---

## Phase 3 — Fixture kho mẫu + nghiệm thu trên thiết bị

### Task 3.1: Script sinh kho mẫu nhiều tầng

**Files:**
- Create: `scripts/make-fixture.mjs`

- [ ] **Step 1: Tạo scripts/make-fixture.mjs**

```js
// Sinh kho mẫu nhiều tầng để test M2. KHÔNG dùng kho thật của Gú.
// Chạy: node scripts/make-fixture.mjs ./fixture-kho
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2] ?? './fixture-kho';
rmSync(root, { recursive: true, force: true });

const dir = (...p) => { const d = join(root, ...p); mkdirSync(d, { recursive: true }); return d; };
const pdf = (d, base) => writeFileSync(join(d, base + '.pdf'), '%PDF-1.4\n% fixture\n');
const json = (d, base) => writeFileSync(join(d, base + '.json'),
  JSON.stringify({ name: base, pages: [], structure: [] }, null, 2)); // sidecar rỗng-có-khung
const doc = (d, base) => { pdf(d, base); json(d, base); };           // tài liệu đã xử lý
const src = (d, file) => writeFileSync(join(d, file), 'fixture source');   // chờ xử lý
const mon = (d, obj) => writeFileSync(join(d, '_mon.json'), JSON.stringify(obj, null, 2));

// Môn 1: tên có dấu, có _mon.json (color + order), lồng 2 tầng + 1 file chờ xử lý
const m1 = dir('Tố tụng Hình sự');
mon(m1, { color: '#75420E', order: 1 });
doc(m1, 'tong-quan');
const m1c1 = dir('Tố tụng Hình sự', 'Chương 1');
doc(m1c1, 'slide-buoi-1');
const m1c1b = dir('Tố tụng Hình sự', 'Chương 1', 'Buổi 2');
doc(m1c1b, 'slide-buoi-2');
src(m1c1b, 'bai-tap.docx');           // CHỜ XỬ LÝ

// Môn 2: có _mon.json (chỉ order), 1 tầng
const m2 = dir('Luật Công chứng');
mon(m2, { order: 2 });
doc(m2, 'luat-cong-chung-2024');

// Môn 3: KHÔNG có _mon.json (test default: màu palette + alphabet)
const m3 = dir('Aa Dân sự');         // 'A' để kiểm tra sort alphabet khi thiếu order
doc(m3, 'giao-trinh');
src(m3, 'de-cuong.pptx');            // CHỜ XỬ LÝ

// Folder hệ thống (phải bị bỏ qua khi liệt kê môn)
dir('_inbox');
dir('_print');

console.log('Fixture created at', root);
```

- [ ] **Step 2: Sinh fixture và kiểm tra cấu trúc**

```bash
cd /Users/lavopavden/Dev/projects/Gu-Library
node scripts/make-fixture.mjs ./fixture-kho
find fixture-kho | sort
```
Expected: thấy 3 môn (`Tố tụng Hình sự`, `Luật Công chứng`, `Aa Dân sự`), folder lồng `Chương 1/Buổi 2`, các cặp `.pdf`+`.json`, file chờ xử lý `bai-tap.docx` + `de-cuong.pptx`, `_inbox/` + `_print/`, và `_mon.json` ở môn 1 & 2.

- [ ] **Step 3: Thêm fixture-kho vào .gitignore (không commit dữ liệu test nhị phân)**

Thêm dòng `fixture-kho/` vào `.gitignore` (script sinh lại được nên không cần track output).

- [ ] **Step 4: Commit script**

```bash
git add -A && git commit -m "test(m2): fixture generator for multi-level kho with pending docs"
```

### Task 3.2: Đẩy fixture lên thiết bị + nghiệm thu M2 (thao tác tay)

**Files:** không có; thao tác trên thiết bị.

> Cần app đã cài bản mới nhất (Phase 0-2). Nếu chưa, build + install lại:
> `bash -lc 'cd /Users/lavopavden/Dev/projects/Gu-Library && npm run build && npx cap sync android && cd android && ./gradlew assembleDebug && adb install -r app/build/outputs/apk/debug/app-debug.apk'`

- [ ] **Step 1: Đẩy fixture vào shared storage của máy**

```bash
bash -lc '
adb shell rm -rf /sdcard/Download/fixture-kho
adb push /Users/lavopavden/Dev/projects/Gu-Library/fixture-kho /sdcard/Download/fixture-kho
adb shell ls -R /sdcard/Download/fixture-kho | head -30
'
```
Expected: cây thư mục fixture xuất hiện trong `/sdcard/Download/fixture-kho`.

- [ ] **Step 2: Trong app, chọn folder fixture qua SAF**

Mở app → "Chọn folder kho" → trong picker điều hướng tới **Download ▸ fixture-kho** → Use this folder. (Lưu ý: M2 mới có PoC list cấp 1; để nghiệm thu đầy đủ cần UI tối thiểu liệt kê môn — xem Step 3.)

- [ ] **Step 3: Mở rộng SafPoc để dùng repository (liệt kê môn + đi sâu)**

Cập nhật `src/poc/SafPoc.tsx`: sau khi chọn/khôi phục root, gọi `listMon()` để hiện danh sách môn (tên + màu nếu có + badge ⏳ nếu folder/cây có pending). Cho bấm vào môn → `listFolder(mon.uri)` hiện folder con + tài liệu + mục chờ xử lý; bấm folder con đi sâu tiếp (đệ quy, độ sâu bất kỳ). Mục "chờ xử lý" hiển thị mờ + nhãn ⏳ (chưa cần mở xem — Viewer là M5).

Đây vẫn là UI PoC tối thiểu để **nghiệm thu**, không phải Home thật (M4). Sau khi dùng repository, build + install lại như khối lệnh đầu Task 3.2.

- [ ] **Step 4: NGHIỆM THU M2 trên máy thật (đối chiếu build brief)**

Kiểm trên thiết bị với fixture:
1. **[PoC SAF]** Đóng/mở lại app → vẫn giữ quyền, tự liệt kê lại (đã đạt ở Phase 0; xác nhận lại với root = fixture-kho).
2. **[Cây nhiều tầng]** Liệt kê đúng 3 môn; vào `Tố tụng Hình sự ▸ Chương 1 ▸ Buổi 2` được, breadcrumb/độ sâu đúng.
3. **[Tên + meta]** Tên môn hiển thị đúng tiếng Việt có dấu từ folder name; `Tố tụng Hình sự` màu `#75420E`; thứ tự: `Tố tụng Hình sự`(order 1) → `Luật Công chứng`(order 2) → `Aa Dân sự`(không order, xếp cuối theo alphabet trong nhóm thiếu order). Môn không `_mon.json` dùng màu mặc định.
4. **[Phân biệt trạng thái]** `slide-buoi-2` (có pdf+json) là tài liệu bình thường; `bai-tap.docx` và `de-cuong.pptx` hiện ⏳ chờ xử lý.
5. **[Bỏ qua hệ thống]** `_inbox` và `_print` KHÔNG xuất hiện trong danh sách môn.

✅ **M2 ĐẠT** khi cả 5 điểm đúng.

- [ ] **Step 5: Commit chốt M2**

```bash
cd /Users/lavopavden/Dev/projects/Gu-Library
git add -A
git commit -m "feat(m2): storage layer verified on device — môn tree, _mon.json, pending detection"
```

---

## Nghiệm thu M2 (đối chiếu build brief, mục M2 đã cập nhật)

- [x] PoC SAF: chọn folder kho → giữ được quyền sau khi đóng/mở lại app. → Phase 0 Task 0.5 + Task 3.2. **ĐẠT** (verify trên SM-S908E).
- [x] App liệt kê đúng cây môn/chương từ kho mẫu nhiều tầng. → Task 3.2. **ĐẠT**.
- [x] Tên môn từ folder name (kể cả tiếng Việt có dấu); màu/thứ tự từ `_mon.json` khi có, default khi thiếu. → Task 1.2 + 2.1 + 3.2. **ĐẠT**.
- [x] Phân biệt tài liệu đã xử lý (PDF+JSON) vs chờ xử lý (chỉ gốc). → Task 1.3 + 3.2. **ĐẠT**.

> **M2 ĐÓNG (2026-06-19).** Cả 5 điểm nghiệm thu (4 tiêu chí build brief + cây nhiều tầng/bỏ qua `_inbox`/`_print`) đạt trên thiết bị thật với fixture. SAF custom plugin giữ quyền qua restart; domain model 13 unit test xanh. UI hiện là màn PoC — bộ mặt Home thật là M4.

## Self-review notes (đã đối chiếu spec sau khi viết)

- **Spec 4.1b (schema `_mon.json` option A):** display name = folder name (Task 2.1 dùng `d.name`); `_mon.json` chỉ color+order, tùy chọn, có default (Task 1.2 + sort ở 2.1); chỉ đọc ở cấp môn (listMon chỉ đọc `_mon.json` của folder cấp 1). ✓
- **Spec 4.1 (độ sâu bất kỳ):** `listFolder(uri)` đệ quy theo uri folder con, không hardcode tầng. ✓
- **Spec 4.2 (cặp PDF+JSON):** classify ghép theo basename (Task 1.3). Sidecar KHÔNG bị parse nội dung ở M2 (chỉ lấy uri) — đúng phạm vi. ✓
- **Spec 4.4 (chờ xử lý):** file gốc không thành cặp → pending + `hasPending` cho badge ⏳. ✓
- **Spec 4.3 (index derived):** KHÔNG đụng — chỉ chừa chỗ. ✓
- **Spec mục 2 + risk #2 (scoped storage ĐỌC):** SAF + persistable permission, PoC trên máy thật trước (Phase 0 là cổng chặn). ✓
- **Risk #7 (scoped storage GHI ở M9):** plugin đã `takePersistableUriPermission` cả WRITE để M9 khỏi xin lại, nhưng M2 KHÔNG có code ghi. ✓
- **Build brief "fixture tự dựng, không kho thật":** `scripts/make-fixture.mjs` (Task 3.1). ✓
- **`_inbox`/`_print` bỏ qua khi liệt kê môn:** Task 2.1 + nghiệm thu 3.2#5. ✓
- **TDD:** domain model thuần (monjson, classify) có vòng đỏ→xanh thật; phần SAF/thiết bị là cổng verify tay (không unit-test được layer native trong jsdom). ✓
- **`android/` un-ignore:** bắt buộc vì có code native tự viết (Task 0.1). ✓

## Điểm cần người dùng thao tác tay
- Phase 0 Task 0.5: chọn folder + đóng/mở lại app để nghiệm thu persistable permission.
- Phase 3 Task 3.2: chọn folder fixture trong picker + nghiệm thu 5 điểm trên thiết bị.
(adb push, build, install đều tự động bằng lệnh.)
