# M6c — Tạo môn + tạo folder con trong app — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`).
> **Version:** tính năng mới → bump **minor → 0.9.0**.

**Goal:** Tạo **môn (folder cấp 1, kèm `_mon.json` màu)** từ nút "+" cạnh "Môn học" ở Home; tạo **folder con (mkdir, không `_mon.json`)** tại cấp đang đứng trong FolderPage. Năng lực app **tạo folder trong kho** (vùng mới) — cũng là **spike sống cho M10**.

**Architecture:** App tạo folder qua SAF (`DocumentFile.createDirectory`). Vì bài học v0.8.1 (Samsung SAF createFile ghi `.tmp`, getName nói dối), **Phase 0 spike** kiểm `createDirectory` trên máy thật (tên tiếng Việt + lồng + trùng) trước khi xây UI. Logic thuần (validate tên, sort folder/file) TDD. UI: `CreateFolderModal` dùng chung (môn = có color picker; folder con = không).

**Tech Stack:** Capacitor 8 `Saf` plugin (thêm `createDir`), Ionic React (IonModal), `@capacitor/preferences`, `khoEvents` (đã có), Vitest.

**Phạm vi:** CHỈ tạo môn + folder con. KHÔNG xoá/đổi tên/chuyển môn (M10). KHÔNG metadata folder con. KHÔNG đụng worker. Tái dùng M2 (`listMon`/`listFolder`/`classify`), M4 (Home/FolderPage/breadcrumb), `khoEvents`.

**Tiền đề:** v0.8.1, chạy 2 dev phone. `Saf.ensureDir(parentUri,name)` đã tồn tại (createDirectory + **reuse** nếu trùng) — dùng cho `_inbox`. M6c cần **chặn trùng** (khác ensureDir).

---

## Khái niệm chốt
- **Palette môn (6 swatch trầm):** `#75420E` nâu, `#553B08` nâu đậm, `#4A5D3A` xanh rêu, `#9C5B34` gạch đất, `#3A5A6E` xanh dương trầm, `#6E3A5A` tím mận.
- **Ký tự cấm:** `/ \ : * ? " < > |` + tên rỗng/toàn space.
- **Trùng tên cùng cấp:** CHẶN, báo "đã tồn tại" (KHÔNG auto `(1)` — hành động chủ đích).
- **Sort folder:** folder TRƯỚC, file SAU; mỗi nhóm alphabet (`localeCompare 'vi'`). "Chưa phân loại" vẫn cuối (sortMons giữ nguyên ở Home).

---

## Phase 0 — Spike SAF tạo folder (máy thật, GATE)

> M2 validate đọc; M6/M9 ghi *file*. Tạo *folder* (tên tiếng Việt) qua SAF là thao tác mới — kiểm tên FS thật đúng (không bị Samsung mangle như `.tmp` của createFile), lồng được, và hành vi khi trùng.

### Task 0.1: native createDir + spike trigger tạm
**Files:** `android/.../SafPlugin.java`, `src/plugins/saf.ts`, tạm 1 nút ở HomePage.

- [ ] **Step 1: Thêm `createDir` vào SafPlugin.java** (chặn trùng, KHÁC ensureDir reuse):
```java
    @PluginMethod
    public void createDir(PluginCall call) {
        String parentUri = call.getString("parentUri");
        String name = call.getString("name");
        if (parentUri == null || name == null) { call.reject("parentUri+name required"); return; }
        try {
            androidx.documentfile.provider.DocumentFile parent =
                androidx.documentfile.provider.DocumentFile.fromTreeUri(getContext(), android.net.Uri.parse(parentUri));
            if (parent == null || !parent.isDirectory()) { call.reject("bad parent"); return; }
            if (parent.findFile(name) != null) { call.reject("exists"); return; } // chặn trùng
            androidx.documentfile.provider.DocumentFile child = parent.createDirectory(name);
            if (child == null) { call.reject("createDirectory returned null"); return; }
            // Kiểm tên thật (bài học v0.8.1): nếu getName lệch tên yêu cầu → log để soi.
            android.util.Log.i("GuSaf", "createDir req='" + name + "' got='" + child.getName() + "'");
            com.getcapacitor.JSObject ret = new com.getcapacitor.JSObject();
            ret.put("uri", child.getUri().toString());
            ret.put("name", child.getName());
            call.resolve(ret);
        } catch (Exception e) { call.reject("createDir failed: " + e.getMessage()); }
    }
```
- [ ] **Step 2:** thêm vào interface `src/plugins/saf.ts`:
```ts
  createDir(options: { parentUri: string; name: string }): Promise<{ uri: string; name: string }>;
```
- [ ] **Step 3:** native compile + `npm run build` PASS. Commit `feat(m6c): Saf.createDir (block duplicate)`.
- [ ] **Step 4: Spike trên máy** — tạm thêm nút ở HomePage gọi: `getRootUri()` → `Saf.createDir(root, 'Spike Tạo Môn ĐÁ')` → rồi `createDir(<uri vừa tạo>, 'Chương 1 — Đá')`. Build+install. Bấm.
- [ ] **Step 5: NGHIỆM THU SPIKE (adb, máy thật):**
```bash
bash -lc 'adb -s <serial> shell "ls -la /sdcard/Download/kho/" ; adb -s <serial> shell "ls -la /sdcard/Download/kho/Spike\ Tạo\ Môn\ ĐÁ/"'
```
Kỳ vọng: folder `Spike Tạo Môn ĐÁ` (tên tiếng Việt **đúng**, KHÔNG mangle/`.tmp`) + folder con `Chương 1 — Đá` bên trong. Bấm lại nút → `createDir` reject `exists` (chặn trùng). Soi log `GuSaf createDir req=...got=...` xem getName có khớp.
- ✅ **GATE:** tên FS đúng + lồng được + trùng bị chặn → sang Phase 1. Nếu tên bị mangle (như ca `.tmp`) → DỪNG, báo người dùng (cân nhắc hướng worker như v0.8.1). Gỡ nút spike + dọn folder spike (adb) trước khi đi tiếp.

---

## Phase 1 — Repo API tạo môn / folder con

### Task 1.1: repo.createMon + createSubfolder
**Files:** `src/storage/repo.ts`

- [ ] **Step 1:** thêm vào `repo.ts`:
```ts
import { emitKhoChanged } from '../lib/khoEvents';

// Tạo môn cấp 1: mkdir + ghi _mon.json {color}. Ném 'exists' nếu trùng.
export async function createMon(name: string, color: string): Promise<void> {
  const root = await getRootUri();
  if (!root) throw new Error('Chưa chọn folder kho');
  const { uri } = await Saf.createDir({ parentUri: root, name }); // reject 'exists' nếu trùng
  await Saf.writeFile({ dirUri: uri, name: '_mon.json', content: JSON.stringify({ color }) });
  emitKhoChanged();
}

// Tạo folder con tại parentUri (độ sâu bất kỳ). KHÔNG _mon.json.
export async function createSubfolder(parentUri: string, name: string): Promise<void> {
  await Saf.createDir({ parentUri, name }); // reject 'exists' nếu trùng
  emitKhoChanged();
}
```
- [ ] **Step 2:** `npm run build` PASS. Commit `feat(m6c): repo.createMon + createSubfolder`.

---

## Phase 2 — Logic thuần (TDD) + palette + sort

### Task 2.1: validateFolderName (TDD)
**Files:** `src/storage/folderName.ts` + `folderName.test.ts`
- [ ] **Step 1: test thất bại trước:**
```ts
import { describe, it, expect } from 'vitest';
import { validateFolderName } from './folderName';
describe('validateFolderName', () => {
  it('chấp nhận tên tiếng Việt có dấu (trim)', () => {
    expect(validateFolderName('  Luật Đất đai  ')).toEqual({ ok: true, value: 'Luật Đất đai' });
  });
  it('chặn rỗng / toàn space', () => {
    expect(validateFolderName('   ').ok).toBe(false);
    expect(validateFolderName('').ok).toBe(false);
  });
  it('chặn ký tự cấm', () => {
    for (const c of ['/', '\\', ':', '*', '?', '"', '<', '>', '|']) {
      expect(validateFolderName('a' + c + 'b').ok).toBe(false);
    }
  });
});
```
- [ ] **Step 2: FAIL → implement `folderName.ts`:**
```ts
const FORBIDDEN = /[/\\:*?"<>|]/;
export type NameResult = { ok: true; value: string } | { ok: false; error: string };
export function validateFolderName(raw: string): NameResult {
  const value = raw.trim();
  if (!value) return { ok: false, error: 'Tên không được rỗng' };
  if (FORBIDDEN.test(value)) return { ok: false, error: 'Tên chứa ký tự cấm ( / \\ : * ? " < > | )' };
  return { ok: true, value };
}
```
- [ ] **Step 3: PASS.** Commit `feat(m6c): validateFolderName (tested)`.

### Task 2.2: classify sort folder/file alphabet (TDD)
**Files:** `src/storage/classify.ts`, `classify.test.ts`
- [ ] **Step 1:** thêm test: folders + documents trả về **đã sort alphabet** (vi).
- [ ] **Step 2:** cuối `classifyEntries`, trước `return`: sort `folders` và `documents` theo `name` (`localeCompare(b.name,'vi')`). (FolderPage đã render folders→documents→pending, nên folder-trước-file tự đúng; chỉ cần sort trong nhóm.)
- [ ] **Step 3:** `npm test && npm run build` PASS. Commit `feat(m6c): sort folders + documents alphabetically`.

### Task 2.3: palette
**Files:** `src/storage/palette.ts`
- [ ] `export const MON_PALETTE = ['#75420E','#553B08','#4A5D3A','#9C5B34','#3A5A6E','#6E3A5A'];` Commit `feat(m6c): mon color palette`.

---

## Phase 3 — UI tạo môn (Home "+")

### Task 3.1: CreateFolderModal (dùng chung)
**Files:** `src/components/CreateFolderModal.tsx`
- [ ] Modal: input tên + (nếu `withColor`) 6 swatch `MON_PALETTE` (chọn 1, mặc định [0]) + nút "Tạo". Logic:
  - validate qua `validateFolderName`; lỗi → hiện inline.
  - dup-check tức thì: nếu `value` (so sánh trim, phân biệt hoa-thường theo FS) ∈ `existingNames` → "Đã tồn tại".
  - hợp lệ → `onCreate(value, color?)`; nếu `onCreate` ném `'exists'` (native chặn) → hiện "Đã tồn tại".
  - Props: `{ isOpen, title, withColor, existingNames, onCreate, onClose }`.
- [ ] build PASS. Commit `feat(m6c): CreateFolderModal (name + optional color, validation, dup-block)`.

### Task 3.2: Home "+" tạo môn
**Files:** `src/pages/HomePage.tsx`
- [ ] Cạnh `<h2>Môn học</h2>` thêm nút "+" (IonButton/IonIcon `add`), onClick mở `CreateFolderModal title="Môn mới" withColor existingNames={mons.map(m=>m.name)}`. `onCreate(name,color)=> { await createMon(name, color!); reload(); }` (reload + khoEvents → Home cập nhật ngay). Lỗi 'exists' → modal hiện.
- [ ] `npm test && npm run build` PASS (smoke xanh). Commit `feat(m6c): create mon from Home (+ button, name + color)`.

---

## Phase 4 — UI tạo folder con (FolderPage "+")

### Task 4.1: FolderPage "+" tạo folder con
**Files:** `src/pages/FolderPage.tsx`
- [ ] Thêm nút "+" ở header (slot end), onClick mở `CreateFolderModal title="Thư mục mới" withColor={false} existingNames={listing.folders.map(f=>f.name)}`. `onCreate(name)=> { await createSubfolder(decoded, name); reloadListing(); }` (reload listFolder hiện tại). KHÔNG _mon.json.
- [ ] Reload sau tạo: tách `loadListing()` ra để gọi lại; hoặc nghe `onKhoChanged`.
- [ ] `npm test && npm run build` PASS. Commit `feat(m6c): create subfolder from FolderPage (+ button)`.

---

## Phase 5 — Build + nghiệm thu máy thật + 0.9.0

### Task 5.1: Build + install (2 phone)
- [ ] build + sync + assembleDebug + `adb -s <serial> install -r` cho cả 2 máy đang cắm. Gỡ nút spike Phase 0 nếu còn.

### Task 5.2: NGHIỆM THU (đối chiếu checklist M6c)
- [ ] Home "+" → tên + màu → môn mới hiện ngay, đúng màu; `_mon.json` có `color` (adb/file-manager).
- [ ] Môn rỗng → "0 tài liệu", sort alphabet đúng (Chưa phân loại vẫn cuối).
- [ ] Trong môn "+" → folder con hiện ngay, KHÔNG `_mon.json`; lồng nhiều tầng, breadcrumb đúng.
- [ ] Sort trong folder: folder trên, file dưới, mỗi nhóm alphabet.
- [ ] Trùng tên (môn/folder) → chặn "đã tồn tại".
- [ ] Ký tự cấm / rỗng → chặn, báo rõ.
- [ ] Tên tiếng Việt có dấu → tạo + hiển thị + **sync sang máy 2** đúng.
- [ ] (CC verify adb) tên folder FS thật đúng (không mangle).

### Task 5.3: Đóng 0.9.0
- [ ] `package.json` → 0.9.0; CHANGELOG `## [0.9.0] — M6c`. Commit `feat(m6c): create mon + subfolder in app — verified on device (v0.9.0)`. Push.

---

## Self-review
- Tạo môn: tên+màu, `_mon.json{color}` cấp 1, KHÔNG order (sort alphabet, sortMons giữ). ✓
- Folder con: mkdir, KHÔNG `_mon.json`. ✓
- Trùng → chặn (native `createDir` reject 'exists' + JS pre-check). Không auto `(1)`. ✓
- Ký tự cấm/rỗng → `validateFolderName` (tested). ✓
- Tiếng Việt: spike P0 xác nhận FS thật đúng (bài học v0.8.1 — KHÔNG tin getName mù, kiểm adb). ✓
- Sort folder-trước-file + alphabet: classify sort + FolderPage render order. ✓
- Refresh ngay: `emitKhoChanged` + reload (Home đã nghe onKhoChanged từ v0.8.0). ✓
- Spike sống cho M10 (app ghi folder môn): P0. ✓
- TDD: validateFolderName + classify sort thuần; createDir/UI/sync verify thiết bị. ✓

## Việc tay (người dùng)
- P0 + 5.2: bấm tạo trên máy, nghiệm thu tên tiếng Việt + sync 2 máy; CC verify adb tên FS thật.
