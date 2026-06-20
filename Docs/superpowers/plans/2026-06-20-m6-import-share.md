# M6 — Import qua Share Intent — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
> **Version:** M6 hoàn tất = **minor → 0.6.0**.

**Goal:** Share một file (PDF/Word/PPTX) từ app khác → Gú's Library → **sheet trượt lên** hỏi chọn môn (gợi ý môn vừa dùng) + nút "Chưa phân loại" → file gốc được copy vào `_inbox/` với **tên gắn tiền tố môn** (`[<môn>] <tên gốc>`) để Syncthing đẩy lên mini PC. Tài liệu vừa thêm hiện ⏳ ở đúng môn cho tới khi mini PC (M7) xử lý.

**Architecture:** Dựa trên **spike đã pass (commit 510f4e8)**: native `ShareTarget` plugin bắt ACTION_SEND, native `Saf` ghi qua content-URI. M6 thêm: (1) native **copy nhị phân** (`Saf.copyToDir`, stream src→dest — vì file là PDF/Word, không phải text); (2) logic **tiền tố** thuần (`makeInboxName`/`parseInboxPrefix`, unit-test); (3) **ShareReceiver** (mount trong App) bắt file share lúc cold-start + resume → mở **ChooseMonSheet** (IonModal breakpoints) → copy vào `_inbox/`; (4) Home gộp ⏳ từ `_inbox/` (theo tiền tố) vào đúng môn.

**Tech Stack:** Capacitor 8 + `@capacitor/app` (đã có, để bắt `resume`), `@ionic/react` (IonModal sheet, useIonToast), plugin native `Saf`/`ShareTarget`, Vitest.

**Phạm vi:** CHỈ M6. **KHÔNG** làm mini PC convert/extract (M7 — app chỉ thả file gốc + tiền tố vào `_inbox/`). **KHÔNG** làm nút "+" file picker (đường dự phòng — để sau, không chặn). **KHÔNG** đụng `_print/`/M9. Watch-folder (5.2) là thao tác tay ngoài app, không code.

**Tiền đề / Phase 0 — SPIKE ĐÃ XONG (commit 510f4e8), kết quả:**
- **Spike A (SAF ghi): PASS** — `Saf.ensureDir` tạo `_inbox/`, `Saf.writeFile` ghi file qua content-URI; verify trên đĩa (`/sdcard/Download/kho/_inbox/`). Quyền WRITE persisted từ picker (M2) đủ.
- **Spike B (Share Intent): PASS** — intent-filter ACTION_SEND (pdf/doc/ppt mimes) + `MainActivity.onCreate/onNewIntent` bắt `EXTRA_STREAM` + `ShareTargetPlugin.getSharedFile()` trả `{uri, name}`. Cold-start nhận đúng `arc_whitepaper.pdf` + content-URI (Samsung MyFiles FileProvider).
- **Phát hiện cho plan:**
  1. URI share là content-URI *ngoài* (vd `com.sec.android.app.myfiles.FileProvider`) chỉ có **quyền đọc tạm theo intent** → phải **copy ngay** lúc nhận, không lưu URI để dùng sau.
  2. `Saf.writeFile` của spike ghi **text UTF-8** → KHÔNG dùng cho PDF. M6 cần **copy nhị phân** (`copyToDir` stream).
  3. `DocumentFile.createFile` tự thêm hậu tố `(1)` nếu trùng tên — tiền tố `[<môn>]` vẫn ở đầu nên M7 parse được; trả về tên thật.
  4. Cần xử lý **share lúc app đang mở** (warm): `onNewIntent` lưu pending → JS phải re-check khi `resume` (`@capacitor/app`).
- **Việc dọn:** panel "TEMP M6 spike" trên HomePage + `Saf.writeFile`/`ensureDir` (text) là tạm — Task 5 gỡ panel; `writeFile` giữ hay bỏ tùy (copyToDir thay vai). `ShareTargetPlugin`, intent-filter, MainActivity = GIỮ (nền tảng).

---

## File Structure (M6)
- `android/.../SafPlugin.java` — **sửa**: thêm `copyToDir` (stream nhị phân).
- `src/plugins/saf.ts` — **sửa**: thêm `copyToDir`.
- `src/import/prefix.ts` + `prefix.test.ts` — **tạo**: `makeInboxName` / `parseInboxPrefix` (thuần, TDD).
- `src/import/inboxRepo.ts` — **tạo**: `ensureInbox`, `importSharedFile`, `listInboxByMon`, last-used môn.
- `src/import/ChooseMonSheet.tsx` — **tạo**: sheet trượt lên chọn môn + "Chưa phân loại".
- `src/import/ShareReceiver.tsx` — **tạo**: bắt share (cold+resume) → mở sheet → copy → toast.
- `src/App.tsx` — **sửa**: mount `<ShareReceiver/>` (cạnh `BackButtonHandler`).
- `src/pages/HomePage.tsx` — **sửa**: gỡ panel spike; gộp ⏳ `_inbox/` theo môn.
- `src/components/MonCard.tsx` — **sửa**: nhận thêm `inboxPending` cộng vào badge.
- `package.json` / `CHANGELOG.md` — **sửa**: 0.6.0.

**Preferences key:** `last_mon_name` (gợi ý môn vừa dùng).
**Hằng số:** `INBOX = '_inbox'`, `UNFILED = 'Chưa phân loại'`.

---

## Phase 1 — Native binary copy

### Task 1.1: `Saf.copyToDir`
**Files:** `android/.../SafPlugin.java`, `src/plugins/saf.ts`

- [ ] **Step 1: Thêm method copyToDir vào SafPlugin.java**
```java
    // Copy nhị phân từ một content-URI nguồn (vd file share) vào một dir trong kho.
    // Dùng cho PDF/Word/PPTX — KHÁC writeFile (text). createFile tự thêm hậu tố nếu trùng.
    @PluginMethod
    public void copyToDir(PluginCall call) {
        String srcUri = call.getString("srcUri");
        String dirUri = call.getString("dirUri");
        String name = call.getString("name");
        if (srcUri == null || dirUri == null || name == null) { call.reject("srcUri+dirUri+name required"); return; }
        try {
            androidx.documentfile.provider.DocumentFile dir =
                androidx.documentfile.provider.DocumentFile.fromTreeUri(getContext(), android.net.Uri.parse(dirUri));
            if (dir == null || !dir.isDirectory()) { call.reject("not a directory"); return; }
            androidx.documentfile.provider.DocumentFile f = dir.createFile("application/octet-stream", name);
            if (f == null) { call.reject("createFile returned null"); return; }
            java.io.InputStream is = getContext().getContentResolver().openInputStream(android.net.Uri.parse(srcUri));
            java.io.OutputStream os = getContext().getContentResolver().openOutputStream(f.getUri());
            if (is == null || os == null) { call.reject("open stream failed"); return; }
            byte[] buf = new byte[8192];
            int n;
            while ((n = is.read(buf)) != -1) os.write(buf, 0, n);
            os.flush(); os.close(); is.close();
            com.getcapacitor.JSObject ret = new com.getcapacitor.JSObject();
            ret.put("uri", f.getUri().toString());
            ret.put("name", f.getName());
            call.resolve(ret);
        } catch (Exception e) { call.reject("copy failed: " + e.getMessage()); }
    }
```

- [ ] **Step 2: Thêm vào interface `src/plugins/saf.ts`**
```ts
  copyToDir(options: { srcUri: string; dirUri: string; name: string }): Promise<{ uri: string; name: string }>;
```

- [ ] **Step 3: Verify** — `bash -lc 'cd /Users/lavopavden/Dev/projects/Gu-Library/android && ./gradlew :app:compileDebugJavaWithJavac 2>&1 | tail -3'` → BUILD SUCCESSFUL; `npm run build` PASS.
- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat(m6): Saf.copyToDir binary stream copy into kho"`

---

## Phase 2 — Logic tiền tố (TDD, thuần)

### Task 2.1: `makeInboxName` / `parseInboxPrefix`
**Files:** `src/import/prefix.ts`, `src/import/prefix.test.ts`

- [ ] **Step 1: Test thất bại trước**
`src/import/prefix.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { makeInboxName, parseInboxPrefix, UNFILED } from './prefix';

describe('inbox prefix', () => {
  it('makeInboxName gắn tiền tố môn', () => {
    expect(makeInboxName('Tố tụng Hình sự', 'bai.pdf')).toBe('[Tố tụng Hình sự] bai.pdf');
  });
  it('makeInboxName cho Chưa phân loại', () => {
    expect(makeInboxName(UNFILED, 'x.docx')).toBe('[Chưa phân loại] x.docx');
  });
  it('parseInboxPrefix lấy lại môn + tên gốc', () => {
    expect(parseInboxPrefix('[Tố tụng Hình sự] bai.pdf')).toEqual({ mon: 'Tố tụng Hình sự', name: 'bai.pdf' });
  });
  it('parse chịu được hậu tố (1) Android tự thêm', () => {
    expect(parseInboxPrefix('[Luật Công chứng] bai (1).pdf')).toEqual({ mon: 'Luật Công chứng', name: 'bai (1).pdf' });
  });
  it('parse trả null khi không có tiền tố', () => {
    expect(parseInboxPrefix('khong-tien-to.pdf')).toBeNull();
  });
  it('parse bỏ qua file ẩn / .json', () => {
    expect(parseInboxPrefix('.stfolder')).toBeNull();
  });
});
```

- [ ] **Step 2: Chạy → FAIL** — `npx vitest run src/import/prefix.test.ts`.

- [ ] **Step 3: Implement `src/import/prefix.ts`**
```ts
export const UNFILED = 'Chưa phân loại';

// Tên file trong _inbox: "[<môn>] <tên gốc>". Tiền tố là interface M6↔M7.
export function makeInboxName(monName: string, originalName: string): string {
  return `[${monName}] ${originalName}`;
}

// Tách "[<môn>] <tên>" -> {mon, name}; null nếu không khớp mẫu.
export function parseInboxPrefix(fileName: string): { mon: string; name: string } | null {
  const m = /^\[([^\]]+)\]\s(.+)$/.exec(fileName);
  if (!m) return null;
  return { mon: m[1], name: m[2] };
}
```

- [ ] **Step 4: Chạy → PASS (6)** — `npx vitest run src/import/prefix.test.ts`.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat(m6): inbox prefix make/parse (M6<->M7 interface) with tests"`

---

## Phase 3 — Luồng import (sheet + copy)

### Task 3.1: inboxRepo
**Files:** `src/import/inboxRepo.ts`

- [ ] **Step 1: Tạo `src/import/inboxRepo.ts`**
```ts
import { Preferences } from '@capacitor/preferences';
import { Saf } from '../plugins/saf';
import { getRootUri } from '../storage/repo';
import { makeInboxName, parseInboxPrefix } from './prefix';

const INBOX = '_inbox';
const KEY_LAST_MON = 'last_mon_name';

export async function getLastMon(): Promise<string | null> {
  const { value } = await Preferences.get({ key: KEY_LAST_MON });
  return value ?? null;
}
export async function setLastMon(mon: string): Promise<void> {
  await Preferences.set({ key: KEY_LAST_MON, value: mon });
}

async function ensureInbox(): Promise<string> {
  const root = await getRootUri();
  if (!root) throw new Error('Chưa chọn folder kho (Cài đặt)');
  const { uri } = await Saf.ensureDir({ parentUri: root, name: INBOX });
  return uri;
}

// Copy file share vào _inbox/ với tên gắn tiền tố môn. Trả tên cuối (đã copy).
export async function importSharedFile(srcUri: string, originalName: string, monName: string): Promise<string> {
  const inbox = await ensureInbox();
  const { name } = await Saf.copyToDir({ srcUri, dirUri: inbox, name: makeInboxName(monName, originalName) });
  await setLastMon(monName);
  return name;
}

// Đếm số file "chờ xử lý" trong _inbox theo môn (từ tiền tố) -> Map<mon, count>.
export async function listInboxByMon(): Promise<Map<string, number>> {
  const root = await getRootUri();
  const map = new Map<string, number>();
  if (!root) return map;
  let inboxUri: string;
  try {
    const r = await Saf.ensureDir({ parentUri: root, name: INBOX });
    inboxUri = r.uri;
  } catch {
    return map;
  }
  const { entries } = await Saf.listFolder({ uri: inboxUri });
  for (const e of entries) {
    if (e.isDirectory) continue;
    const p = parseInboxPrefix(e.name);
    if (p) map.set(p.mon, (map.get(p.mon) ?? 0) + 1);
  }
  return map;
}
```

- [ ] **Step 2: build** → `npm run build` PASS. **Commit** — `git add -A && git commit -m "feat(m6): inboxRepo (ensure _inbox, import copy, per-mon pending)"`

### Task 3.2: ChooseMonSheet (sheet trượt lên)
**Files:** `src/import/ChooseMonSheet.tsx`

- [ ] **Step 1: Tạo `src/import/ChooseMonSheet.tsx`**
```tsx
import { useEffect, useState } from 'react';
import {
  IonModal, IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel,
  IonButton, IonNote,
} from '@ionic/react';
import { listMon } from '../storage/repo';
import { getLastMon } from './inboxRepo';
import { UNFILED } from './prefix';
import MonSwatch from '../components/MonSwatch';
import type { Mon } from '../storage/types';

interface Props {
  isOpen: boolean;
  fileName: string | null;
  onPick: (monName: string) => void;
  onCancel: () => void;
}

export default function ChooseMonSheet({ isOpen, fileName, onPick, onCancel }: Props) {
  const [mons, setMons] = useState<Mon[]>([]);
  const [last, setLast] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    (async () => {
      try { setMons(await listMon()); } catch { setMons([]); }
      setLast(await getLastMon());
    })();
  }, [isOpen]);

  // Đưa môn vừa dùng lên đầu.
  const ordered = [...mons].sort((a, b) => (a.name === last ? -1 : b.name === last ? 1 : 0));

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onCancel} breakpoints={[0, 0.6, 0.95]} initialBreakpoint={0.6}>
      <IonHeader>
        <IonToolbar>
          <IonTitle className="gu-serif" style={{ fontSize: 16 }}>Lưu vào môn nào?</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {fileName && <IonNote>{fileName}</IonNote>}
        <IonButton expand="block" fill="outline" style={{ margin: '10px 0' }} onClick={() => onPick(UNFILED)}>
          Chưa phân loại
        </IonButton>
        <IonList>
          {ordered.map((m) => (
            <IonItem key={m.uri} button onClick={() => onPick(m.name)}>
              <MonSwatch name={m.name} color={m.meta.color} />
              <IonLabel className="gu-serif" style={{ marginLeft: 12 }}>
                {m.name}{m.name === last ? '  · vừa dùng' : ''}
              </IonLabel>
            </IonItem>
          ))}
        </IonList>
      </IonContent>
    </IonModal>
  );
}
```

- [ ] **Step 2: build** → PASS. **Commit** — `git add -A && git commit -m "feat(m6): ChooseMonSheet (slide-up sheet, last-used first, Unfiled)"`

### Task 3.3: ShareReceiver (bắt share → sheet → copy)
**Files:** `src/import/ShareReceiver.tsx`, `src/App.tsx`

- [ ] **Step 1: Tạo `src/import/ShareReceiver.tsx`**
```tsx
import { useEffect, useState, useCallback } from 'react';
import { useIonToast } from '@ionic/react';
import { App } from '@capacitor/app';
import { ShareTarget } from '../plugins/shareTarget';
import ChooseMonSheet from './ChooseMonSheet';
import { importSharedFile } from './inboxRepo';

interface Pending { uri: string; name: string; }

// Bắt file share (cold-start + khi app resume), mở sheet chọn môn, copy vào _inbox.
export default function ShareReceiver() {
  const [pending, setPending] = useState<Pending | null>(null);
  const [presentToast] = useIonToast();

  const check = useCallback(async () => {
    try {
      const r = await ShareTarget.getSharedFile();
      if (r.uri && r.name) setPending({ uri: r.uri, name: r.name });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    check(); // cold-start
    const sub = App.addListener('resume', () => { check(); }); // warm (share khi app đang mở)
    return () => { sub.then((h) => h.remove()); };
  }, [check]);

  const pick = async (monName: string) => {
    if (!pending) return;
    const file = pending;
    setPending(null);
    try {
      await importSharedFile(file.uri, file.name, monName);
      await presentToast({ message: `Đã thêm "${file.name}" vào ${monName} (chờ xử lý)`, duration: 2500 });
    } catch (e: unknown) {
      await presentToast({ message: 'Lỗi thêm file: ' + String(e instanceof Error ? e.message : e), duration: 3500, color: 'danger' });
    }
  };

  return (
    <ChooseMonSheet
      isOpen={pending !== null}
      fileName={pending?.name ?? null}
      onPick={pick}
      onCancel={() => setPending(null)}
    />
  );
}
```

- [ ] **Step 2: Mount trong `src/App.tsx`** — thêm `import ShareReceiver from './import/ShareReceiver';` và render `<ShareReceiver />` ngay sau `<BackButtonHandler />` bên trong `<IonReactRouter>`.

- [ ] **Step 3: build + test** → `npm test && npm run build` PASS (smoke test vẫn xanh; ShareReceiver gọi plugin trong try/catch + chỉ chạy listener nên không vỡ jsdom — nếu vỡ, report, KHÔNG xoá test).
- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat(m6): ShareReceiver wires share intent -> mon sheet -> _inbox copy"`

---

## Phase 4 — Hiện ⏳ đúng môn + dọn spike

### Task 4.1: MonCard cộng pending từ _inbox
**Files:** `src/components/MonCard.tsx`, `src/pages/HomePage.tsx`

- [ ] **Step 1: MonCard nhận prop `inboxPending`**
Trong `src/components/MonCard.tsx`: thêm prop `inboxPending?: number` (mặc định 0). Badge "N chờ" hiển thị khi `(sum.pending + inboxPending) > 0`, số hiện = tổng đó. (Giữ nguyên icon hourglass.)

- [ ] **Step 2: HomePage nạp inbox map + truyền xuống + GỠ panel spike**
Trong `src/pages/HomePage.tsx`:
- **Xoá** toàn bộ panel `{/* TEMP M6 spike ... */}` + state/handlers/imports của nó (Saf, ShareTarget, getRootUri nếu chỉ panel dùng — kiểm tra `grep`).
- Thêm: `const [inboxMap, setInboxMap] = useState<Map<string, number>>(new Map());` và trong `reload()` gọi `setInboxMap(await listInboxByMon())` (import từ `../import/inboxRepo`), bọc try/catch.
- Khi render mỗi `<MonCard mon={m} inboxPending={inboxMap.get(m.name) ?? 0} />`.

- [ ] **Step 3: build + test** → `npm test && npm run build` PASS. `grep -rn "TEMP M6 spike\|ShareTarget" src/pages/HomePage.tsx` → trống (panel đã gỡ; ShareTarget giờ chỉ ShareReceiver dùng).
- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat(m6): show _inbox pending per mon on Home; remove temp spike panel"`

---

## Phase 5 — Build + nghiệm thu trên máy + đóng 0.6.0

### Task 5.1: Build + install
- [ ] `bash -lc 'cd /Users/lavopavden/Dev/projects/Gu-Library && npm run build && npx cap sync android && cd android && ./gradlew assembleDebug && adb install -r app/build/outputs/apk/debug/app-debug.apk'` → SUCCESS.

### Task 5.2: NGHIỆM THU M6 (thao tác tay, đối chiếu brief)
- [ ] **Share → sheet → môn:** từ Files/Chrome Share 1 PDF → Gú's Library → **sheet trượt lên** hiện danh sách môn (môn vừa dùng ở đầu) + "Chưa phân loại". Chọn 1 môn (vd Luật Công chứng) → toast "Đã thêm … (chờ xử lý)".
- [ ] **File đúng chỗ + tiền tố:** (CC verify adb) `adb shell ls /sdcard/Download/kho/_inbox/` → thấy `[Luật Công chứng] <tên>.pdf`.
- [ ] **⏳ đúng môn:** Home → môn Luật Công chứng có badge "N chờ" tăng (gộp file _inbox vừa thêm).
- [ ] **Chưa phân loại:** Share 1 file → chọn "Chưa phân loại" → toast OK; `_inbox/` có `[Chưa phân loại] <tên>`; luồng không kẹt.
- [ ] **Warm-start:** mở sẵn app rồi Share 1 file → sheet vẫn bật (qua `resume`).

### Task 5.3: Đóng 0.6.0
- [ ] `package.json` → `0.6.0`; thêm mục `## [0.6.0] — M6: Import qua Share Intent` vào `CHANGELOG.md` (sheet chọn môn, tiền tố `_inbox/`, ⏳ theo môn; nền tảng ShareTarget/SAF-write từ spike 510f4e8).
- [ ] Đánh dấu nghiệm thu trong plan này.
- [ ] `git add -A && git commit -m "feat(m6): import via share intent verified on device — v0.6.0"`

---

## Nghiệm thu M6 (đối chiếu build brief)
- [x] Spike A + B pass trên máy thật trước khi xây luồng. → Phase 0 (commit 510f4e8).
- [ ] Share file → sheet chọn môn → file nằm đúng `_inbox/`, tên có tiền tố môn. → Phase 3 + 5.2.
- [ ] Tài liệu vừa thêm hiện ⏳ ở đúng môn. → Phase 4 + 5.2.
- [ ] Chọn "Chưa phân loại" cũng lưu được (tiền tố `[Chưa phân loại]`), không kẹt. → Phase 3 + 5.2.

## Self-review notes
- **Spec 5.1 (sheet trượt lên, gợi ý môn vừa dùng, Chưa phân loại):** ChooseMonSheet (IonModal breakpoints, last-used đầu danh sách). ✓
- **Spec 5.1 (tiền tố môn, interface M6↔M7):** `makeInboxName`/`parseInboxPrefix` (tested) + copy vào `_inbox/`. ✓
- **Spec 5.4#0 ([Chưa phân loại]):** UNFILED prefix. ✓
- **Ghi SAF (risk 14.7):** de-risk ở spike; `copyToDir` stream nhị phân (KHÔNG dùng writeFile text). ✓
- **Quyền đọc URI share tạm:** copy ngay khi nhận (ShareReceiver), không lưu URI. ✓
- **⏳ đúng môn:** `listInboxByMon` (parse tiền tố) → MonCard cộng badge. ✓
- **Warm-start share:** App `resume` re-check. ✓
- **Không lấn M7:** chỉ thả file gốc + tiền tố vào `_inbox/`; convert/extract là M7. ✓
- **TDD:** prefix make/parse thuần có test; native copy + share + sheet verify trên thiết bị (không test jsdom). ✓
- **Dọn spike:** panel TEMP gỡ ở Task 4.1; ShareTarget/intent-filter/MainActivity giữ làm nền tảng. ✓

## Điểm cần người dùng thao tác tay
- Phase 5.2: Share PDF từ app khác (cold + warm), chọn môn / Chưa phân loại, nghiệm thu ⏳ trên SM-S908E.
