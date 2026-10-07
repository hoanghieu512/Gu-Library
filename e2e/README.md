# Bộ test khói e2e — Gú's Library

6 test chạy trên **máy Android thật** (UBS1, kho QA), lái app bằng
[tester-army/e2e](https://github.com/tester-army/e2e) + agent-device. Model AI (Haiku 4.5 qua
OpenRouter) chỉ lo phần điều hướng mơ hồ; gõ, bấm và **mọi phép kiểm** đều đi bằng nhãn chính xác,
không nhờ model phán.

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

`preflight` chạy trước: thiếu key, không thấy máy, chưa cài app → dừng ngay kèm cách sửa, và in
`✓ app vX trên UBS1 · model …`.

- Đổi máy: `E2E_DEVICE=<model adb>` (tên trong `adb devices -l`, ví dụ `UBS1`).
- Đổi model: `E2E_MODEL=<id OpenRouter>` (mặc định `anthropic/claude-haiku-4.5`).
- Một file / một test: `npm --prefix e2e test -- tests/search.e2e.ts --grep "first row"`.
- Gỡ lỗi: thêm `--video on --debug`.

Số đo (UBS1, v1.41.0): lần đầu, chưa có cache ~3 ph 15 s, ~$0,036 · các lần sau, phát lại từ
cache ~2 ph 10 s, ~$0,0034 (chỉ còn bước assert bằng ảnh của test chia đôi gọi model).

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
- **dGen1 (`k6789v1_64`) không dùng được:** engine force-stop app ở mỗi test, và sau chuỗi force-stop
  WebView trên dGen1 không bind được tiến trình con → **màn đen** ngay từ test đầu (bẫy đã biết, ops
  doc mục verify v1.38.0). Chỉ **reboot máy** mới hết. Thử 08/10: 0/6.

## Bẫy đã biết

- **Gboard trên UBS1 nuốt chữ "u"** → câu tra trong test không có chữ "u" (`hop dong`).
- **Lần chụp đầu của WebView rỗng** (chỉ có một node `webview`) — cây trợ năng nạp lười; engine tự
  chụp lại.
- **Ionic ẩn nền bằng aria khi sheet mở**, và trang bị che vẫn có thể trả lời locator → `toTab`
  đóng sheet, thoát chia đôi, bấm back cho tới gốc tab rồi mới bấm tab.
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
- **Telemetry** tắt sẵn (`E2E_TELEMETRY_DISABLED=1` trong script `test`/`explore`).
- Không dùng `app.clearState()`, `setPermission`, `installApp`, `--test-ime`.
