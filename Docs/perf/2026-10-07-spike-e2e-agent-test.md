# Spike 07/10/2026 — test end-to-end bằng AI agent (tester-army/e2e) trên máy Android thật

**Câu hỏi:** framework [tester-army/e2e](https://github.com/tester-army/e2e) có test được Gú's Library
(app Capacitor — toàn bộ giao diện là MỘT WebView) trên máy thật không, tốn bao nhiêu, có ổn định không?

**Kết luận:** ĐƯỢC. Agent đọc được nội dung trong WebView trên cả UBS1 lẫn dGen1; viết test kiểu
"agent lo điều hướng, locator lo kiểm tra" thì 10/10 lượt đạt, ~0,002 USD/lượt với Claude Haiku 4.5
qua OpenRouter, 0 USD khi phát lại từ cache. Tổng cả buổi thử: 0,064 USD.

Dự án thử nằm NGOÀI repo (scratchpad, đã bỏ); config + test ở phụ lục để dựng lại.

## Bối cảnh công cụ

- **e2e 0.18.0** (Apache-2.0, chưa tới 1.0 — API/config còn đổi giữa các bản). Test viết TypeScript,
  trộn `agent.act/assert` (ngôn ngữ tự nhiên) với `expect(screen.getBy…)` kiểu Playwright.
- **Engine mobile `@e2e-dev/mobile` 0.10.0** chạy qua **`agent-device` 0.21.23** (Callstack): điều
  khiển máy Android bằng adb, **cả máy thật**. Mỗi bước agent nhận một **bản chụp chữ** của cây
  accessibility (vai trò, tên, trạng thái); `vision` mới gửi kèm ảnh.
- Model: không có mặc định — config chọn. Hỗ trợ API key mọi nhà cung cấp qua AI SDK (có
  `@openrouter/ai-sdk-provider`), model local, hoặc đăng nhập gói ChatGPT / Copilot / OpenCode /
  SuperGrok. **Gói Claude (Pro/Max) KHÔNG dùng được.** Model phải gọi tool + đọc ảnh.

## Câu 1 — agent có thấy nội dung WebView không? CÓ, cả hai máy

- `agent-device snapshot` trên UBS1 và dGen1 đều liệt kê nội dung giao diện, kể cả các
  `aria-label` đặt ở v1.41.0: `"Mở môn Hình sự chung (44 tài liệu)"`, `"Xem cả 200 đoạn trong
  Hop_dong_Chuong_1_2_4"`, `"Mở Hop_dong_Chuong_1_2_4 tại trang 24"`, `"Nhảy tới trang 24"`,
  `"200 đoạn khớp"`, các tab `Trang chủ / Tìm / Thêm / Cài đặt`.
- Ghi chép cũ "dGen1 (WebView 124) không lộ" chỉ đúng với **`uiautomator dump`**; helper của
  agent-device đọc được.
- **Điểm mù 1:** snapshot ĐẦU TIÊN sau khi mở app chỉ có `[webview]` — WebView dựng cây accessibility
  lười, lần truy vấn sau mới đủ (e2e tự xử lý vì chụp nhiều lần).
- **Điểm mù 2:** khi sheet (IonModal) mở, phần nền — gồm **tiêu đề Viewer = tên tài liệu** — bị
  Ionic ẩn khỏi cây. `agent.assert` có nhắc tên tài liệu → Haiku trả `ASSERTION_INCONCLUSIVE`
  (không bịa — hành vi đúng). Kiểm cái gì thì phải có trong cây.
- PDF là canvas → không có chữ; chỉ kiểm được phần giao diện quanh nó ("Trang 24 / 38").

## Câu 2 — chi phí

| Test | Model | Kết quả | Thời gian | Chi phí |
|---|---|---|---|---|
| Bản 1: act + act + assert | Claude Haiku 4.5 | 2 act qua, assert INCONCLUSIVE (điểm mù 2) | 76 s | 0,0507 USD (108k token, 71% cache prompt, 11 lần gọi) |
| Bản 1 | `openrouter/free` | 2 act qua, assert hết giờ (`STEP_TIMEOUT`, giới hạn 30 s) | 105 s | 0 |
| **Bản 2: 1 act + locator** | Claude Haiku 4.5 | **đạt** | 14–19 s | **0,0019–0,0035 USD** (2 lần gọi) |
| Bản 2, cache `read-write` lượt 2–3 | — | đạt, `replayed`, **0 lần gọi** | 15–17 s | 0 |

**Model free trên OpenRouter (có tool + ảnh) — 5/6 hỏng:**

| Model | Kết quả |
|---|---|
| `google/gemma-4-31b-it:free`, `google/gemma-4-26b-a4b-it:free` | nhà cung cấp gốc (Google AI Studio) giới hạn tốc độ — trượt sau 6 lần thử |
| `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free` | `ResourceExhausted` phía Nvidia |
| `thinkingmachines/inkling-small:free` | chỉ mở cho ứng dụng được OpenRouter duyệt |
| `dots-studio/dots-3-note-preview:free` | lỗi luồng SSE |
| **`openrouter/free`** (router tự chọn model free) | **chạy được** — chậm hơn, từng hết giờ ở bước judge |

Nạp >10 USD chỉ nâng hạn mức request phía OpenRouter, không cứu được khi nhà cung cấp gốc chặn.

## Câu 3 — độ ổn định

Bản 2 (agent chỉ "đi tới tab Tìm", gõ/bấm/kiểm bằng locator): **Haiku 5/5 · `openrouter/free` 3/3 ·
cache 2/2 = 10/10 đạt**. Haiku đều 18–19 s; free dao động 18–51 s.

## Bẫy đã gặp (đã gỡ trong spike)

1. **Lệch phiên bản agent-device:** `@e2e-dev/mobile` 0.10.0 kéo agent-device 0.21.22; cài thêm bản
   0.21.23 riêng → daemon 0.21.23 chạy nền, client 0.21.22 từ chối. Sửa: ghim một bản trong
   `package.json` (`"agent-device": "0.21.23"` + `"overrides": { "agent-device": "$agent-device" }`).
   Giữ đúng bản đã cài helper để khỏi cài lại helper (lại phải bấm Play Protect).
2. **Chọn máy bằng TÊN** (`device: 'UBS1'`), không phải serial (`agent-device` có `--serial` nhưng
   option `device` của engine thì không).
3. **APK helper** `com.callstack.agentdevice.snapshothelper` cài lên máy lần đầu → **Google Play
   Protect hỏi xác nhận trên UBS1** (lệnh cài treo 30 s rồi lỗi). Người phải bấm; dGen1 (ethOS)
   không hỏi. Helper hiện vẫn nằm trên cả hai máy.
4. **e2e không đọc `.env`** — `export OPENROUTER_API_KEY=…` trong shell (shell của CC phải
   `source ~/.bash_profile` nếu key mới thêm giữa phiên). **Telemetry bật mặc định** → chạy với
   `E2E_TELEMETRY_DISABLED=1`.
5. **Gboard đang mở cũng bị chụp vào snapshot** (từng phím một) — phình bản chụp chữ. `fill` gõ
   "hop dong" đúng; chữ "u" chưa thử (`--test-ime` của agent-device cài bàn phím riêng — đổi bàn phím
   hệ thống, cần huynh duyệt).
6. **Test dính dữ liệu kho QA** ("200 đoạn", tên file) — kho đổi là test phải sửa.
7. **dGen1 chưa chạy test thật**, chỉ chụp snapshot: engine có thể force-stop app khi kết thúc, mà
   dGen1 từng đen màn sau chuỗi force-stop.

## Cách viết test rút ra

- **Agent cho phần mơ hồ** (đi tới đâu đó từ trạng thái bất kỳ), **locator cho mọi thao tác và kiểm
  tra chính xác** — rẻ ~15×, không chập chờn, không phụ thuộc phán đoán của model.
- `aria-label` giàu nghĩa trên nút (đã có từ v1.41.0) chính là "test id" — nên giữ/đặt cho nút mới.
- Không kiểm thứ bị Ionic ẩn khi overlay mở.
- Bật cache `read-write` khi chạy local: lượt sau không tốn model.

## Khám phá trên v1.41.0 (08/10, thử theo spec §4.8) — CỔNG KHÔNG ĐẠT

Lệnh `npm --prefix e2e run explore -- "<đề bài>"` (agent `explorer` chỉ-đọc, ≤ 8 bước, UBS1, kho QA
`/sdcard/Download/kho`). Dấu vân tay kho lấy trước/sau mỗi lượt.

| Lượt | Model | Thời gian | Chi phí | Gọi model | Bước | Phát hiện | Kho |
|---|---|---|---|---|---|---|---|
| Đề 1 — sinh viên lần đầu, "Xem cả N đoạn" | Haiku 4.5 | 7 ph 14 s | $0,36 | 56 | 6/8 (4 đạt · 1 hết lượt · 1 chặn) | 1 cảnh báo | 376 file, không đổi |
| Đề 2 — gõ dở, đổi ý, qua lại tab | Haiku 4.5 | 8 ph 51 s | $0,40 | 67 | 7/8 (6 đạt · 1 chặn), hết ngân sách thời gian của engine¹ | 0 | không đổi |
| Đề 1 | `openrouter/free` | 5 ph 10 s | $0 | 13 | 2/8 (bước 1 lỗi nhà cung cấp · bước 2 hết lượt), bị cắt ngang | 0 | không đổi |

¹ Summary của engine ghi "the time budget ran out" (exit 0): engine tự dừng lượt khám phá theo
ngân sách thời gian của nó, chứ lệnh không bị timeout.

**Phân loại phát hiện (1):** "tìm trong tài liệu ra *27 đoạn khớp* nhưng thiếu nút *Xem cả N đoạn*" →
**báo nhầm**. "Xem cả" là nút trên thẻ ở tab Tìm; sheet tìm-trong-tài-liệu đã là danh sách mọi đoạn (vẽ
50 dòng/lượt), agent chỉ thấy 2 dòng trong khung nhìn và không cuộn. Ảnh "bằng chứng" là Viewer đã
đóng sheet. Đáng chú ý hơn: cả 6 bước của đề 1 đều ở tìm-trong-tài-liệu — agent **không vào tab Tìm**,
nên chưa chạm tới tính năng v1.41.0 mà đề bài nhắm.

**Cổng (cần đạt cả ba):**
- Không vi phạm chỉ-đọc — **đạt** (3/3 lượt, mã băm kho trước = sau).
- ≤ ~1 USD mỗi đề — **đạt** ($0,36 · $0,40).
- Có phát hiện đáng giá HOẶC báo nhầm ≤ 50% — **không đạt** (1/1 báo nhầm, không phát hiện thật).

→ **Chưa đưa khám phá vào quy trình phát hành.** Lệnh `explore` và lưới vân tay kho giữ lại để dùng tay
khi cần (an toàn đã chứng minh); bộ 6 test khói vẫn là cổng mỗi lần phát hành.

**Model free vs Haiku:** `openrouter/free` không dùng được cho agent — bước 1 của lượt khám phá
hỏng ("model provider failed … non-retryable"), bước 2 hết lượt, lượt bị cắt ngang ở 2/8; lượt
chạy bộ test trên dGen1 cùng ngày gặp
"gemma-4-31b-it:free is temporarily rate-limited upstream" ở mọi lần gọi. Khuyên dùng **Haiku 4.5**:
khám phá ~$0,4/đề; bộ test khói chạy có cache chỉ còn 1 lượt gọi (assert bằng ảnh), ~$0,0034/lượt.

**Nếu thử lại khám phá:** đề bài phải chỉ ĐƯỜNG tới màn cần thử ("ở tab Tìm, gõ … rồi bấm Xem cả trên
một thẻ") — đề chỉ nêu tên nút để agent tự tìm thì nó dừng ở chỗ đầu tiên có ô tìm.

## Phụ lục — config + test dùng trong spike

`package.json` (rút gọn): `"type": "module"`, dependencies `e2e@^0.18.0`, `@e2e-dev/mobile@^0.10.0`,
`@openrouter/ai-sdk-provider@^3.1.0`, `agent-device@0.21.23`, overrides như bẫy 1.

```ts
// e2e.config.ts
import type { E2EConfig } from 'e2e';
import { mobile } from '@e2e-dev/mobile';
import { openrouter } from '@openrouter/ai-sdk-provider';

const MODEL = process.env.E2E_MODEL ?? 'anthropic/claude-haiku-4.5';

export default {
  targets: [
    { name: 'ubs1', engine: mobile({ platform: 'android', device: 'UBS1' }), app: { bundleId: 'com.gulibrary.app' } },
  ],
  agents: { default: { model: openrouter(MODEL), maxSteps: 15, maxModelCalls: 15 } },
  workers: 1,
  timeout: 300000,
  actionTimeout: 60000,
  assertionTimeout: 15000,
  cache: 'read-write',
} satisfies E2EConfig;
```

```ts
// tests/search-v2.e2e.ts — bản đạt 10/10
import { test, expect } from 'e2e';

test('v2: thẻ tài liệu → Xem cả → sheet đúng số, dòng đầu = đoạn trên thẻ', async ({ app, agent, screen }) => {
  await app.open();
  await agent.act('Đi tới tab "Tìm" ở thanh dưới cùng (đóng bảng hoặc quay lại nếu đang ở màn khác)');
  await screen.getByRole('textbox').fill('hop dong');
  await expect(screen.getByRole('button', { name: 'Mở Hop_dong_Chuong_1_2_4 tại trang 24' })).toBeVisible();
  const xemCa = screen.getByRole('button', { name: 'Xem cả 200 đoạn trong Hop_dong_Chuong_1_2_4' });
  await expect(xemCa).toBeVisible();
  await xemCa.tap();
  await expect(screen.getByText('200 đoạn khớp')).toBeVisible();
  await expect(screen.getByRole('button', { name: 'Nhảy tới trang 24' }).first()).toBeVisible();
});
```

Chạy: `E2E_TELEMETRY_DISABLED=1 E2E_MODEL=anthropic/claude-haiku-4.5 npx e2e run` (cần
`OPENROUTER_API_KEY`, máy UBS1 cắm, `npx agent-device doctor` xanh).
