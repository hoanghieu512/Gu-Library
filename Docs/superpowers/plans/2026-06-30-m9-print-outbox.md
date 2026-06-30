# M9 — Print outbox (mức C) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho phép Gú tick "cần in" từng tài liệu (cờ companion per-file, có sync), gom mọi file cần in vào `_print/` trong kho với tên có tiền tố môn, và dọn (xóa file + clear cờ) khi tick "xong" — khép Phase 1.

**Architecture:** Cờ "cần in" = file companion `<base>.print.json` đặt cạnh cặp `<base>.pdf`+`<base>.json` trong folder môn (app-owned, Syncthing sync, KHÔNG đụng sidecar). `classifyEntries` bỏ qua `.print.json` và gắn `printFlagged` lên `Document`. "Đã gửi đi in" suy ra từ hiện diện file trong `_print/` (không lưu state thứ hai). Gom = `Saf.copyToDir` (giữ gốc). Dọn = native `Saf.deleteFile` xóa file `_print/` + xóa companion. Home hiện khối "🖨 Đi in (N)" chỉ khi N≥1.

**Tech Stack:** Capacitor 8 + Ionic React + Vite + TypeScript (`verbatimModuleSyntax` ON → type-only imports dùng `import type`). Native plugin Java `Saf` (SAF DocumentFile). Test: vitest (`npm test`). Build/deploy: `npm run build && npx cap sync android && (cd android && ./gradlew assembleDebug)` rồi `adb install -r`.

**Ràng buộc nền (đã verify ở milestone trước):**
- `Saf.writeFile` ghi `.json` qua SAF đáng tin + sync (đã chứng minh bởi reading-state `_reading-<id>.json`). Companion `.print.json` dùng đúng cơ chế này — KHÔNG dính bug Samsung `.tmp` (bug đó chỉ ở `copyToDir` binary office docs).
- `Saf.copyToDir` đã dedup `(k)` trước đuôi + mime đúng.
- Foreground refresh (`@capacitor/app` resume) + `khoEvents` đã có; khối mới chỉ cần hook vào `reload()` của Home.
- Worker chỉ xử `_inbox/`, không đụng `.print.json` / `_print/` — KHÔNG cần đổi worker.

---

## File Structure

**Create:**
- `src/print/printName.ts` — helper thuần đặt tên (companion + tên trong `_print/` + match "đã gửi"). Có test.
- `src/print/printName.test.ts` — unit test cho printName.
- `src/print/printRepo.ts` — thao tác SAF: set/clear cờ, scan cờ toàn kho, đếm, gom vào `_print/`, đánh dấu xong. Không unit test (cần SAF thật — verify trên máy, theo pattern `inboxRepo.ts`/`reading/store.ts`).
- `src/components/PrintFlagButton.tsx` — nút tick "cần in" (icon máy in) dùng chung ở FolderPage + ViewerPage.
- `src/pages/PrintPage.tsx` — màn "Đi in" (danh sách cần in gom theo môn + nút Gom + tick "xong").

**Modify:**
- `android/app/src/main/java/com/gulibrary/app/SafPlugin.java` — thêm `deleteFile`.
- `src/plugins/saf.ts` — thêm `deleteFile` vào interface.
- `src/storage/types.ts` — `Document.printFlagged: boolean`.
- `src/storage/classify.ts` — bỏ qua `.print.json`, gắn `printFlagged`.
- `src/storage/classify.test.ts` — test skip + printFlagged.
- `src/pages/FolderPage.tsx` — nút tick mỗi dòng tài liệu.
- `src/pages/ViewerPage.tsx` — nút tick ở header.
- `src/pages/HomePage.tsx` — khối "🖨 Đi in (N)" giữa "Đang đọc dở" và "Môn học".
- `src/App.tsx` — route `/print`.
- `CHANGELOG.md`, `package.json` (→ 0.10.0), file memory.

---

## Task 1: Native `Saf.deleteFile` + interface

**Files:**
- Modify: `android/app/src/main/java/com/gulibrary/app/SafPlugin.java` (thêm method trước dòng `}` cuối class, sau `writeFile`)
- Modify: `src/plugins/saf.ts:9-20`

- [ ] **Step 1: Thêm method `deleteFile` vào SafPlugin.java**

Chèn ngay sau method `writeFile` (trước dấu `}` đóng class, dòng ~245):

```java
    // Xóa một file theo document-URI (dùng cho dọn _print/ + xóa companion .print.json).
    @PluginMethod
    public void deleteFile(PluginCall call) {
        String uriStr = call.getString("uri");
        if (uriStr == null) { call.reject("uri required"); return; }
        try {
            boolean ok = android.provider.DocumentsContract.deleteDocument(
                getContext().getContentResolver(), android.net.Uri.parse(uriStr));
            if (!ok) { call.reject("delete returned false"); return; }
            call.resolve(new com.getcapacitor.JSObject());
        } catch (Exception e) { call.reject("delete failed: " + e.getMessage()); }
    }
```

- [ ] **Step 2: Thêm `deleteFile` vào interface SafPlugin (saf.ts)**

Trong `src/plugins/saf.ts`, thêm dòng vào interface `SafPlugin` (sau `writeFile`):

```ts
  writeFile(options: { dirUri: string; name: string; content: string }): Promise<{ uri: string }>;
  deleteFile(options: { uri: string }): Promise<void>;
```

- [ ] **Step 3: Kiểm typecheck/build web**

Run: `npm run build`
Expected: PASS (tsc + vite build không lỗi).

- [ ] **Step 4: Commit**

```bash
git add android/app/src/main/java/com/gulibrary/app/SafPlugin.java src/plugins/saf.ts
git commit -m "feat(m9): native Saf.deleteFile (DocumentsContract.deleteDocument)"
```

---

## Task 2: `printName.ts` — helper đặt tên thuần (TDD)

**Files:**
- Create: `src/print/printName.ts`
- Test: `src/print/printName.test.ts`

- [ ] **Step 1: Viết test thất bại**

Tạo `src/print/printName.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  PRINT_FLAG_SUFFIX, printFlagName, isPrintFlag, baseFromFlag,
  printedNameFor, isSentMatch,
} from './printName';

describe('printName', () => {
  it('companion name = base + .print.json', () => {
    expect(printFlagName('luat')).toBe('luat.print.json');
    expect(PRINT_FLAG_SUFFIX).toBe('.print.json');
  });

  it('isPrintFlag nhận diện companion', () => {
    expect(isPrintFlag('luat.print.json')).toBe(true);
    expect(isPrintFlag('luat.json')).toBe(false);
    expect(isPrintFlag('luat.pdf')).toBe(false);
  });

  it('baseFromFlag lột đuôi .print.json', () => {
    expect(baseFromFlag('slide-buoi-1.print.json')).toBe('slide-buoi-1');
  });

  it('printedNameFor gắn tiền tố môn', () => {
    expect(printedNameFor('Tố tụng Hình sự', 'slide-buoi-1'))
      .toBe('[Tố tụng Hình sự] slide-buoi-1.pdf');
  });

  it('isSentMatch khớp tên đúng + biến thể dedup (k)', () => {
    expect(isSentMatch('[Hiến pháp] luat.pdf', 'Hiến pháp', 'luat')).toBe(true);
    expect(isSentMatch('[Hiến pháp] luat (1).pdf', 'Hiến pháp', 'luat')).toBe(true);
    expect(isSentMatch('[Hiến pháp] luat.pdf', 'Dân sự', 'luat')).toBe(false);
    expect(isSentMatch('[Hiến pháp] luat-2.pdf', 'Hiến pháp', 'luat')).toBe(false);
    expect(isSentMatch('[Hiến pháp] luat.json', 'Hiến pháp', 'luat')).toBe(false);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run src/print/printName.test.ts`
Expected: FAIL — "Failed to resolve import './printName'".

- [ ] **Step 3: Viết `src/print/printName.ts`**

```ts
export const PRINT_FLAG_SUFFIX = '.print.json';

// Tên file companion cờ "cần in", đặt cạnh cặp pdf+json trong folder môn.
export function printFlagName(base: string): string {
  return `${base}${PRINT_FLAG_SUFFIX}`;
}

export function isPrintFlag(name: string): boolean {
  return name.endsWith(PRINT_FLAG_SUFFIX);
}

export function baseFromFlag(name: string): string {
  return name.slice(0, -PRINT_FLAG_SUFFIX.length);
}

// Tên file trong _print/: tiền tố môn để chống trùng giữa các môn.
export function printedNameFor(mon: string, base: string): string {
  return `[${mon}] ${base}.pdf`;
}

// Một file trong _print/ có phải là bản đã gửi của (mon, base) không?
// Khớp tên đúng HOẶC biến thể dedup "[mon] base (k).pdf" (copyToDir chèn " (k)" trước đuôi).
export function isSentMatch(entryName: string, mon: string, base: string): boolean {
  if (!entryName.toLowerCase().endsWith('.pdf')) return false;
  if (entryName === printedNameFor(mon, base)) return true;
  return entryName.startsWith(`[${mon}] ${base} (`);
}
```

- [ ] **Step 4: Chạy test, xác nhận PASS**

Run: `npx vitest run src/print/printName.test.ts`
Expected: PASS (5 test).

- [ ] **Step 5: Commit**

```bash
git add src/print/printName.ts src/print/printName.test.ts
git commit -m "feat(m9): printName helpers (companion + _print naming + sent-match) + tests"
```

---

## Task 3: `classify` bỏ qua `.print.json` + gắn `printFlagged` (TDD)

**Files:**
- Modify: `src/storage/types.ts:3-7`
- Modify: `src/storage/classify.ts`
- Test: `src/storage/classify.test.ts`

- [ ] **Step 1: Thêm test thất bại vào classify.test.ts**

Thêm vào cuối `describe('classifyEntries', ...)` trong `src/storage/classify.test.ts` (trước dấu `});` đóng describe):

```ts
  it('skips <base>.print.json — không thành document hay pending', () => {
    const r = classifyEntries([
      e('luat.pdf', false), e('luat.json', false), e('luat.print.json', false),
    ]);
    expect(r.documents).toHaveLength(1);
    expect(r.pending).toHaveLength(0);
  });

  it('gắn printFlagged=true cho document có companion .print.json', () => {
    const r = classifyEntries([
      e('luat.pdf', false), e('luat.json', false), e('luat.print.json', false),
    ]);
    expect(r.documents[0].printFlagged).toBe(true);
  });

  it('printFlagged=false khi không có companion', () => {
    const r = classifyEntries([e('luat.pdf', false), e('luat.json', false)]);
    expect(r.documents[0].printFlagged).toBe(false);
  });
```

- [ ] **Step 2: Chạy test, xác nhận FAIL**

Run: `npx vitest run src/storage/classify.test.ts`
Expected: FAIL — `printFlagged` undefined / `.print.json` bị nhận nhầm thành pending.

- [ ] **Step 3: Thêm `printFlagged` vào type `Document`**

Trong `src/storage/types.ts`, sửa interface `Document`:

```ts
export interface Document {
  name: string;
  pdfUri: string;
  jsonUri: string;
  printFlagged: boolean;
}
```

- [ ] **Step 4: Sửa `classify.ts` bỏ qua companion + set printFlagged**

Trong `src/storage/classify.ts`:

(a) Khai báo set sau dòng `const byBase = new Map(...)` (dòng ~12):

```ts
  const printFlagged = new Set<string>();
```

(b) Trong vòng lặp `for (const en of entries)`, NGAY SAU khối `if (en.isDirectory) { ... continue; }` và TRƯỚC `const name = en.name;`... thực tế chèn sau `const name = en.name;` và trước hai dòng skip `_`/`.`:

```ts
    const name = en.name;
    if (name.endsWith('.print.json')) { printFlagged.add(name.slice(0, -'.print.json'.length)); continue; }
    if (name.startsWith('_')) continue;
    if (name.startsWith('.')) continue;
```

(c) Sửa dòng push document (dòng ~37) để thêm cờ:

```ts
      documents.push({ name: base, pdfUri: slot.pdf.uri, jsonUri: slot.json.uri, printFlagged: printFlagged.has(base) });
```

- [ ] **Step 5: Chạy toàn bộ test, xác nhận PASS**

Run: `npm test`
Expected: PASS toàn bộ (classify.test.ts gồm 3 test mới; không vỡ test cũ).

- [ ] **Step 6: Commit**

```bash
git add src/storage/types.ts src/storage/classify.ts src/storage/classify.test.ts
git commit -m "feat(m9): classify skips .print.json + sets Document.printFlagged"
```

---

## Task 4: `printRepo.ts` — thao tác SAF (cờ + scan + gom + dọn)

**Files:**
- Create: `src/print/printRepo.ts`

> Module này gọi SAF thật → không unit test (theo pattern `inboxRepo.ts`). Cổng kiểm = `npm run build` (typecheck) + verify trên máy ở Task 9.

- [ ] **Step 1: Viết `src/print/printRepo.ts`**

```ts
import { Saf } from '../plugins/saf';
import { getRootUri } from '../storage/repo';
import { relPathFromUris } from '../reading/paths';
import { classifyEntries } from '../storage/classify';
import { emitKhoChanged } from '../lib/khoEvents';
import { printFlagName, printedNameFor, isSentMatch } from './printName';

const PRINT_DIR = '_print';

// Suy folder chứa tài liệu (folder môn/chương) + base name từ document-URI (pdf).
async function resolveDocFolder(docUri: string): Promise<{ folderUri: string; base: string } | null> {
  const root = await getRootUri(); if (!root) return null;
  const rel = relPathFromUris(root, docUri); if (!rel) return null;
  const segs = rel.split('/').filter(Boolean);
  const fileSeg = segs.pop(); if (!fileSeg) return null;
  const base = fileSeg.replace(/\.[^.]+$/, '');
  let curUri = root;
  for (const s of segs) {
    const { entries } = await Saf.listFolder({ uri: curUri });
    const hit = entries.find((en) => en.isDirectory && en.name === s);
    if (!hit) return null;
    curUri = hit.uri;
  }
  return { folderUri: curUri, base };
}

// Tick "cần in": ghi companion <base>.print.json cạnh cặp.
export async function setPrintFlag(docUri: string): Promise<void> {
  const ctx = await resolveDocFolder(docUri);
  if (!ctx) throw new Error('Không tìm thấy thư mục tài liệu');
  await Saf.writeFile({
    dirUri: ctx.folderUri,
    name: printFlagName(ctx.base),
    content: JSON.stringify({ v: 1, flaggedAt: Date.now() }),
  });
  emitKhoChanged();
}

// Untick: xóa companion.
export async function clearPrintFlag(docUri: string): Promise<void> {
  const ctx = await resolveDocFolder(docUri); if (!ctx) return;
  const { entries } = await Saf.listFolder({ uri: ctx.folderUri });
  const f = entries.find((en) => !en.isDirectory && en.name === printFlagName(ctx.base));
  if (f) await Saf.deleteFile({ uri: f.uri });
  emitKhoChanged();
}

// Trạng thái cờ hiện tại (dùng ở Viewer lúc mở).
export async function isPrintFlagged(docUri: string): Promise<boolean> {
  const ctx = await resolveDocFolder(docUri); if (!ctx) return false;
  const { entries } = await Saf.listFolder({ uri: ctx.folderUri });
  return entries.some((en) => !en.isDirectory && en.name === printFlagName(ctx.base));
}

interface FlatItem { monName: string; name: string; pdfUri: string; folderUri: string; }

// Đệ quy: gom mọi document đang cờ "cần in" trong cây của một môn.
async function walkFlagged(folderUri: string, monName: string, out: FlatItem[]): Promise<void> {
  const { entries } = await Saf.listFolder({ uri: folderUri });
  const listing = classifyEntries(entries);
  for (const d of listing.documents) {
    if (d.printFlagged) out.push({ monName, name: d.name, pdfUri: d.pdfUri, folderUri });
  }
  for (const f of listing.folders) await walkFlagged(f.uri, monName, out);
}

async function listMonDirs(root: string): Promise<{ name: string; uri: string }[]> {
  const { entries } = await Saf.listFolder({ uri: root });
  return entries
    .filter((e) => e.isDirectory && !e.name.startsWith('.') && e.name !== '_inbox' && e.name !== PRINT_DIR)
    .map((e) => ({ name: e.name, uri: e.uri }));
}

async function scanFlagged(root: string): Promise<FlatItem[]> {
  const flat: FlatItem[] = [];
  for (const d of await listMonDirs(root)) await walkFlagged(d.uri, d.name, flat);
  return flat;
}

// Số tài liệu đang cờ "cần in" (cho khối Home).
export async function countPrintFlagged(): Promise<number> {
  const root = await getRootUri(); if (!root) return 0;
  return (await scanFlagged(root)).length;
}

// Liệt kê _print/ (file con). Không tồn tại → [].
async function listPrintEntries(root: string): Promise<{ name: string; uri: string }[]> {
  try {
    const { uri } = await Saf.ensureDir({ parentUri: root, name: PRINT_DIR });
    const { entries } = await Saf.listFolder({ uri });
    return entries.filter((e) => !e.isDirectory).map((e) => ({ name: e.name, uri: e.uri }));
  } catch { return []; }
}

export interface PrintRow {
  monName: string;
  name: string;
  pdfUri: string;
  folderUri: string;   // chứa companion (để clear khi "xong")
  sent: boolean;       // đã có trong _print/
  printUris: string[]; // file khớp trong _print/ (để xóa khi "xong")
}

// Danh sách cho màn "Đi in": cờ + trạng thái đã gửi (suy từ _print/).
export async function listPrintRows(): Promise<PrintRow[]> {
  const root = await getRootUri(); if (!root) return [];
  const flat = await scanFlagged(root);
  const printEntries = await listPrintEntries(root);
  return flat.map((it) => {
    const matches = printEntries.filter((p) => isSentMatch(p.name, it.monName, it.name));
    return { ...it, sent: matches.length > 0, printUris: matches.map((m) => m.uri) };
  });
}

// Gom: copy mọi cờ chưa-gửi vào _print/ (giữ gốc). Trả số file đã copy.
export async function gomToPrint(): Promise<number> {
  const root = await getRootUri(); if (!root) throw new Error('Chưa chọn folder kho');
  const toCopy = (await listPrintRows()).filter((r) => !r.sent);
  if (toCopy.length === 0) return 0;
  const { uri: printUri } = await Saf.ensureDir({ parentUri: root, name: PRINT_DIR });
  for (const r of toCopy) {
    await Saf.copyToDir({ srcUri: r.pdfUri, dirUri: printUri, name: printedNameFor(r.monName, r.name) });
  }
  emitKhoChanged();
  return toCopy.length;
}

// "Xong": xóa file khỏi _print/ + xóa companion (clear cờ).
export async function markPrinted(row: PrintRow): Promise<void> {
  for (const u of row.printUris) await Saf.deleteFile({ uri: u });
  const { entries } = await Saf.listFolder({ uri: row.folderUri });
  const f = entries.find((en) => !en.isDirectory && en.name === printFlagName(row.name));
  if (f) await Saf.deleteFile({ uri: f.uri });
  emitKhoChanged();
}
```

- [ ] **Step 2: Kiểm typecheck/build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/print/printRepo.ts
git commit -m "feat(m9): printRepo — flag toggle, kho scan, gom _print/, mark done"
```

---

## Task 5: `PrintFlagButton` + tích hợp FolderPage

**Files:**
- Create: `src/components/PrintFlagButton.tsx`
- Modify: `src/pages/FolderPage.tsx`

- [ ] **Step 1: Viết `src/components/PrintFlagButton.tsx`**

```tsx
import { useState } from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import { print, printOutline } from 'ionicons/icons';
import { setPrintFlag, clearPrintFlag } from '../print/printRepo';

// Nút tick "cần in" cho một tài liệu (đã có PDF). flagged = trạng thái hiện tại.
// onChanged() để caller reload sau khi toggle. stopPropagation: không kích hoạt mở viewer.
export default function PrintFlagButton({
  docUri, flagged, onChanged,
}: { docUri: string; flagged: boolean; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const toggle = async (ev: React.MouseEvent) => {
    ev.stopPropagation();
    if (busy) return;
    setBusy(true);
    try {
      if (flagged) await clearPrintFlag(docUri);
      else await setPrintFlag(docUri);
      onChanged();
    } finally { setBusy(false); }
  };
  return (
    <IonButton
      fill="clear"
      onClick={toggle}
      disabled={busy}
      aria-label={flagged ? 'Bỏ cần in' : 'Đánh dấu cần in'}
      aria-pressed={flagged}
    >
      <IonIcon
        icon={flagged ? print : printOutline}
        style={{ color: flagged ? 'var(--gu-brown)' : 'var(--gu-grey)' }}
      />
    </IonButton>
  );
}
```

- [ ] **Step 2: Thêm nút vào dòng tài liệu trong FolderPage**

Trong `src/pages/FolderPage.tsx`:

(a) Thêm import sau dòng import `CreateFolderModal` (dòng ~11):

```ts
import PrintFlagButton from '../components/PrintFlagButton';
```

(b) Sửa khối render document (dòng ~60-65) thành:

```tsx
            {listing.documents.map((d) => (
              <IonItem key={d.pdfUri} button onClick={() => history.push(`/viewer/${encodeUriParam(d.pdfUri)}`)}>
                <IonIcon icon={documentTextOutline} slot="start" />
                <IonLabel className="gu-serif">{d.name}</IonLabel>
                <div slot="end" onClick={(e) => e.stopPropagation()}>
                  <PrintFlagButton docUri={d.pdfUri} flagged={d.printFlagged} onChanged={loadListing} />
                </div>
              </IonItem>
            ))}
```

- [ ] **Step 3: Kiểm build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/PrintFlagButton.tsx src/pages/FolderPage.tsx
git commit -m "feat(m9): PrintFlagButton + tick can in tren dong tai lieu (FolderPage)"
```

---

## Task 6: Tick "cần in" ở ViewerPage

**Files:**
- Modify: `src/pages/ViewerPage.tsx`

- [ ] **Step 1: Thêm state + load cờ + nút header**

Trong `src/pages/ViewerPage.tsx`:

(a) Thêm import:

```ts
import { isPrintFlagged } from '../print/printRepo';
import PrintFlagButton from '../components/PrintFlagButton';
```

(b) Thêm state (cạnh các `useState` khác, sau dòng `const [total, setTotal] = useState(0);`):

```ts
  const [flagged, setFlagged] = useState(false);
```

(c) Trong `useEffect` load (sau `setBytes(await readPdfBytes(docUri));` bên trong `try`):

```ts
        setFlagged(await isPrintFlagged(docUri));
```

(d) Thêm nút vào `IonToolbar` header — thêm `IonButtons slot="end"` sau `IonTitle`:

```tsx
          <IonTitle className="gu-serif" style={{ fontSize: 16, fontWeight: 700, color: 'var(--gu-brown-deep)' }}>
            {name}
          </IonTitle>
          <IonButtons slot="end">
            <PrintFlagButton docUri={docUri} flagged={flagged} onChanged={() => setFlagged((v) => !v)} />
          </IonButtons>
```

(Lưu ý: `IonButtons` đã được import sẵn ở ViewerPage. `onChanged` lật state local — đủ vì toggle thành công mới gọi onChanged.)

- [ ] **Step 2: Kiểm build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/pages/ViewerPage.tsx
git commit -m "feat(m9): tick can in tren header Viewer"
```

---

## Task 7: Khối "🖨 Đi in (N)" trên Home

**Files:**
- Modify: `src/pages/HomePage.tsx`

- [ ] **Step 1: Thêm count + khối**

Trong `src/pages/HomePage.tsx`:

(a) Thêm import:

```ts
import { countPrintFlagged } from '../print/printRepo';
```

(b) Thêm state (cạnh các state khác, sau `const [createMonOpen, ...]`):

```ts
  const [printCount, setPrintCount] = useState(0);
```

(c) Trong `reload()`, thêm (sau dòng set inboxMap):

```ts
    try { setPrintCount(await countPrintFlagged()); } catch { setPrintCount(0); }
```

(d) Thêm khối render GIỮA khối "Đang đọc dở" (kết thúc ở dòng `)}` sau ContinueReadingCard) và khối `{hasRoot === false && ...}`:

```tsx
        {printCount > 0 && (
          <div
            onClick={() => history.push('/print')}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, background: 'var(--gu-paper-2)',
              borderRadius: 12, padding: 14, margin: '16px 0 0', cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 20 }}>🖨</span>
            <span style={{ fontFamily: 'var(--gu-serif)', fontWeight: 700, color: 'var(--gu-brown-deep)', flex: 1 }}>
              Đi in
            </span>
            <span style={{
              background: 'var(--gu-brown)', color: '#fff', borderRadius: 999,
              padding: '2px 10px', fontSize: 13, whiteSpace: 'nowrap',
            }}>
              {printCount}
            </span>
          </div>
        )}
```

- [ ] **Step 2: Kiểm build**

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/pages/HomePage.tsx
git commit -m "feat(m9): khoi 'Di in (N)' tren Home (an khi rong, giua doc-do va mon)"
```

---

## Task 8: Màn "Đi in" (PrintPage) + route

**Files:**
- Create: `src/pages/PrintPage.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Viết `src/pages/PrintPage.tsx`**

```tsx
import { useCallback, useEffect, useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonContent,
  IonList, IonItem, IonLabel, IonBadge, IonButton, IonFooter,
} from '@ionic/react';
import { App } from '@capacitor/app';
import { listPrintRows, gomToPrint, markPrinted, type PrintRow } from '../print/printRepo';
import { onKhoChanged } from '../lib/khoEvents';

export default function PrintPage() {
  const [rows, setRows] = useState<PrintRow[]>([]);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => {
    listPrintRows().then(setRows).catch(() => setRows([]));
  }, []);

  useEffect(() => {
    reload();
    const off = onKhoChanged(() => reload());
    const sub = App.addListener('resume', () => reload());
    return () => { off(); sub.then((h) => h.remove()); };
  }, [reload]);

  // Gom theo môn, giữ thứ tự xuất hiện.
  const byMon = new Map<string, PrintRow[]>();
  for (const r of rows) {
    const arr = byMon.get(r.monName) ?? [];
    arr.push(r);
    byMon.set(r.monName, arr);
  }

  const pendingCopy = rows.filter((r) => !r.sent).length;

  const doGom = async () => {
    setBusy(true);
    try { await gomToPrint(); reload(); } finally { setBusy(false); }
  };

  const doDone = async (row: PrintRow) => {
    setBusy(true);
    try { await markPrinted(row); reload(); } finally { setBusy(false); }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/home" /></IonButtons>
          <IonTitle className="gu-title">Đi in</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {rows.length === 0 && (
          <p style={{ color: 'var(--gu-grey)' }}>Chưa có tài liệu nào cần in.</p>
        )}
        {[...byMon.entries()].map(([mon, list]) => (
          <div key={mon} style={{ marginBottom: 16 }}>
            <h2 className="gu-title" style={{ fontSize: 16, margin: '0 0 4px', color: 'var(--gu-brown)' }}>{mon}</h2>
            <IonList>
              {list.map((r) => (
                <IonItem key={r.pdfUri}>
                  <IonLabel className="gu-serif">{r.name}</IonLabel>
                  {r.sent && (
                    <IonBadge slot="end" color="success" style={{ marginRight: 8 }}>đã gửi đi in</IonBadge>
                  )}
                  {r.sent && (
                    <IonButton slot="end" size="small" fill="outline" disabled={busy}
                      style={{ textTransform: 'none' }} onClick={() => doDone(r)}>
                      Xong
                    </IonButton>
                  )}
                </IonItem>
              ))}
            </IonList>
          </div>
        ))}
      </IonContent>
      {pendingCopy > 0 && (
        <IonFooter>
          <IonToolbar>
            <div style={{ padding: '0 12px' }}>
              <IonButton expand="block" disabled={busy} style={{ textTransform: 'none' }} onClick={doGom}>
                {busy ? 'Đang gom…' : `Gom vào _print/ (${pendingCopy})`}
              </IonButton>
            </div>
          </IonToolbar>
        </IonFooter>
      )}
    </IonPage>
  );
}
```

- [ ] **Step 2: Đăng ký route `/print` trong App.tsx**

Trong `src/App.tsx`:

(a) Thêm import (cạnh các import page khác):

```ts
import PrintPage from './pages/PrintPage';
```

(b) Thêm `<Route>` trong `IonRouterOutlet` (sau route `/settings`):

```tsx
            <Route exact path="/print" component={PrintPage} />
```

- [ ] **Step 3: Kiểm build + test**

Run: `npm run build && npm test`
Expected: PASS (App.test.tsx smoke vẫn xanh — PrintPage import tĩnh không kéo react-pdf).

- [ ] **Step 4: Commit**

```bash
git add src/pages/PrintPage.tsx src/App.tsx
git commit -m "feat(m9): man 'Di in' (gom theo mon + nut Gom + tick Xong) + route /print"
```

---

## Task 9: Build, deploy, verify trên máy thật

> Không có cổng tự động cho SAF/Ionic UI — đây là cổng nghiệm thu chính. Chạy qua checklist của build-brief trên ít nhất 2 máy (Z Flip 4 SM-F721B + Z Fold 3 SM-F926B) để xác nhận sync cờ.

- [ ] **Step 1: Build APK + cài**

```bash
npm run build && npx cap sync android && (cd android && ./gradlew assembleDebug)
adb devices
adb -s <serial> install -r android/app/build/outputs/apk/debug/app-debug.apk
```

- [ ] **Step 2: Chạy checklist nghiệm thu (đánh dấu khi đạt)**

  - [ ] Tick "cần in" ở Viewer → companion `<base>.print.json` xuất hiện cạnh cặp (kiểm bằng `adb shell run-as`/file manager hoặc gián tiếp qua khối Home); Home hiện "Đi in (1)".
  - [ ] Tick "cần in" ở dòng tài liệu trong môn (FolderPage) → tương tự, không cần mở tài liệu.
  - [ ] Untick → companion biến mất, N giảm; về 0 thì khối "Đi in" ẩn.
  - [ ] **Sync cờ:** tick ở Z Flip → sau sync, Z Fold thấy cờ + khối "Đi in (N)" đúng.
  - [ ] Tap khối "Đi in" → liệt kê đúng file cần in, gom theo môn.
  - [ ] Bấm "Gom" → file vào `_print/`, tên `[<môn>] <tên>.pdf`; **bản gốc trong môn còn nguyên**.
  - [ ] 2 môn có file trùng tên → trong `_print/` không đè (tiền tố môn khác).
  - [ ] File đã ở `_print/` hiện "đã gửi đi in"; file chưa gom thì không.
  - [ ] Tick "Xong" → file rời `_print/` + companion xóa (cờ clear), khối "Đi in" cập nhật; lệnh xóa lan đúng qua Syncthing (kiểm máy kia).
  - [ ] Tài liệu ⏳ (pending, chưa có cặp pdf+json) → không có nút tick (dòng disabled).
  - [ ] `.print.json` KHÔNG lọt vào danh sách tài liệu của môn.
  - [ ] Về foreground (sau khi máy kia đổi) → khối "Đi in" + trạng thái "đã gửi" cập nhật không cần tắt-mở app.

- [ ] **Step 3: Nếu có lỗi → debug (systematic-debugging), sửa, lặp lại Step 1-2. Nếu pass hết → tiếp Task 10.**

---

## Task 10: Version bump 0.10.0 + CHANGELOG + memory

**Files:**
- Modify: `package.json`
- Modify: `CHANGELOG.md`
- Modify: file memory `gu-library-m1-toolchain.md` + `MEMORY.md`

- [ ] **Step 1: Bump version**

Trong `package.json`: `"version": "0.9.0"` → `"version": "0.10.0"`.

- [ ] **Step 2: Thêm mục CHANGELOG**

Chèn sau dòng `## ... ` đầu tiên (trên `## [0.9.0]`):

```markdown
## [0.10.0] — 2026-06-30 — M9: Print outbox (mức C) — gom tài liệu đi in
### Added
- **Cờ "cần in" per-file:** tick ở Viewer (header) + dòng tài liệu trong môn → companion `<base>.print.json` cạnh cặp pdf+json (app-owned, Syncthing sync, KHÔNG đụng sidecar). Untick → xóa companion. `classify` bỏ qua `.print.json` + gắn `Document.printFlagged`.
- **Khối "🖨 Đi in (N)" trên Home** giữa "Đang đọc dở" và "Môn học", chỉ hiện khi N≥1 (N = số file cờ "cần in"), cập nhật qua `khoEvents` + foreground resume.
- **Màn "Đi in":** liệt kê file cần in gom theo môn; nút **Gom vào `_print/`** copy (giữ gốc) với tên tiền tố môn `[<môn>] <tên>.pdf` (dedup `(k)` trước đuôi); trạng thái **"đã gửi đi in"** suy từ hiện diện trong `_print/`; tick **"Xong"** xóa file `_print/` + clear cờ.
- Native `Saf.deleteFile` (DocumentsContract.deleteDocument); `printRepo` (set/clear/scan/gom/markPrinted); `printName` helpers (có test).
- **Khép Phase 1.** Mức A (mini PC tự đẩy `_print/` lên Drive) để Phase 3 — không đập lại C.
```

- [ ] **Step 3: Cập nhật memory**

Cập nhật `gu-library-m1-toolchain.md`: M9 DONE (print outbox, `.print.json` companion, `_print/`, native `deleteFile`), version v0.10.0, Phase 1 khép. Cập nhật dòng tương ứng trong `MEMORY.md`.

- [ ] **Step 4: Commit + push**

```bash
git add package.json CHANGELOG.md
git commit -m "chore(m9): release v0.10.0 — Print outbox (mức C), khép Phase 1 — verified on device"
git push
```

---

## Self-Review (đã chạy khi viết plan)

**Spec coverage (build-brief checklist):**
- Cờ companion per-file `.print.json` có sync, không sidecar → Task 2 (đặt tên) + 4 (ghi/xóa qua writeFile/deleteFile). ✅
- Chỉ đẻ companion cho file được tick, untick xóa → Task 4 set/clear. ✅
- App bỏ qua `.print.json` khi liệt kê → Task 3 classify skip. ✅
- Tick ở Viewer + danh sách tài liệu trong môn → Task 5 (FolderPage) + Task 6 (Viewer). ✅
- Khối "Đi in (N)" Home, ẩn khi rỗng, giữa đọc-dở và môn → Task 7. ✅
- Màn "Đi in" gom theo môn + nút Gom → Task 8. ✅
- Gom = copy, giữ gốc, tiền tố môn, dedup `(k)` → Task 4 `gomToPrint` + `copyToDir` (dedup sẵn). ✅
- "Đã gửi đi in" derive từ `_print/`, không state thứ hai → Task 4 `isSentMatch`. ✅
- Tick "xong" → xóa file `_print/` + clear cờ, không tự dọn → Task 4 `markPrinted` + Task 8 nút Xong. ✅
- Tài liệu ⏳ không tick được → chỉ `Document` (pdf+json) có nút tick; pending row disabled. ✅
- Mức C không đụng Drive → không có code Drive. ✅
- Rủi ro xóa qua SAF + sync, foreground refresh → Task 9 verify (native deleteFile + resume hook). ✅

**Placeholder scan:** không có TBD/“handle edge cases”/“tests for the above” — mọi step có code/đường dẫn/lệnh cụ thể. ✅

**Type consistency:** `printFlagName`/`printedNameFor`/`isSentMatch`/`isPrintFlag`/`baseFromFlag` (printName.ts) dùng nhất quán ở printRepo.ts; `PrintRow` fields (`monName/name/pdfUri/folderUri/sent/printUris`) khớp giữa printRepo (Task 4) và PrintPage (Task 8); `Document.printFlagged` định nghĩa Task 3, dùng Task 5/printRepo. `Saf.deleteFile` signature `{uri}` khớp Java + interface + caller. ✅
