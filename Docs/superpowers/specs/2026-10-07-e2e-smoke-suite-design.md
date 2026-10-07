# Bộ test khói e2e cho Gú's Library (agent + máy Android thật)

**Ngày:** 2026-10-07 · **Trạng thái:** chờ huynh duyệt bản viết · **Nền:** app v1.41.0 (main)
**Spike dẫn đường:** `Docs/perf/2026-10-07-spike-e2e-agent-test.md`

## 1. Vấn đề

Mỗi beat/phát hành, đệ kiểm tay các luồng chính bằng adb + chụp màn hình + đọc ảnh (v1.41.0: ~30
lượt chụp cho tìm kiếm, "Xem cả", chia đôi màn hình, nhảy trang). Tốn thời gian, không lặp lại y hệt,
huynh không tự chạy được. Spike 07/10 cho thấy framework `tester-army/e2e` + `agent-device` đọc được
nội dung WebView của app trên máy thật, ổn định 10/10, ~0,002 USD/test.

## 2. Mục tiêu và tiêu chí đạt

Một lệnh chạy bộ test khói trên máy QA, bắt hồi quy ở ba luồng chỉ-đọc chính.

Đạt khi:
1. Một lệnh (`npm run e2e` ở gốc repo) chạy cả bộ trên UBS1 trong ~1–2 phút.
2. Bản app tốt → xanh; một luồng hỏng → đỏ đúng test của luồng đó.
3. Kho QA thêm/bớt tài liệu → test vẫn chạy (không cứng số/tên).
4. Chi phí ≤ ~0,05 USD/lượt với model mặc định.
5. Đệ chạy được trong bước verify mỗi beat; huynh chạy được theo `e2e/README.md`.

## 3. Quyết định đã chốt (với huynh, 07/10)

| Chỗ | Chốt | Đã bác |
|---|---|---|
| Ai chạy | Đệ mỗi beat + huynh chạy được | Chỉ huynh · tự chạy định kỳ |
| Luồng | Tìm kiếm · Đọc & nhớ trang · Chia đôi màn hình (chỉ đọc) | Thao tác ghi xuống kho (để sau, cần môn hộp cát) |
| Bám dữ liệu | Kiểm theo QUAN HỆ (đọc từ màn hình rồi so) | Môn mẫu cố định · số cứng |
| Đặt ở đâu | Gói riêng `e2e/` trong repo app | devDependencies gốc · repo riêng |
| Sửa app? | Không — thiếu nhãn thì dùng chữ hiển thị | Gắn nhãn thẻ "Đang đọc dở" ngay (để beat sau) |
| Model | `anthropic/claude-haiku-4.5` qua OpenRouter; dự phòng `openrouter/free` | Model free cụ thể (5/6 hỏng ở spike) |

## 4. Thiết kế

### 4.1 Cấu trúc

```
e2e/
  package.json        "type": "module", private; phiên bản GHIM CHÍNH XÁC
  package-lock.json
  e2e.config.ts
  README.md           tiếng Việt: cài lần đầu, chạy, đọc báo cáo, quy ước nhãn
  scripts/preflight.mjs
  tests/helpers.ts
  tests/search.e2e.ts
  tests/reading.e2e.ts
  tests/split.e2e.ts
```

- Phụ thuộc ghim: `e2e@0.18.0`, `@e2e-dev/mobile@0.10.0`, `agent-device@0.21.23` +
  `"overrides": { "agent-device": "$agent-device" }` (bẫy lệch phiên bản ở spike),
  `@openrouter/ai-sdk-provider@3.1.0` (bản đã chạy ở spike).
- Script trong `e2e/package.json`: `test` = preflight rồi `e2e run` với `E2E_TELEMETRY_DISABLED=1`;
  `doctor` = `agent-device doctor`. Gốc repo thêm `"e2e": "npm --prefix e2e test"`.
- `.gitignore` gốc thêm `e2e/node_modules/` và `e2e/.e2e/` (cache + ảnh + bản chụp chữ kho QA —
  repo CÔNG KHAI, không commit).
- App không đổi: `vitest` chỉ bắt `*.test.*`, `tsc` chỉ đọc `src/`. Lint gốc vẫn quét `e2e/**/*.ts`
  (không thêm lỗi mới là tiêu chí).

### 4.2 Config

- Một target `android`: `mobile({ platform: 'android', device: process.env.E2E_DEVICE ?? 'UBS1' })`
  (chọn máy bằng TÊN), `app: { bundleId: 'com.gulibrary.app' }`.
- Agent `default`: `openrouter(process.env.E2E_MODEL ?? 'anthropic/claude-haiku-4.5')`,
  `maxSteps` 10, `maxModelCalls` 10.
- `workers: 1` · `retries: 0` · `cache: 'read-write'` · `timeout` 300 000 ms · `actionTimeout`
  60 000 · `assertionTimeout` 15 000.

### 4.3 Preflight (`scripts/preflight.mjs`, chạy trước `e2e run`)

Dừng sớm, báo tiếng Việt, khi: thiếu `OPENROUTER_API_KEY`; máy `E2E_DEVICE` không có trong
`adb devices`; `com.gulibrary.app` chưa cài. In ra `versionName` của app trên máy (để báo cáo ghi
đúng bản đã test).

### 4.4 Helpers (`tests/helpers.ts`)

- `toTab(screen, agent, name)` — bấm tab bằng locator `tab` theo tên; không thấy thanh tab (sheet
  đang mở, đang ở Viewer…) thì `agent.act('quay về màn có thanh tab dưới cùng')` rồi bấm.
- `search(screen, query)` — điền ô tìm, chờ dòng đếm `… đoạn · … tài liệu`.
- `readFirstCard(screen)` → `{ name, page, count }` từ nhãn `Mở <name> tại trang <page>` và
  `Xem cả <count> đoạn trong <name>`. Locator không đọc được thuộc tính trên mobile thì dùng
  `agent.extract` (một lần gọi model).
- `waitIndexReady(screen)` — chờ màn Tìm hết "Đang đọc kho lần đầu" (≤ 60 s) cho máy vừa đổi
  `SCHEMA`.
- Quy tắc: agent CHỈ cho điều hướng mơ hồ; gõ/bấm/kiểm đều bằng locator.

### 4.5 Test

Mọi câu tra không chứa chữ "u" (Gboard UBS1 nuốt chữ "u"). Kiểm theo quan hệ, không cứng số/tên.

**`search.e2e.ts`** — câu tra "hop dong":
1. *Xem cả khớp số:* `readFirstCard` → X, P, N → bấm "Xem cả N đoạn trong X" → thấy `N đoạn khớp`
   và nút đầu `Nhảy tới trang P`.
2. *Tài liệu đang mở ở tab khác (lỗi review v1.41.0):* chạm đoạn trích "Mở X tại trang P" (X lên đầu
   "Đang đọc dở") → tab Trang chủ → bấm thẻ "Đang đọc dở" theo chữ X (X mở trong tab Trang chủ) →
   tab Tìm → bấm "Xem cả N đoạn trong X" → thấy `N đoạn khớp`.
3. *Chạm sớm (jumpGate):* bấm "Xem cả" thẻ đầu → bấm ngay `Nhảy tới trang P` không chờ PDF → chân
   trang hiện `Trang P /`.

**`reading.e2e.ts`** — agent mở một tài liệu PDF bất kỳ trong môn đầu trên kệ (vào thư mục con nếu
cần) → đọc tên + `Trang a / T` ở chân trang → điền "Tới trang" k = min(3, T) → "Nhảy" → `Trang k / T`
→ tab Trang chủ → thẻ "Đang đọc dở" có tên đó và `Trang k / T` → bấm → chân trang `Trang k / T`.

**`split.e2e.ts`** — mở tài liệu từ thẻ "Đang đọc dở", ghi `Trang k` → bấm "Chia đôi màn hình" →
agent chọn một tài liệu khác ở màn chọn → thấy nút "Tìm trong tài liệu tra cứu" và "Đổi tài liệu tra
cứu" → "Đổi" → màn chọn hiện lại ("Chọn tài liệu để tra cứu") → chọn lại → "Thoát chia đôi" → chân
trang vẫn `Trang k`.

### 4.6 Kết quả, phân loại lỗi, báo cáo

- Terminal (reporter mặc định) + `e2e/.e2e/report.json`; trượt thì có ảnh + bản chụp chữ màn hình.
- **Lỗi hạ tầng** (`MODEL_PROVIDER_FAILED`, `STEP_TIMEOUT`, `ENGINE_FAILURE`) → chạy lại một lần
  trước khi kết luận. **Locator trượt** → coi là hồi quy app.
- Mỗi beat đệ ghi vào ops doc §8.1 phần verify: `e2e N/M đạt · thời gian · chi phí · model · app
  vX.Y.Z`.

### 4.7 An toàn

- Chỉ luồng đọc; chỉ ghi vị trí đọc vào `_reading` của máy test (vô hại).
- Không dùng `app.clearState()`, `device.setPermission`, `device.installApp()`; không `--test-ime`.
- KHÔNG chạy trên máy Gú / kho Prod. Nội dung màn hình kho QA gửi lên OpenRouter/Anthropic — chấp nhận.
- Key chỉ ở biến môi trường (repo công khai).

## 5. Việc cần kiểm trước khi viết test (task đầu của plan)

1. Chụp bản chụp chữ (`agent-device snapshot`) các màn: Viewer + chân trang + ô "Tới trang" +
   nút "Nhảy"; thẻ "Đang đọc dở"; màn chọn tài liệu (split); sheet. Xác nhận locator §4.5 tồn tại;
   thiếu thì chỉnh thiết kế test (không sửa app).
2. Locator đọc được tên/nhãn (`getAttribute`/`textContent`) trên mobile không — quyết dùng
   `readFirstCard` bằng locator hay `agent.extract`.
3. dGen1: chạy cả bộ MỘT lượt bằng `openrouter/free`, theo dõi màn đen/force-stop. Ổn → ghi
   `E2E_DEVICE=<tên dGen1>` vào README; không ổn → ghi "chỉ UBS1".

## 6. Ngoài phạm vi

Thao tác ghi xuống kho (in, đổi tên, chuyển, xoá, nhập) · CI · máy Gú/Prod · iOS · gắn nhãn
`aria-label` mới cho app (beat sau, vd thẻ "Đang đọc dở") · nâng phiên bản e2e · đổi phiên bản app
(bộ test không đổi app).
