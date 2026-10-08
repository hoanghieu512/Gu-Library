# Bộ test khói e2e — Gú's Library

6 test chạy trên **máy Android thật** (UBS1, kho QA), lái app bằng
[tester-army/e2e](https://github.com/tester-army/e2e) + agent-device. Model AI (Haiku 5.5 qua
OpenRouter) chỉ lo phần điều hướng mơ hồ; gõ, bấm và phép kiểm đi bằng nhãn chính xác, không nhờ
model phán — **trừ một bước** ở test chia đôi: nút trên thanh chia không có trong cây trợ năng, nên
thanh chia được kiểm bằng ảnh (`agent.assert` với `vision: 'only'`).

| File | Test |
|---|---|
| `tests/search.e2e.ts` | Xem cả → sheet đúng số + dòng đầu · Xem cả vào tài liệu đang mở ở tab khác · bấm dòng sheet trước khi PDF sẵn sàng → đúng trang · thẻ dưới vẫn bấm được khi đã cất bàn phím |
| `tests/reading.e2e.ts` | Nhảy trang → rời đi → "Đang đọc dở" mở lại đúng trang |
| `tests/split.e2e.ts` | Chia đôi → chọn tài liệu dưới → thoát → trang trên giữ nguyên |

Spec: `Docs/superpowers/specs/2026-10-07-e2e-smoke-suite-design.md` · số đo và bẫy:
`Docs/perf/2026-10-07-spike-e2e-agent-test.md`.

## Cài lần đầu

```bash
npm --prefix e2e install
```

- Key OpenRouter **chỉ để ở biến môi trường** (repo công khai): thêm
  `export OPENROUTER_API_KEY=…` vào `~/.bash_profile` rồi mở shell mới. e2e **không đọc `.env`**.
- Cắm UBS1, mở khoá, cho phép gỡ lỗi USB. Lần chạy đầu agent-device cài APK phụ
  `com.callstack.agentdevice.snapshothelper` — **Play Protect trên UBS1 sẽ hỏi, người phải bấm cho
  phép** (lệnh cài treo ~30 s rồi lỗi nếu không bấm).
- Kiểm môi trường: `npm --prefix e2e run doctor`.
- App cần kiểm phải cài sẵn trên máy (APK release). Không dùng máy Gú / kho Prod.

## Chạy

```bash
npm run e2e
```

`preflight` chạy trước: thiếu key, không chạy được adb, không thấy máy, chưa cài app → dừng ngay kèm
cách sửa, và in
`✓ app vX trên UBS1 · model …`.

- Đổi máy: `E2E_DEVICE=<model adb>` (tên trong `adb devices -l`, ví dụ `UBS1`).
- Đổi model: `E2E_MODEL=<id OpenRouter>` (mặc định `anthropic/claude-haiku-5.5`, hằng `DEFAULT_MODEL` trong
  `lib/preflight.ts`; ghim đúng mã, không dùng bí danh `-latest`).
- Một file / một test: `npm --prefix e2e test -- tests/search.e2e.ts --grep "first row"`.
- Gỡ lỗi: thêm `--video on --debug`.
- Truyền cờ cho `e2e run` từ thư mục gốc phải qua **hai** `--`: `npm run e2e -- -- --no-cache`.
  Chỉ một `--` thì npm nuốt cờ làm cấu hình của chính nó (`npm warn invalid config cache=false`) và
  lượt chạy vẫn dùng cache. Từ `e2e/`: `npm --prefix e2e test -- --no-cache`.

Số đo (UBS1, v1.41.0): **Haiku 5.5 (từ 08/10)** phát lại từ cache 6/6 · ~2 ph 8 s · ~$0,0003
(chỉ còn bước assert bằng ảnh của test chia đôi gọi model; giá 5.5 rẻ ~10× 4.5) · lượt lạnh
~$0,002–0,003 nhưng hiện 4/6, xem "Bẫy đã biết". Haiku 4.5 trước đó: lạnh ~3 ph 14 s, ~$0,036 ·
cache ~2 ph 10 s, ~$0,0034.

## Đọc kết quả

- Tổng: `e2e/.e2e/report.json`.
- Test trượt: `e2e/.e2e/artifacts/android/<test>/…/failure/screen.txt` (cây giao diện lúc trượt) +
  `screenshots/*.png`.

**Phân loại trượt:**
- **Hạ tầng** (không thấy máy, model lỗi, timeout lúc khởi động) → chạy lại MỘT lần.
- **Locator / phép kiểm** (không thấy nút, số không khớp) → coi là **hồi quy** cho tới khi chứng
  minh ngược lại: mở `screen.txt` + ảnh, đối chiếu tay trên máy.

## Quy ước cho nút mới trong app

Test bấm và kiểm theo **`aria-label` giàu nghĩa** ("Xem cả 200 đoạn trong X", "Nhảy tới trang 24",
"Thoát chia đôi"). Nút mới nên có nhãn nói rõ việc nó làm + đối tượng, đừng chỉ "Mở"/"Xem". Tránh
đặt nút bên trong phần tử `role="separator"` — con của nó bị ẩn khỏi cây trợ năng (thanh chia đôi
hiện đang dính lỗi này, nên test chưa bấm được "Tìm"/"Đổi" trên thanh).

## Khám phá (dùng tay, CHƯA vào quy trình phát hành)

```bash
npm --prefix e2e run explore -- "<đề bài>"
```

Agent `explorer` chỉ đọc (cấm Xóa / Đổi tên / Chuyển tới / Đi in / Thêm / Cài đặt kho…), tối đa 8 bước.
(Agent `default` của bộ test khói mang cùng luật chỉ-đọc, nhưng không có lưới vân tay kho.)
Script lấy **dấu vân tay kho** (`E2E_KHO`, mặc định `/sdcard/Download/kho`: đường dẫn + cỡ + mtime
từng file) trước và sau — cả khi bấm Ctrl-C giữa chừng. Đề bài mẫu: `charters/v1.41.0.md`.

| Exit | Nghĩa |
|---|---|
| 10 | **VI PHẠM CHỈ-ĐỌC** — kho đổi; in file thêm (`+`) / mất (`-`) / đổi (`~`). Có thể do Syncthing hay worker vừa ghi vào kho QA giữa lượt — xem tên file rồi kiểm tay. |
| 11 | **Không kiểm được kho sau khám phá** (adb rớt…) — kiểm tay kho trên máy. |
| khác | Kho không đổi; mã của chính `e2e explore` (0 xong · 4 lỗi runner · 130 bị ngắt…). |

Exit 0 chưa chắc là đi trọn: xem dòng `Steps` (lượt bị cắt ngang vẫn có thể ghi "no findings").

Thử trên v1.41.0 (08/10): an toàn (kho không đổi ở cả 3 lượt) và rẻ (~$0,4/đề), nhưng phát hiện
duy nhất là **báo nhầm**, và agent không tự tới được màn cần thử → **cổng không đạt**, nên chưa
đưa vào quy trình. Nếu dùng lại: viết đề bài chỉ rõ đường tới màn ("ở tab Tìm, gõ … rồi bấm Xem cả
trên một thẻ"), và dùng Haiku — `openrouter/free` không chạy nổi agent (lỗi nhà cung cấp, bị giới
hạn lượt).

## Máy hỗ trợ

- **Chỉ UBS1.**
- **dGen1 (`k6789v1_64`) không dùng được — đã thử lại từ máy vừa reboot (08/10 tối), vẫn đỏ.**
  `app.open()` force-stop app ở đầu mỗi test. Trên dGen1 (ethOS, WebView 124) chỉ **một** lần
  force-stop khi renderer đang chạy là đủ: app mở lại thì hệ thống từ chối dựng renderer
  (logcat: `ActivityManager: Unable to launch app com.gulibrary.app/… for service
  …SandboxedProcessService0:0: process is bad`, rồi `cr_ChildProcessConn: Failed to establish the
  service connection`) → **màn đen** ngay test đầu, agent báo `APP_UNREACHABLE`. Lượt thử: 1 đỏ,
  1 ngắt, 4 bỏ qua, $0,032.
- **Gỡ màn đen trên dGen1: chỉ reboot.** `adb install -r` lại đúng APK **không** gỡ được (tiến trình
  app mới vẫn bị từ chối renderer). Sau reboot, mở app bằng launcher hoặc
  `adb shell monkey -p com.gulibrary.app -c android.intent.category.LAUNCHER 1` — **không**
  `am force-stop`. Máy không đặt PIN: `input keyevent 82` mở khoá.
- Muốn chạy được trên dGen1 phải bỏ relaunch (`openApp(…, { relaunch: false })`), tức là mất bảo
  đảm "mỗi test bắt đầu sạch" → chưa làm; dGen1 chỉ để kiểm tay.

## Bẫy đã biết

- **Gboard trên UBS1 nuốt chữ "u"** → câu tra trong test không có chữ "u" (`hop dong`).
- **Lần chụp đầu của WebView rỗng** (chỉ có một node `webview`) — cây trợ năng nạp lười; engine tự
  chụp lại.
- **Ionic ẩn nền bằng aria khi sheet mở**, và trang bị che vẫn có thể trả lời locator → `toTab`
  đóng sheet, thoát chia đôi, bấm back cho tới gốc tab (tối đa 12 lần, quá thì báo lỗi rõ) rồi mới
  bấm tab. Trạng thái test TRƯỚC để lại thì không cần `toTab`: `app.open()` đã mở lại app từ đầu.
- **Bấm locator vào nút chữ thường** (tiêu đề, tên trên thẻ) đi qua lối bấm theo ref của
  agent-device và **trúng phần tử khác** (đã gặp: chạm tiêu đề "Tìm" mở thẻ kết quả đầu) → dùng
  `tapCentre` (chạm theo toạ độ). Nút/tab có role thì `tap()` bình thường.
- **Bàn phím che nửa dưới**; `press('Enter')` không cất nó → `search()` chạm tiêu đề để cất.
- **Thẻ dưới cùng nằm dưới thanh tab** nhưng vẫn "visible" với engine → `revealAboveTabBar` kéo
  chậm lên trước khi bấm.
- **Viewer hiện trang đã lưu trước rồi mới nhảy** → đọc chân trang bằng `footerAt`: chờ tới trang
  cần, giữ ~2,5 s rồi đọc lại (cú nhảy hỏng có thể tới nơi rồi bị kéo về trang đã lưu).
- **`toTab` bấm back tới gốc tab** → đừng dùng nó khi cần một Viewer còn sống ở tab kia (test "tài
  liệu đang mở ở tab khác" bấm thẳng tab).
- **Bước chọn tài liệu của test chia đôi chập chờn khi chạy LẠNH** (08/10: 6 lượt lạnh chỉ có
  test này với Haiku 4.5, có hay không có luật chỉ-đọc đều 1/3 đạt; Haiku 5.5 cũng nhầm). Dòng trong
  bộ chọn (`DocPicker`) là `div` không role → agent nhầm tên môn là tài liệu, chạm rồi tự báo đạt.
  Lượt thường phát lại bản ghi tốt từ cache nên ổn; sau `act` có locator kiểm bộ chọn đã bị gỡ
  (không còn tiêu đề "Chọn tài liệu để tra cứu" lẫn nút "Lên trên" — trong một môn, nút này thay
  chỗ tiêu đề), nên lượt hỏng trượt ngay với lý do rõ. Engine chỉ giữ bản ghi khi một phép kiểm SAU nó đạt, test trượt thì bản
  ghi bị xoá → nếu bước này mất cache, chạy lại tới khi ra một lượt đạt. Gốc rễ: a11y của `DocPicker`
  (backlog app).
- **Lượt lạnh với Haiku 5.5: test đọc tiếp trượt vì LỖI THẬT của app.** Agent 5.5 luôn mở
  "Hình sự chung / Slide / 0. GIỚI THIỆU MÔN HỌC" (slide 4:3, 8 trang). Với trang thấp cỡ nửa khung
  nhìn, mỗi vòng rời đi rồi mở lại **trôi thêm một trang** (3 → 4 → 5 → 6, tái hiện bằng locator
  08/10): `PdfView` cuộn mép trên trang p lên đầu khung nhìn nhưng lưu trang ở GIỮA khung nhìn. Bản
  ghi cache (Haiku 4.5) mở tài liệu dọc nên lượt thường vẫn đạt; nếu cache của test này bị xoá,
  test sẽ đỏ cho tới khi app sửa lỗi — đó là đúng.
- **`textContent()` không chờ** node xuất hiện → đọc chữ một thẻ nạp bất đồng bộ (thẻ "Đang đọc dở"
  ở Trang chủ) phải `expect(...).toBeVisible()` trước.
- **Telemetry** tắt sẵn (`E2E_TELEMETRY_DISABLED=1` trong script `test`/`explore`).
- Không dùng `app.clearState()`, `setPermission`, `installApp`, `--test-ime`.
