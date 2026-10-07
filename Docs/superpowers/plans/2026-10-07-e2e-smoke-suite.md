# Bộ test khói e2e + khám phá — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gói `e2e/` trong repo app chạy được bằng một lệnh: 5 test khói chỉ-đọc trên máy Android thật + lệnh khám phá có lưới an toàn kho, đã thử trên v1.41.0.

**Architecture:** Gói npm riêng `e2e/` (tester-army/e2e + agent-device, model qua OpenRouter). Logic thuần (đọc nhãn, kiểm môi trường, dấu vân tay kho) nằm ở `e2e/lib/*.ts`, có unit test chạy bằng `node --test`; test e2e và script chỉ ghép I/O quanh chúng. App không đổi.

**Tech Stack:** Node 24 (chạy `.ts` trực tiếp), TypeScript 6.0.3, e2e 0.18.0, @e2e-dev/mobile 0.10.0, agent-device 0.21.23, @openrouter/ai-sdk-provider 3.1.0, adb.

**Spec:** `Docs/superpowers/specs/2026-10-07-e2e-smoke-suite-design.md` · spike `Docs/perf/2026-10-07-spike-e2e-agent-test.md`

## Global Constraints

- Nhánh `feat/e2e-smoke-suite` từ `main`; merge/push chỉ khi huynh bảo.
- KHÔNG sửa `src/`, `android/`, `vite.config.ts`, `tsconfig*.json` của app. Chỉ sửa ở gốc: `.gitignore`, `package.json` (thêm script `e2e`).
- `e2e/package.json`: `"type": "module"`, `"private": true`, phiên bản CHÍNH XÁC: `e2e` `0.18.0`, `@e2e-dev/mobile` `0.10.0`, `agent-device` `0.21.23`, `@openrouter/ai-sdk-provider` `3.1.0`, devDependency `typescript` `6.0.3`; `"overrides": { "agent-device": "$agent-device" }`.
- Config: máy `process.env.E2E_DEVICE ?? 'UBS1'` (TÊN = trường `model` của `adb devices -l`); model `process.env.E2E_MODEL ?? 'anthropic/claude-haiku-4.5'`; agent `maxSteps` 10, `maxModelCalls` 10; `workers` 1, `retries` 0, `cache` `'read-write'`, `timeout` 300000, `actionTimeout` 60000, `assertionTimeout` 15000.
- Mọi lần chạy e2e đặt `E2E_TELEMETRY_DISABLED=1`. Key chỉ từ `OPENROUTER_API_KEY` (repo công khai; e2e không đọc `.env`).
- Spec §4.1 ghi script `.mjs`; plan dùng `.ts` cho cả `lib/` lẫn `scripts/` (Node 24 chạy thẳng `.ts`, import ghi rõ đuôi `.ts`) để unit test + `tsc` chung một chỗ.
- Unit test của `e2e/lib` đặt tên `*.unit.ts` trong `e2e/unit/` (vitest gốc chỉ bắt `*.test.*`/`*.spec.*` — KHÔNG được để file `*.test.ts` trong `e2e/`).
- Câu tra không chứa chữ "u". Không `app.clearState()`, `device.setPermission`, `device.installApp()`, `--test-ime`. Không chạy trên máy Gú / kho Prod.
- Code, comment, tên test, commit: tiếng Anh. `e2e/README.md` và `e2e/charters/*.md`: tiếng Việt.
- Mỗi task: `npm --prefix e2e run unit` + `npm --prefix e2e run typecheck` xanh; `npm test` + `npm run build` của app vẫn xanh; `npx eslint .` ở gốc không thêm lỗi so với `main` (23). Lệnh dùng đường dẫn tuyệt đối.

## Review Focus

1. **App bị test trước để lại ở trạng thái bất kỳ** (sheet mở, đang chia đôi, đang ở Viewer) → test sau vẫn tự về được tab cần → kiểm ở Task 5 (chạy cả bộ khi app đang chia đôi).
2. **Kho QA đổi khiến "hop dong" hết kết quả** → test trượt với thông báo rõ "câu tra mẫu không còn kết quả" chứ không phải hết giờ locator → unit test ở Task 1 (`readCardFrom(['Tạo môn mới'])` ném lỗi đó).
3. **Thiếu key / máy rút cáp / app chưa cài** → preflight dừng sớm, báo tiếng Việt chỉ cách sửa → unit test ở Task 1.
4. **Agent khám phá ghi xuống kho** → dấu vân tay trước/sau khác nhau và liệt kê đúng file thêm/xoá/đổi cỡ → unit test ở Task 6.
5. **Bàn phím Gboard che thẻ/tab sau khi điền ô tìm** → helper `search` ẩn bàn phím trước khi bấm → kiểm ở Task 3 (bấm "Xem cả" của thẻ thứ hai, nằm thấp trên màn).

---

### Task 1: Dựng gói `e2e/` + logic thuần (đọc nhãn, preflight)

**Files:**
- Create: `e2e/package.json`, `e2e/package-lock.json`, `e2e/tsconfig.json`, `e2e/e2e.config.ts`, `e2e/lib/parse.ts`, `e2e/lib/preflight.ts`, `e2e/scripts/preflight.ts`, `e2e/unit/parse.unit.ts`, `e2e/unit/preflight.unit.ts`
- Modify: `.gitignore` (thêm `e2e/node_modules/`, `e2e/.e2e/`), `package.json` gốc (script `"e2e": "npm --prefix e2e test"`)

**Interfaces:**
- Produces (`e2e/lib/parse.ts`):
  - `parseXemCa(label: string): { count: number; name: string } | null` — `"Xem cả 1.489 đoạn trong X"` → `{ count: 1489, name: 'X' }` (dấu chấm ngăn nghìn).
  - `parseOpenAtPage(label: string): { name: string; page: number } | null` — `"Mở X tại trang 24"`.
  - `parsePageFooter(text: string): { page: number; total: number } | null` — `"Trang 24 / 38"`.
  - `readCardFrom(labels: string[], index = 0): { name: string; page: number; count: number }` — từ danh sách nhãn nút theo thứ tự màn hình, ghép "Mở X tại trang P" với "Xem cả N đoạn trong X" ngay sau nó (cùng X) thành thẻ; trả thẻ thứ `index`; không đủ thẻ → `throw new Error('câu tra mẫu không còn kết quả — đổi câu tra trong tests')`.
- Produces (`e2e/lib/preflight.ts`):
  - `parseAdbDevices(out: string): { serial: string; model: string; state: string }[]`
  - `parseVersionName(dumpsys: string): string | null`
  - `preflightErrors(i: { env: Record<string, string | undefined>; devices: ReturnType<typeof parseAdbDevices>; deviceName: string; versionName: string | null }): string[]` — rỗng = qua.
- Scripts `e2e/package.json`: `unit` = `node --test unit/`, `typecheck` = `tsc -p .`, `preflight` = `node scripts/preflight.ts`, `test` = `npm run preflight && E2E_TELEMETRY_DISABLED=1 e2e run`, `doctor` = `agent-device doctor`.

- [ ] **Step 1: Tạo nhánh** `git -C /Users/lavopavden/Dev/projects/Gu-Library checkout -b feat/e2e-smoke-suite`; dựng `e2e/package.json` theo Global Constraints; `npm --prefix e2e install`; `npm --prefix e2e ls agent-device` chỉ ra 0.21.23.

- [ ] **Step 2: Viết unit test thất bại**

```ts
// e2e/unit/parse.unit.ts — node:test + node:assert/strict
test('parseXemCa reads count with thousands dot and the name', () =>
  deepEqual(parseXemCa('Xem cả 1.489 đoạn trong 91_2015_QH13_296215'), { count: 1489, name: '91_2015_QH13_296215' }));
test('parseOpenAtPage', () => deepEqual(parseOpenAtPage('Mở Hop_dong_Chuong_1_2_4 tại trang 24'), { name: 'Hop_dong_Chuong_1_2_4', page: 24 }));
test('parsePageFooter', () => deepEqual(parsePageFooter('Trang 24 / 38'), { page: 24, total: 38 }));
test('non-matching labels → null', () => equal(parseXemCa('Mở X tại trang 2'), null));
const LABELS = ['Tạo môn mới', 'Mở A tại trang 3', 'Xem cả 12 đoạn trong A', 'Mở B tại trang 1', 'Xem cả 1.004 đoạn trong B'];
test('readCardFrom pairs the first card', () => deepEqual(readCardFrom(LABELS), { name: 'A', page: 3, count: 12 }));
test('readCardFrom index 1 → second card', () => deepEqual(readCardFrom(LABELS, 1), { name: 'B', page: 1, count: 1004 }));
test('readCardFrom with no card → explicit error', () =>
  throws(() => readCardFrom(['Tạo môn mới']), /câu tra mẫu không còn kết quả/));
// e2e/unit/preflight.unit.ts
test('parseAdbDevices reads model from -l output', () =>
  deepEqual(parseAdbDevices('List of devices attached\nUBS1240902002011       device usb:20-2 product:Universal_Phone_1 model:UBS1 device:Universal_Phone_1 transport_id:6\n'),
    [{ serial: 'UBS1240902002011', model: 'UBS1', state: 'device' }]));
test('parseVersionName', () => equal(parseVersionName('    versionCode=2 minSdk=24\n    versionName=1.41.0\n'), '1.41.0'));
test('missing key → message naming OPENROUTER_API_KEY', () =>
  match(preflightErrors({ env: {}, devices: [{ serial: 's', model: 'UBS1', state: 'device' }], deviceName: 'UBS1', versionName: '1.41.0' }).join('\n'), /OPENROUTER_API_KEY/));
test('device not plugged → message naming the device', () =>
  match(preflightErrors({ env: { OPENROUTER_API_KEY: 'x' }, devices: [], deviceName: 'UBS1', versionName: null }).join('\n'), /UBS1/));
test('app missing → message', () =>
  match(preflightErrors({ env: { OPENROUTER_API_KEY: 'x' }, devices: [{ serial: 's', model: 'UBS1', state: 'device' }], deviceName: 'UBS1', versionName: null }).join('\n'), /com\.gulibrary\.app/));
test('all good → []', () =>
  deepEqual(preflightErrors({ env: { OPENROUTER_API_KEY: 'x' }, devices: [{ serial: 's', model: 'UBS1', state: 'device' }], deviceName: 'UBS1', versionName: '1.41.0' }), []));
```

- [ ] **Step 3: Chạy, xác nhận FAIL** — `npm --prefix /Users/lavopavden/Dev/projects/Gu-Library/e2e run unit` → module not found.

- [ ] **Step 4: Cài đặt** `lib/parse.ts`, `lib/preflight.ts` theo Interfaces; `scripts/preflight.ts` gọi `adb devices -l`, `adb -s <serial> shell dumpsys package com.gulibrary.app` (adb lấy từ `$ANDROID_HOME/platform-tools` hoặc PATH), in `app vX.Y.Z trên <máy>` hoặc liệt kê lỗi rồi `process.exit(1)`. `e2e.config.ts` theo Global Constraints (chưa có test e2e nào). `tsconfig.json`: `strict`, `noEmit`, `module`/`moduleResolution` `nodenext`, `allowImportingTsExtensions`, `include` `["**/*.ts"]` trừ `node_modules`, `.e2e`.

- [ ] **Step 5: Kiểm** `npm --prefix e2e run unit` PASS; `npm --prefix e2e run typecheck` PASS; `npm --prefix e2e run preflight` với UBS1 cắm + key → in `app v1.41.0 trên UBS1`; `env -u OPENROUTER_API_KEY npm --prefix e2e run preflight` → exit 1 + câu báo key. Gốc: `npm test`, `npm run build` PASS; `npx eslint .` = 23 problems.

- [ ] **Step 6: Commit** `feat(e2e): scaffold e2e package — pinned engine, label parsers, preflight`

---

### Task 2: Thăm dò locator thật (spec §5) — KHÔNG code giữ lại

**Interfaces:** Produces quyết định ghi vào ledger, Task 3–7 đọc: (a) locator nào tồn tại; (b) `readCard` đọc nhãn bằng gì; (c) `e2e explore` + `--agent` chạy trên mobile.

- [ ] **Step 1:** `npx agent-device` (trong `e2e/`) mở app trên UBS1, chụp `snapshot -i` ở: màn Tìm có kết quả; Viewer (chân trang `Trang a / T`, ô "Tới trang…", nút "Nhảy"); Trang chủ (thẻ "Đang đọc dở" — chữ tên tài liệu và `Trang k / T` có là nút/chữ riêng không); màn chọn tài liệu khi chia đôi ("Chọn tài liệu để tra cứu", hàng môn/tài liệu, "Lên trên"); sheet mở. Ghi locator dùng được cho từng bước §4.5 spec.
- [ ] **Step 2:** Một file tạm `tests/probe.e2e.ts` thử: `screen.getAllByRole('button')` + `.allTextContents()` / `getAttribute('name')`/`textContent()` trên nút "Xem cả…" — cái nào trả về nhãn. Không cách nào được → `readCard` dùng `agent.extract`. Chạy `npx e2e explore --agent default --max-steps 2 "Mở tab Tìm"` — xác nhận explore chạy trên mobile.
- [ ] **Step 3:** Thiếu locator nào ở §4.5 → ghi `Ruling:` thay bằng cách khác (chữ hiển thị, agent) — KHÔNG sửa app. Xoá `tests/probe.e2e.ts`; `agent-device daemon stop`.

---

### Task 3: Helpers + `search.e2e.ts` (3 test)

**Files:** Create `e2e/tests/helpers.ts`, `e2e/tests/search.e2e.ts`

**Interfaces:**
- Consumes: `readCardFrom`, `parseXemCa`, `parseOpenAtPage`, `parsePageFooter` (Task 1); kết luận Task 2.
- Produces (`tests/helpers.ts`, nhận fixture `screen`, `agent` của e2e):
  - `toTab(screen, agent, name: 'Trang chủ' | 'Tìm'): Promise<void>` — bấm `tab` theo tên; không thấy thì `agent.act('Quay về màn có thanh tab dưới cùng (đóng bảng đang mở, thoát chia đôi, quay lại)')` rồi bấm.
  - `search(screen, query: string): Promise<void>` — điền ô tìm, ẩn bàn phím (`press('Enter')` hoặc cách Task 2 chốt), chờ chữ khớp `/ đoạn · .* tài liệu$/`.
  - `readCard(screen, agent, index = 0): Promise<{ name: string; page: number; count: number }>` — lấy nhãn nút theo kết luận Task 2 rồi `readCardFrom`.
  - `waitIndexReady(screen): Promise<void>` — chờ hết chữ "Đang đọc kho lần đầu" (≤ 60 s).
  - `footer(screen): Promise<{ page: number; total: number }>` — đọc chân trang Viewer qua `parsePageFooter`.

- [ ] **Step 1: Viết test** `search.e2e.ts`, `QUERY = 'hop dong'`:
  - `'Xem cả opens the in-doc sheet with the card count and first row'`: `toTab('Tìm')` → `waitIndexReady` → `search` → `readCard` = {X,P,N} → bấm nút `Xem cả ${N} đoạn trong ${X}` (N định dạng `toLocaleString('vi-VN')`) → `expect(getByText(`${N} đoạn khớp`)).toBeVisible()` + `expect(getByRole('button',{name:`Nhảy tới trang ${P}`}).first()).toBeVisible()`.
  - `'Xem cả into a document already open in another tab still opens the sheet'`: như trên tới {X,P,N} → bấm `Mở ${X} tại trang ${P}` → `toTab('Trang chủ')` → bấm thẻ "Đang đọc dở" theo chữ X → `toTab('Tìm')` → bấm `Xem cả … ${X}` → thấy `${N} đoạn khớp`.
  - `'tapping a sheet row before the PDF is ready lands on that page'`: tới {X,P,N} → bấm "Xem cả" → bấm NGAY `Nhảy tới trang ${P}` (không chờ) → `footer().page === P`.
  - Review Focus 5: thêm `'second card Xem cả is reachable with the keyboard dismissed'` — `readCard(…, 1)` rồi bấm "Xem cả" của thẻ thứ hai → thấy đúng số.
- [ ] **Step 2: Cho nó thấy đỏ một lần:** sửa tạm kỳ vọng `${N + 1} đoạn khớp` → `npm --prefix e2e test -- tests/search.e2e.ts` → FAIL đúng chỗ đó (locator, không phải hạ tầng) → hoàn nguyên.
- [ ] **Step 3: Chạy thật** `npm --prefix e2e test -- tests/search.e2e.ts` (Haiku, UBS1) → 4/4 PASS; ghi thời gian + chi phí (dòng `AI … $…`).
- [ ] **Step 4:** unit + typecheck + lint gốc như Global Constraints. **Commit** `test(e2e): search smoke tests — card count, live viewer, early tap`

---

### Task 4: `reading.e2e.ts`

**Files:** Create `e2e/tests/reading.e2e.ts` · **Consumes:** `toTab`, `footer`, `parsePageFooter`.

- [ ] **Step 1: Viết test** `'jump to page, leave, resume from Đang đọc dở on the same page'`: `toTab('Trang chủ')` → `agent.act('Mở môn đầu tiên trên kệ, rồi mở một tài liệu PDF bất kỳ trong đó (vào thư mục con nếu cần)')` → đọc tên tài liệu (tiêu đề Viewer, theo Task 2) + `footer()` = {a,T} → `k = Math.min(3, T)`; nếu `k === a` thì `k = a > 1 ? 1 : Math.min(2, T)` (T = 1 thì k = a, chỉ còn kiểm phần resume) → điền ô "Tới trang…" = k → bấm "Nhảy" → `footer().page === k` → `toTab('Trang chủ')` → thấy chữ tên tài liệu và `Trang ${k} / ${T}` trên thẻ "Đang đọc dở" → bấm thẻ → `footer()` = {k,T}.
- [ ] **Step 2:** cho đỏ một lần (kỳ vọng `k + 1`) → hoàn nguyên → chạy thật PASS, ghi số.
- [ ] **Step 3:** kiểm như Global Constraints. **Commit** `test(e2e): reading resume smoke test`

---

### Task 5: `split.e2e.ts` + chạy cả bộ từ trạng thái lộn xộn

**Files:** Create `e2e/tests/split.e2e.ts` · **Consumes:** `toTab`, `footer`.

- [ ] **Step 1: Viết test** `'split: pick, swap, exit keeps the top page'`: `toTab('Trang chủ')` → bấm thẻ "Đang đọc dở" → `footer()` = {k} → bấm `Chia đôi màn hình` → thấy "Chọn tài liệu để tra cứu" → `agent.act('Chọn một tài liệu bất kỳ trong danh sách để mở ở khung dưới')` → thấy nút `Tìm trong tài liệu tra cứu` và `Đổi tài liệu tra cứu` → bấm `Đổi tài liệu tra cứu` → thấy "Chọn tài liệu để tra cứu" → `agent.act(...)` chọn lại → bấm `Thoát chia đôi` → `footer().page === k`.
- [ ] **Step 2:** cho đỏ một lần → hoàn nguyên → chạy PASS.
- [ ] **Step 3 (Review Focus 1):** để app ĐANG chia đôi (dừng tay giữa test, hoặc vào split bằng adb) rồi chạy cả bộ `npm --prefix e2e test` → 6/6 PASS (helper `toTab` tự về).
- [ ] **Step 4:** chạy cả bộ thêm 2 lượt liên tiếp (cache bật) → ghi thời gian, chi phí lượt 1 và lượt có replay. Kiểm như Global Constraints. **Commit** `test(e2e): split-view smoke test`

---

### Task 6: Khám phá — agent `explorer`, dấu vân tay kho, lệnh `explore`, đề bài v1.41.0

**Files:** Create `e2e/lib/fingerprint.ts`, `e2e/unit/fingerprint.unit.ts`, `e2e/scripts/explore.ts`, `e2e/charters/v1.41.0.md` · Modify `e2e/e2e.config.ts` (agent `explorer`), `e2e/package.json` (script `explore` = `npm run preflight && node scripts/explore.ts`)

**Interfaces:**
- Produces (`lib/fingerprint.ts`):
  - `IGNORED: RegExp[]` — đường dẫn chứa `/.stversions/`, `/.stfolder`, tên `_reading-*.json`, `_worker.log*`, `*.sync-conflict-*`.
  - `parseFindListing(out: string): Map<string, number>` — từ `find <kho> -type f -exec stat -c '%s %n' {} +` (mỗi dòng `size path`), bỏ IGNORED, đường dẫn tương đối kho.
  - `hashListing(m: Map<string, number>): string` — sha256 của các dòng `path\tsize` đã sắp.
  - `diffListing(before, after): { added: string[]; removed: string[]; resized: string[] }`.
- `scripts/explore.ts <đề bài>`: listing TRƯỚC (adb, kho = `E2E_KHO ?? '/sdcard/Download/kho'`) → spawn `e2e explore --agent explorer --max-steps 8 --reporter list,markdown "<đề bài>"` (env telemetry tắt) → listing SAU → khác hash thì in `VI PHẠM CHỈ-ĐỌC` + danh sách `diffListing` và exit 4; giống thì exit theo mã của `e2e explore`.
- Agent `explorer` trong config: cùng model với `default`; `system` = danh sách cấm/cho phép của spec §4.2 (nguyên văn ý, viết tiếng Anh, giữ tên nút tiếng Việt trong ngoặc kép); `context` = "Vietnamese law-document reader app on a QA library; the user is a law student."

- [ ] **Step 1: Viết unit test thất bại** (`fingerprint.unit.ts`): listing bỏ `_reading-x.json`, `.stversions/…`, `_worker.log.2`; `hashListing` không đổi khi thứ tự dòng đổi; `diffListing` báo đúng 1 added / 1 removed / 1 resized trên ví dụ 4 file.
- [ ] **Step 2:** `npm --prefix e2e run unit` FAIL (module not found) → **Step 3:** cài đặt → PASS.
- [ ] **Step 4:** `e2e/charters/v1.41.0.md` — hai đề bài nguyên văn spec §4.8 + vai cho mỗi đề.
- [ ] **Step 5:** chạy thử lưới an toàn bằng tay: tạo file `zz_e2e_probe.txt` trong kho QA bằng adb giữa hai lần lấy listing (giả lập vi phạm) → `diffListing` báo `added` đúng file → xoá file đó. Kiểm như Global Constraints. **Commit** `feat(e2e): read-only explorer agent, kho fingerprint guard, explore command`

---

### Task 7: dGen1 — một lượt thử (spec §5.4)

- [ ] **Step 1:** Cắm dGen1; `npx agent-device devices --platform android` → tên máy (dự kiến `k6789v1_64`); `adb shell ls -d` để biết đường kho QA trên dGen1.
- [ ] **Step 2:** `E2E_DEVICE=<tên> E2E_MODEL=openrouter/free npm --prefix e2e test` MỘT lượt; sau đó chụp màn dGen1, kiểm app còn vẽ được (không màn đen) và `dumpsys activity` app còn sống.
- [ ] **Step 3:** Ổn → README ghi `E2E_DEVICE=<tên>` + `E2E_KHO=<đường>` cho dGen1; không ổn (màn đen / trượt hạ tầng do force-stop) → README ghi "chỉ UBS1" + lý do. (Commit gộp ở Task 9.)

---

### Task 8: Thử khám phá trên v1.41.0 + cổng (spec §4.8)

- [ ] **Step 1:** `npm --prefix e2e run explore -- "<đề 1>"` (Haiku) · `… "<đề 2>"` (Haiku) · `E2E_MODEL=openrouter/free npm --prefix e2e run explore -- "<đề 1>"` (so model free — huynh duyệt 07/10). Mỗi lượt ghi: thời gian, chi phí, số phát hiện (issue/warning), exit code, kết quả dấu vân tay.
- [ ] **Step 2:** Đệ phân loại từng phát hiện: lỗi thật / cố ý thiết kế / báo nhầm (đối chiếu bằng tay trên máy khi cần). Lỗi thật → KHÔNG sửa trong plan này: ghi lại làm việc cho beat sau.
- [ ] **Step 3: Cổng** — đạt cả ba: không vi phạm chỉ-đọc · ≤ ~1 USD mỗi đề · có phát hiện đáng giá HOẶC báo nhầm ≤ 50%. Đạt → Task 9 ghi quy trình vào README; không đạt → ghi "chưa đưa vào quy trình" + số. Model free vs Haiku: ghi so sánh và model khuyên dùng cho khám phá.
- [ ] **Step 4:** Ghi kết quả vào `Docs/perf/2026-10-07-spike-e2e-agent-test.md` (mục mới "Khám phá trên v1.41.0"). **Commit** `docs(perf): exploratory trial on v1.41.0`

---

### Task 9: README, ops doc, chạy cuối

**Files:** Create `e2e/README.md` · Modify `Docs/gu-library-ops-qa-prod.md` (§8.1 + một dòng trong mục verify)

- [ ] **Step 1:** `e2e/README.md` (tiếng Việt): cài lần đầu (`npm --prefix e2e install`; key vào `~/.bash_profile`; bấm Play Protect cho APK helper khi hiện; `npm --prefix e2e run doctor`) · chạy (`npm run e2e`, đổi máy/model bằng `E2E_DEVICE`/`E2E_MODEL`) · đọc kết quả (`e2e/.e2e/report.json`, ảnh/bản chụp chữ khi trượt) · phân loại trượt (hạ tầng → chạy lại một lần; locator → hồi quy) · quy ước `aria-label` giàu nghĩa cho nút mới · khám phá (theo kết quả cổng Task 8) · máy hỗ trợ (theo Task 7) · bẫy đã biết (Gboard nuốt "u", lần chụp đầu WebView rỗng, Ionic ẩn nền khi sheet mở, telemetry).
- [ ] **Step 2:** Chạy cả bộ lần cuối trên UBS1 → ghi `e2e N/N đạt · thời gian · chi phí · model · app v1.41.0`.
- [ ] **Step 3:** Ops doc §8.1: mục "Bộ test e2e (07/10)" — lệnh, số Task 5/9, kết quả khám phá Task 8, quy ước ghi verify mỗi beat. Đồng bộ ops doc làm lúc merge (`scripts/sync-ops-doc.sh`).
- [ ] **Step 4:** kiểm toàn bộ như Global Constraints. **Commit** `docs(e2e): README and ops doc entry`
