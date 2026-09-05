# Gú's Library — Ghi chú vận hành QA / Prod

*Cập nhật 2026-09-05, trạng thái: app v1.38.1 · worker v0.13.0. **Bản hợp nhất** —
nguồn chân lý duy nhất, phải khớp về cả repo app, repo worker lẫn Obsidian. File này
dành cho huynh (và cả hai CC khi cần dựng lại) — không phải tài liệu cho Gú.*

> **Prod đã có người dùng thật.** Gú đang dùng hằng ngày trên máy của Gú. Mọi thay đổi
> chạm Prod từ đây tính là chạm vào công cụ học của một người thật, không còn là sân tập.

## 1. Nguyên tắc gốc

- App local-first, không backend → **"môi trường" = folder kho nào + cụm Syncthing nào**,
  không phải tầng app. Không có build flavor riêng — cùng một APK chạy cả QA lẫn Prod,
  khác nhau duy nhất ở folder kho được chọn trong Cài đặt.
- App **agnostic tên/ID kho** từ v1.2.1 (badge query theo device, đã xóa hằng số kho cứng).
  Mọi cấu hình môi trường nằm ở Syncthing + worker, không nằm trong code app.
- **Không share chéo** hai kho: máy test không thấy kho Prod, máy Gú không thấy kho QA.

## 2. Sơ đồ hiện trạng

| | QA | Prod |
|---|---|---|
| Folder trên Atomman | `D:\GuLibrary\kho` | `D:\GuLibrary-Prod\kho` |
| Folder-ID Syncthing | `gu-library-kho` | `gu-library-kho-prod` |
| Máy trong cụm | Z Flip 4 · S22 Ultra · Z Fold 3 · **UBS1** · **dGen1** (máy test) | Galaxy Tab S9 (SM-X710) · S20 FE · Z Flip 6 (máy Gú) |
| Archive nguồn (v0.10.0 + v0.13.0) | sibling ngoài cây sync | sibling ngoài cây sync |

- Tách ở **cấp cha** (`GuLibrary-Prod\kho`, không phải `kho-prod` cạnh nhau) — cô lập
  `.stversions/`, `_worker.log`, archive; worker trỏ rạch ròi, khó copy nhầm.
- **Atomman** = anchor node 24/7 (Syncthing chạy dạng Windows service). Android dùng
  Syncthing-Fork (Catfriend1).
  **ĐỔI TÊN 05/09: trước gọi là "mini PC", nay dùng đúng tên máy — Atomman.** Đã đổi trong 5 tài
  liệu sống (`design-spec`, `syncthing-setup`, `phase1-build-brief`, ops doc này,
  `worker-tmp-normalization`). **CỐ Ý KHÔNG đổi:** `CHANGELOG.md` và `Docs/superpowers/plans/*`
  (bản ghi lịch sử, giữ nguyên chữ lúc viết), và **định danh trong code** (`MINIPC`, `minipcId`,
  `KEY_MINIPC`) — riêng `st_minipc_id` là **khoá lưu Preferences**, đổi là mọi máy mất cấu hình
  Syncthing đã lưu. Chuỗi hiện trên màn hình app vẫn đang là "mini PC", chưa đổi.
- **Hai máy test dùng luân phiên từ 05/09 — KHÁC LỚP NHAU, số đo KHÔNG suy sang nhau được:**

  | | UBS1 | dGen1 |
  |---|---|---|
  | serial | `UBS1240902002011` | `dG1408299JIT` |
  | model | Unisoc T616 (ums9230) | alps `k6789v1_64` (MediaTek) |
  | Android | 14 | **15** |
  | RAM | **5,89 GB** | **7,59 GB** |
  | Màn | 720×1600 @320dpi (360dp dọc) | **720×720 VUÔNG** @240dpi (**480×480 dp**) |
  | WebView | `com.google.android.webview` (bản mới) | **`com.android.webview` 124 (AOSP, cũ)** |

  → **Đo bộ nhớ phải ghi rõ máy nào.** Mọi số v1.37/v1.38 trước 05/09 đều là UBS1.
  → dGen1 là máy DUY NHẤT có màn **vuông** — ca bố cục không máy nào khác phủ được.

## 3. Worker

- **Một tiến trình, quét tuần tự cả 2 kho** (`-KhoRoot` tách phẩy) — nguyên tắc cứng,
  KHÔNG chạy song song để tránh LibreOffice headless khóa profile.
- Scheduled Task `GuLibraryWorker` mỗi 3 phút, chạy `pythonw` (không cửa sổ).
  Task Scheduler tự lo restart sau reboot — không có daemon để chăm.
- Quan sát: `<kho>\_worker.log` (RotatingFileHandler 1MB×3, `_`-prefix nên app bỏ qua,
  `.stignore` giữ local). **Mỗi kho một log riêng**, mỗi dòng gắn nhãn kho
  (`[GuLibrary]` / `[GuLibrary-Prod]`) — soi Prod vs QA không lẫn. Console không hiện
  gì là **bình thường**.
- File nặng (PDF scan jpx/DPI cao) được chuẩn hóa ~0.8s/trang → một quyển lớn có thể
  kéo một vòng quét dài vài phút, kho còn lại trễ tối đa một vòng, tự lành vòng sau.
  PDF có text layer / scan nhẹ sẵn **KHÔNG** bị chuẩn hóa.
- **Ảnh trong `_inbox/` (v0.12.0):** file ảnh (`.jpg/.jpeg/.png/.webp/.gif/.bmp/.tif/.tiff`)
  → **mỗi ảnh thành một PDF 1 trang riêng**, khổ trang = tỉ lệ ảnh (ảnh ngang → trang
  ngang, không ép dọc), **KHÔNG bao giờ gộp** nhiều ảnh. Nhúng lossless (giữ nét); ảnh
  nặng thì tái dùng chuẩn hóa 150dpi như scan. Ảnh gốc = nguồn đã tiêu thụ (pixel đã nằm
  trong PDF, Gú giữ bản trên điện thoại) → **xóa, KHÔNG archive**. Sidecar ảnh hợp lệ
  nhưng rỗng text (`IMAGE_PAGE_MARKER`, không OCR).
- **Khu archive sibling `…\kho_archive\`** (vd `D:\GuLibrary-Prod\kho_archive\`, ngoài
  Syncthing) giờ giữ hai loại nguồn: (a) bản gốc PDF scan nặng trước chuẩn hóa (v0.10.0),
  (b) gốc `.doc`/`.ppt` (OLE cũ) sau khi convert (v0.13.0 — convert LibreOffice làm sidecar
  degrade về `paragraph`/mất cấu trúc, nên giữ nguồn OOXML để phase 2 re-extract khi làm
  search). Trùng tên → suffix `(n)`, không đè. `.docx`/`.pptx` + PDF gốc + ảnh **KHÔNG**
  vào archive. Dọn tay định kỳ nếu đầy đĩa, không có gì tự xóa.
- **Hai task hạ tầng riêng (v0.11.0 — ĐANG CHẠY, độc lập với `GuLibraryWorker`, chết
  độc lập):** `GuLibraryPrintSync` (mirror `_print/` Prod → `gdrive:GuLibrary/Di-in`
  mỗi ~15 phút) và `GuLibraryBackup` (CN 03:00 — robocopy snapshot → `rclone sync` lên
  `gdrive:GuLibrary/Backup`). Register bằng `scripts\register-ops-tasks.ps1` (Admin).
  Log riêng, **NGOÀI kho**: `D:\GuLibrary-Prod\_print-sync.log` và `_backup.log`. rclone
  cài user-scope (winget), remote tên `gdrive`, config OAuth ở `%APPDATA%\rclone\rclone.conf`.
- **Cả 3 Scheduled Task chạy principal S4U** (run-whether-logged-on-or-not) → sống lại
  sau reboot **không cần ai logon**, và headless (session 0, không cửa sổ). Đây chính là
  cái làm "reboot tự dậy" ở §4/§6 thành sự thật. Đổi/thêm task phải giữ S4U; các
  register script đã set sẵn.

## 4. Dựng máy mới vào cụm (hoặc dựng lại từ đầu) — 6 bước

1. **Folder:** trên Atomman, tạo (hoặc xác nhận) folder kho đúng cấp cha riêng
   (`D:\GuLibrary\kho` hay `D:\GuLibrary-Prod\kho`).
2. **Syncthing Atomman:** Add Folder với folder-ID đúng bảng trên; kiểm `.stversions`
   (simple versioning) bật — đây là lưới M8.
3. **Máy Android mới:** cài Syncthing-Fork → trao đổi device-ID với Atomman → share
   ĐÚNG MỘT folder (QA hoặc Prod, không bao giờ cả hai) → chờ sync xong lượt đầu.
4. **Worker:** *(máy Atomman mới — dựng môi trường trước:* cài Python 3.11+ và LibreOffice,
   `git clone` repo worker, `python -m venv .venv` rồi `.venv\Scripts\python -m pip install
   -e .`; soffice auto-detect nên không cần sửa PATH — chi tiết README worker.*)*
   Nếu là kho mới, thêm đường dẫn vào `-KhoRoot` (tách phẩy) của Scheduled
   Task; chạy `scripts\register-task.ps1` (Admin) và **tin vào bước verify của nó** (nó tự
   `Get-ScheduledTask` kiểm trước khi báo thành công — bài học v0.7.9 báo-thành-công-giả).
   **Nếu dựng lại Prod** cần thêm 2 task hạ tầng: cài rclone + `rclone config` (remote
   `gdrive`, OAuth — xem README worker mục "Prod ops") rồi
   `scripts\register-ops-tasks.ps1 -KhoRoot "D:\GuLibrary-Prod\kho" -RcloneRemote "gdrive"` (Admin).
5. **App (dựng + cài APK release, làm trên máy Mac):** bump version = sửa **1 chỗ**
   `versionName` trong `package.json` (`versionCode` tĩnh =2 ở build.gradle — không tăng,
   sideload không cần). Dựng: `cd android && ./gradlew assembleRelease` →
   `app/build/outputs/apk/release/Gu-Library-<ver>-release.apk`. Keystore ngoài repo
   `~/keystores/gu-library/gu-library-release.jks`, credential `android/keystore.properties`
   (gitignored). Cài lên máy: release-đè-release **cùng keystore** không mất data;
   release-**đè-debug phải gỡ trước** (khác chữ ký → `install -r` báo lỗi). Rồi Cài đặt →
   Folder kho → chọn đúng folder qua SAF; kiểm badge "Đã đồng bộ" (dựa connected của
   device Atomman, không dựa tên kho).
6. **Smoke:** bỏ 1 file PDF qua đường Share vào một môn → thấy ⏳ → chờ vòng worker →
   thành tài liệu mở được. Thông chuỗi này = môi trường sống.

## 5. Backup & điểm không được mất

- **Keystore `gu-library-release.jks` + `keystore.properties`** = single point of no
  return. Mất là hết đường update app đã cài. Phải có bản ngoài máy Mac
  (cloud/USB/password manager) — kiểm lại định kỳ.
- **Schema sidecar** phải khớp thủ công ở **3 nơi**: repo app, repo worker, và tài liệu
  Obsidian. Không có cơ chế tự đồng bộ. Lệch một nơi = hỏng hợp đồng dữ liệu dài hạn,
  và sidecar là hợp đồng phục vụ cả những feature Phase 2 chưa viết. Sửa schema ở đâu
  thì phải sửa đủ ba, ngay trong cùng session.
  **Bản chốt phía worker: `Docs/gu-library-sidecar-schema.md`;** `validate_sidecar` kiểm
  đúng theo đó, gồm cả `bbox` (optional) và `IMAGE_PAGE_MARKER` cho PDF-ảnh. Nếu doc bên
  app mô tả sidecar, phải khớp đúng hai field này.
- **Kho Prod — chuỗi backup đang chạy (v0.11.0):** hàng tuần robocopy snapshot theo ngày
  vào `D:\GuLibrary-Prod\backup\` (giữ 4 bản gần nhất; snapshot **loại `.stversions`** cho
  gọn — chiều sâu thời gian là các bản-ngày, không phải version-history của Syncthing) →
  xong `rclone sync` folder backup lên Drive `GuLibrary/Backup` (offsite thật, vá ca
  mất-cả-cụm). Lưu ý trung thực: ransomware mã hóa local rồi nhịp sync kế chạy thì bản
  Drive bị đè theo, nhưng Drive trash + version history ~30 ngày vẫn là cửa lùi cuối.
  Mức này chấp nhận đủ.
- **`_print/` (Prod) → Drive `GuLibrary/Di-in`, mirror mỗi ~15 phút** (chính là M9
  mức A, về sớm không cần đụng app/worker): folder Drive luôn = hàng đợi cần in hiện
  tại — Gú tick "Xong" là file rời cả Drive; share link viewer cho người in một lần
  là xong vĩnh viễn.
- `_reading-<deviceId>.json`, `.print.json` sống trong kho nên đi theo backup kho,
  không cần lo riêng.

## 6. Khi có biến — checklist chẩn đoán nhanh

- **App báo "Chưa thấy Atomman":** kiểm Syncthing Atomman đang chạy (service) + máy đó
  connected trong Syncthing UI. Từ v1.2.1 badge chỉ sai khi device thật sự mất kết nối.
- **App (Cài đặt) hiện version cũ sau khi update:** `versionName` được **nướng vào APK
  lúc build** (build.gradle đọc `package.json`), không đọc runtime → cài lại một APK dựng
  *trước* lúc bump sẽ vẫn hiện số cũ dù code mới. Không phải bug: dựng LẠI `assembleRelease`
  sau khi bump rồi cài đè (đã gặp thật v1.16.0→v1.17.0).
- **File kẹt ⏳ lâu:** mở `<kho>\_worker.log`. File đuôi lạ/tmp kẹt lại là *tín hiệu
  dọn tay theo thiết kế*, worker không tự xóa. Segment tiền tố độc → worker route về
  "Chưa phân loại" + WARNING trong log.
- **Ảnh (jpg/jpeg/png/webp) kẹt ⏳ không thành PDF:** app **nhận ảnh từ v1.19.0** (picker
  "Chọn file từ máy" + share từ Gallery), nhưng đóng ảnh→PDF là việc của **worker**. Env
  nào app nhận ảnh thì worker env đó **PHẢI biết xử ảnh TRƯỚC**, không thì ảnh nằm ⏳ vô
  hạn. Thứ tự deploy bắt buộc: worker-image lên Prod trước → verify → rồi mới đẩy app
  v1.19.0 sang máy Gú. **Lệch whitelist có chủ ý:** app CHỈ gửi `jpg/jpeg/png/webp`;
  worker (v0.12.0) xử được TẬP RỘNG hơn (thêm `gif/bmp/tif/tiff`) nhưng app cố tình chưa
  mở các loại đó (chọn hẹp cho chắc) → không phải bug. HEIC thì **cả app lẫn worker đều
  không nhận** (Samsung để "high efficiency" mới ra HEIC — Gú giữ JPG là an toàn). Cần
  nhập gif/bmp/tif thì chỉ việc nới whitelist app (worker sẵn sàng) — beat nhỏ.
- **Thấy folder `_inbox (1)`, `_inbox (2)`… ở gốc kho, hoặc danh sách môn RỖNG dù kho
  đầy:** đã gặp thật (2026-07-13, Flip 4, khi nhập nhiều ảnh liên tiếp). Gốc: `_inbox` bị
  worker/Syncthing xóa+tạo lại giữa loạt import → cache SAF stale → app tạo trùng
  `_inbox (k)`; snapshot cũ coi `_inbox (k)` là môn rồi throw → **môn hiển thị rỗng —
  DATA KHÔNG MẤT** (folder môn còn nguyên trên đĩa). **Đã fix ở app v1.19.0** (ensureDir
  dò cursor tươi + tự lành dedup; snapshot lọc `_`-prefix + try/catch từng môn) → không
  còn tái sinh `_inbox (k)`. Nếu môn vẫn rỗng sau churn cực đoan: DocumentsProvider của
  OS kẹt index tạm thời → **reboot máy** dọn (data còn nguyên). File trong `_inbox (k)`
  mồ côi (máy chưa lên v1.19.0) — worker chỉ quét `_inbox` → **dồn tay về `_inbox` rồi
  xóa folder rác** (giữ nguyên tiền tố `[Môn]`).
- **Thấy folder `<tên>-gu-case-<số>` ở trong môn/thư mục:** residue rất hiếm của đổi
  tên case-only (v1.25.1 đổi 2 bước qua tên tạm để né `(1)` — xem CHANGELOG). Chỉ đọng
  nếu app bị kill GIỮA hai bước rename. An toàn: đổi tên tay folder đó về tên đích (bỏ
  đuôi `-gu-case-<số>`). Không mất data — con bên trong còn nguyên.
- **Đổi tên môn/thư mục ra `… (1)`:** đã fix ở app v1.25.1 (đổi tên sang biến thể chỉ
  khác hoa/thường của chính nó). Nếu còn thấy `(1)` sau đổi tên → máy đó chưa lên v1.25.1.
- **Sync đứng, thấy file mồ côi `.syncthing.*.tmp`:** đã gặp thật trên Flip 4.
  **Không phải bug app/worker, không có fix code.** Syncthing tự hòa giải sau vài vòng.
  Chỉ theo dõi xem có tái diễn thành mẫu hình lặp lại hay không; nếu chỉ lẻ tẻ thì bỏ qua.
- **Nghi hai kho lẫn nhau:** kiểm từng máy Android chỉ share đúng 1 folder-ID;
  kiểm `-KhoRoot` của task đúng 2 đường dẫn.
- **Atomman vừa reboot:** không phải làm gì — service Syncthing + Scheduled Task (S4U)
  tự dậy. Chỉ kiểm nếu 15 phút sau file vẫn kẹt.
- **Nghi rclone chết:** hai task hạ tầng chết độc lập với worker — worker chạy ngon
  không nói lên rclone còn sống. Kiểm `D:\GuLibrary-Prod\_print-sync.log` / `_backup.log`
  và `Get-ScheduledTask GuLibraryPrintSync,GuLibraryBackup | Get-ScheduledTaskInfo |
  Select State,LastTaskResult` (LastTaskResult `0` = OK). Test auth tay: `rclone lsd gdrive:`.

## 7. Mô hình test cuốn chiếu (đã chốt 2026-07-03)

- **Giữ song song dài hạn, QA chạy trước Prod một phase:** vd Phase 2 phát triển/test
  trên QA (3 máy test) trong khi Prod của Gú vẫn ở Phase 1 ổn định. Chỉ khi phase mới
  chín trên QA mới đẩy sang Prod.
- Hệ quả: 3 máy test không gập lại trong tương lai gần.
- **Ràng buộc sống còn (giờ đã có hiệu lực thật):** máy Gú đang chạy Prod hằng ngày →
  **APK thử nghiệm tuyệt đối không sideload sang máy Gú.** Máy Gú chỉ nhận bản đã
  nghiệm thu đủ hai máy test.

## 8. Trạng thái mốc & việc còn treo

- App **v1.36.0** trên main, sạch, chỉ còn nhánh `main` (tag `v1.36.0`). Từ v1.19.0
  đến nay là **polish UI/UX + read-path thuần, KHÔNG coupling worker/hạ tầng mới** — deploy độc
  lập, không chờ worker: v1.20 breadcrumb bấm-nhảy-tầng · v1.21 ô nhập floating-label tự-vẽ (đồng
  nhất mọi WebView) · **M10 folder-level ĐÓNG TRỌN**: v1.22 đổi tên + v1.23 xóa môn/thư mục (đệ
  quy, chặn pending) + v1.23.1 empty-state panda khi thư mục bị máy khác xóa + v1.25.1 fix đổi-tên
  case-only ra `(1)` · v1.24 định vị cây sâu (phụ đề "Đang đọc dở" rút gọn `…` + avatar ô-màu-thuần) ·
  v1.25.0 toast phản hồi cho MỌI thao tác đơn (giọng Gú) · **v1.26.0 đổi read-path PDF** (base64→fetch
  qua WebViewLocalServer, stream content-URI trong renderer → mở được file nặng ~64MB, trả nợ OOM
  v1.4.1; guard `probeReadable` + body-rỗng → panda thay vì crash khi file move/xóa) · **v1.27.0
  split-screen Viewer MVP** (chia 50/50 trên/dưới, pane trên giữ trang + ghi reading-state, pane dưới
  tra cứu không ghi) · **v1.28.0 redesign Trang chủ "Tủ sách luật"** (kệ gỗ 3D + gáy da tint màu môn +
  nhấn-giữ-rút-sách menu + Book Press "Chưa phân loại" + card đọc-dở bìa-da mirror màu môn + "Đi in"
  xấp-giấy — reskin lớp trình bày, KHÔNG đụng reading-state/print/sync) · **v1.28.1 bảng màu
  môn thay trọn 6 màu cũ → 8 màu "sách luật"** (đa dạng hue, chỉ đụng `MON_PALETTE`; môn đã gán
  màu giữ nguyên vì `meta.color` explicit thắng) · **v1.28.2 fix Book Press tràn khung tủ**
  (nhồi kệ phải dùng bề rộng RENDER thật của press, không phải `spineWidth`).
  **TUYẾN B mở (áp tông nâu-giấy lên các màn còn lại, reskin thuần — KHÔNG đổi hành vi):**
  **v1.29.0 = B1** lớp hàng dùng chung `KhoRow` (Đi in · Trong Môn · sheet chọn đích cùng ăn) +
  vuốt trái bỏ chữ còn icon+màu (in nâu · xóa đỏ-đất · ⋯ xanh rêu) + màn Đi in có swatch màu môn
  ở header nhóm. **v1.30.0 = B2a** vỏ modal/sheet dùng chung (`GuSheet` + `SheetAction[]`, `GuDialog`)
  — dialog xóa · đổi tên · sheet ⋯ · đổi màu cùng một vỏ. **v1.31.0 = B2b(+B2b.1)** Trong Môn:
  breadcrumb ƯU TIÊN tầng đang đứng (cha co trước, chật thì dồn vào `…`; KHÔNG hạ cỡ chữ) + chế độ
  chọn-nhiều (thư mục mờ, không bấm) + hàng thư mục có vạch màu/icon-ô-nền/dòng phụ đếm con trực
  tiếp. **v1.32.0 = B2c** "Chọn hết / Bỏ chọn hết" (MỘT nút đổi nhãn; phạm vi = ĐÚNG tập đang hiển
  thị ở tầng đang đứng, **KHÔNG đệ quy**, không gồm thư mục). **v1.33.0 = B3(+B3.1)** màn Thêm ·
  sheet chọn môn–thư mục (cưỡi `GuSheet`, nút lùi vào `startSlot`) · màn Tìm · modal Sync · màn Cài
  đặt lên thẻ-rời. **v1.34.0 = B4a** Viewer RESKIN (header · thanh điều khiển + vạch tiến độ · vỏ
  split · icon chia-đôi đổi theo chế độ) — KHÔNG đụng read-path, KHÔNG đụng logic split.
  **Hai beat cuối là TÍNH NĂNG chứ không phải reskin:** **v1.35.0 = B4b** đổi tài liệu ngay trong
  split (nút "Đổi" trên vạch chia → `DocPicker` sẵn có; TUẦN TỰ: nhả tài liệu cũ HẲN rồi mới nạp
  mới → đỉnh vẫn 2 tài liệu, không phải 3). **v1.36.0 = B4c** thanh chia KÉO ĐƯỢC (Gú xác nhận 50/50 chưa đủ)
  + tay-nắm (B4a CỐ Ý chưa vẽ để khỏi hứa cử chỉ chưa có) — mỗi pane luôn ≥132px, tỉ lệ nhớ trong
  phiên và sống qua thao tác "Đổi", CỐ Ý không nhớ qua lần mở app sau. Kéo mượt nhờ gói cập nhật
  bố cục trong `requestAnimationFrame` (đo Flip 4, giáo trình 398 trang, kéo 30s: **687 khung ·
  giật 2.18% · p95 10ms**). Sau QA huynh: vạch mỏng lại **38→22px**, bỏ tên tài liệu khỏi vạch
  (tên là thứ đệ tự thêm ở B4b, không ai yêu cầu), **dày bằng nhau ở cả hai trạng thái**. Sàn 22px
  là theo VÙNG CHẠM để kéo, không theo chữ — nên KHÔNG đổi chữ "Đổi" sang icon (và
  `swapHorizontalOutline` đã có nghĩa "Chuyển file" ở chỗ khác trong app).
  **→ TUYẾN B KHÉP TRỌN.** Bảy beat liên tiếp (B1→B4c) không phải sửa ba lớp nền
  `KhoRow`/`GuSheet`/`GuDialog` và không đụng read-path — bằng chứng lớp nền chốt đúng ở v1.29.0.
  - **Còn treo sau B4c, CHƯA quy trách nhiệm:** **xoay ngang → pane trên hiện TRẮNG** (khung không
    vỡ; xoay về dọc thì nội dung trở lại). `PdfView` không bị B4c đụng (diff rỗng) và **layout
    ngang/xoay vốn nằm trong danh sách "CHƯA làm" từ v1.27.0** — đệ KHÔNG đối chứng với v1.34.0
    nên không khẳng định là hồi quy hay có sẵn. Muốn kết luận thì phải cài lại v1.34.0 và thử xoay.
  - **Feedback Gú đã chốt (khỏi hỏi lại):** pane trên ĐỌC / pane dưới TRA — giữ nguyên như app,
    giả định ban đầu đúng.
  - **CÁCH ĐO BỘ NHỚ CHO VIEWER (bắt buộc nhớ):** WebView chạy renderer ở **TIẾN TRÌNH RIÊNG**
    (`…:sandboxed_process0`) — chỗ chứa bytes PDF + canvas. `dumpsys meminfo com.gulibrary.app`
    CHỈ đếm tiến trình chính nên **thiếu 5–6 lần**. Luôn cộng cả hai: lấy pid renderer bằng
    `ps -A | grep sandboxed_process0` rồi `dumpsys meminfo <pid>`.
  - **Số nền máy 6GB @ v1.35.0** (chính+renderer): mở app 200 · đọc đơn 61MB 422 · split 61+20MB
    504 · sau 10 lần đổi 431 MB. **Ca nặng nhất kho** (trên 214.5MB + dưới 67MB) đỉnh **829 MB**,
    không crash, máy `status normal`. **Trôi ~0.68 MB/lần đổi (20 lần: +13 MB), TOÀN BỘ ở renderer;
    đã quy trách nhiệm: luồng CŨ cũng trôi cùng dải → là cache Chromium/pdf.js CÓ SẴN, không phải
    rò do B4b.** Còn treo theo dõi: rời Viewer về Home giữ ~135 MB so với lúc mới mở.
  - **File mồi test CÓ CHỦ ĐÍCH (đừng "sửa"):** `Chưa phân loại/Giám định pháp y, tâm thần.pdf`
    (scan JPEG2000/JPX) — huynh cố ý để trong kho QA để test ca pdf.js render TRẮNG. Thấy pane
    trắng với file này là ĐÚNG, không phải bug.
  - **CHỜ XÁC NHẬN CÓ DÙNG — "Chọn hết / Bỏ chọn hết" (v1.32.0):** đây là mục **DUY NHẤT** của cả
    Tuyến B **không truy được về friction quan sát từ Gú** — nó đến từ prototype, không từ việc Gú
    kêu. Cần theo dõi vài tuần: nếu Gú không đụng thì **GỠ**, đừng để tồn như tính năng chết.
    *Đường gỡ sạch (không gì khác phụ thuộc):* xoá `src/storage/selectAll.ts` + `selectAll.test.ts`,
    xoá khối `IonButtons slot="end"` trong nhánh `selectMode` của header `src/pages/FolderPage.tsx`,
    và 3 biến `visibleDocUris`/`allSelected`/`onToggleAll`. Chế độ chọn-nhiều (B2b) KHÔNG bị ảnh hưởng.
  - **Nợ `className="ion-padding"` VÔ HIỆU trên `IonContent` (bài học v1.10.0) — ĐÃ ĐÓNG SỔ ở
    v1.33.0**: ba file cuối (`SyncSettings`, `SettingsPage`, `PerfDebugModal`) đã đổi sang biến
    `--padding-*`; grep toàn `src/` nay sạch. **Luật giữ về sau: KHÔNG dùng `className="ion-padding"`
    trên `IonContent` — nó không có tác dụng; luôn set qua biến `--padding-*`.** **Nav chữ-bên-icon = won't-do
  (đóng sổ).** **v1.19.0 image-coupling ĐÃ GIẢI:** worker Prod v0.13.0 xử ảnh→PDF từ v0.12.0 → app
  nhận-ảnh lên Prod được. *Bản APK thực trên tablet Gú (Prod): huynh xác nhận đang ở version nào —
  doc không tự suy.*
  - **Gate S20 FE — ĐÃ ĐO 2026-07-28 (buổi đo trên máy Prod của Gú, app v1.35.0): PASS.**
    *Máy:* `RF8RA06HA9Z` **SM-G780G**, **RAM 7.44 GB**, **1080×2400 @480dpi**, kho Prod thật (107 PDF).
    *Cách đo:* CC chỉ-đọc, huynh thao tác máy; PSS = **tiến trình chính + renderer**, lấy mẫu 3s/lần.
    - **Mốc nền S20 FE-class** (trung vị): Home mới mở **185** · đọc đơn 61MB **401** ·
      split 61+20MB **456** · sau 1 lần đổi **456** · sau 10 lần đổi **436 MB**.
    - **Ca nặng nhất kho** (pane trên **214.5 MB** + pane dưới **61 MB**): **đỉnh 868.3 MB**;
      đổi sang 35MB còn 839. **Không crash, PID không đổi suốt 640s**, máy `status normal`
      (Free RAM 3.6 GB). Nhả-trước-nạp-sau vẫn đúng ở ca nặng: bấm "Đổi" nhả **68.9 MB**.
    - **10 lượt đổi: CHỮNG, không leo thang.** Plateau đầu 455.9 → cuối 435.6 = **−20.3 MB**
      (chỉ 3/7 lượt tăng). *Cạm bẫy đã vấp:* hồi quy thô trên cả pha ra +7.33 MB/phút trông như
      "leo đều" — do MỘT đỉnh nhọn kéo lên, **phải cắt theo từng lượt** mới đọc đúng.
    - *Đỉnh nhọn chưa giải thích được (ghi nguyên trạng):* một lượt vọt 709 MB trong ~15s rồi tự
      nhả 225 MB; tài liệu tra cứu lượt đó chỉ **0.3 MB** nên KHÔNG do nó. Nghi pane trên (giáo
      trình 398 trang) dồn raster khi cuộn nhanh — chưa đủ dữ kiện khẳng định.
  - **CHỖ VÊNH ĐÃ GỠ — gate cũ ghi "S20 FE-class (res cao + **6GB**)" là SAI tiền đề:** S20 FE của
    Gú là **bản 8GB** (đo được 7.44 GB). Vậy buổi này đóng được ô **"res cao + 8GB"**, KHÔNG phải ô
    "res cao + 6GB". Ô còn trống trên giấy: **1080×2400 + 6GB** — nhưng **rủi ro đã bị chặn bằng số**:
    gấp **2.25× số điểm ảnh** (720×1600 → 1080×2400) mà đỉnh chỉ tăng **829 → 868 MB (+4.7%)**, tức
    ~870 MB trên máy 6GB vẫn là ~14% RAM. **Và quan trọng hơn: mục đích của gate là bảo vệ Gú —
    máy Gú đang dùng CHÍNH LÀ máy vừa đo và nó PASS.** Đề xuất: đóng gate; nếu sau này có máy
    1080×2400 + 6GB thì đo bổ sung cho đủ ô, không phải để chặn ship.
  - **"Giữ lại sau phiên nặng" — ĐÃ GIẢI, KHÔNG PHẢI RÒ.** Hiện tượng: rời Viewer về Home vẫn cao
    hơn lúc mới mở (máy 6GB 200→336 = +135 MB; S20 FE **185→506 = +321 MB**). **Cách chứng minh
    (chỉ-đọc, bằng `dumpsys meminfo <pid renderer>` mục App Summary):**
    (1) **Java Heap 0.7 MB · Native Heap 0.8 MB · Graphics 0** → app KHÔNG ôm đối tượng;
    (2) **`TOTAL SWAP PSS` nhảy 3.1 MB (lúc split) → 231.3 MB (lúc về Home)** → OS đã nén/đẩy
    ~228 MB sang **zram** ngay khi rời Viewer, tức đang được thu hồi;
    (3) **RSS 238.6 MB < PSS 376.8 MB** → phần lớn PSS đang kế toán cả trang đã swap, KHÔNG nằm
    trong RAM vật lý; (4) máy `status normal`, free 3.98 GB → không có áp lực buộc trả thêm.
    → Con số "giữ lại" là **PSS kế toán**, RAM vật lý thực bị chiếm nhỏ hơn nhiều. *Phép thử tuyệt
    đối (chưa cần chạy):* ép áp lực bộ nhớ thật rồi đo lại — chỉ làm nếu sau này thấy máy Gú ì.
- **v1.38.1 — sửa lỗi index nhầm `IMAGE_PAGE_MARKER` (lỗi của chính v1.38.0).**
  App KHÔNG hề biết marker này nên coi nó là chữ. Hậu quả: 13 tài liệu QA / 12 Prod nằm trong
  chỉ mục như thể tra được, gõ chữ trong đó thì không ra gì mà cũng không có dấu hiệu nào báo,
  cộng thêm token rác trong bảng.
  - Sửa: `isReadableText()` loại cả chuỗi rỗng lẫn marker; đếm riêng **`imageOnly`** = sidecar CÓ
    đơn vị nhưng KHÔNG đơn vị nào đọc được chữ (khác hẳn ca sidecar rỗng/hỏng — đó là lỗi worker).
  - **Nói ra cho người dùng biết** thay vì im lặng: màn Tìm hiện "đã đọc N tài liệu · M tài liệu
    là ảnh, chưa tra được chữ", và khi không tìm thấy gì thì nhắc thêm dòng đó.
  - **`SCHEMA` chỉ mục 1 → 2** để mọi máy tự dựng lại — mảnh cũ đang mang token rác, không vá
    tại chỗ được.
  - **CÒN PHẢI XÁC NHẬN:** repo app không nơi nào ghi **GIÁ TRỊ** của marker, chỉ ghi TÊN — bản
    thân đó là lỗ hổng của hợp đồng "khớp 3 nơi" (§5). Hằng số hiện đặt là chuỗi
    `'IMAGE_PAGE_MARKER'` ở `src/search/invertedIndex.ts`. **Cách kiểm không cần hỏi ai:** mở màn
    Tìm trên máy QA — nếu hiện đúng **13 tài liệu là ảnh** thì hằng số đúng; ra 0 thì sai, sửa
    đúng một dòng đó. Nên bổ sung giá trị marker vào `gu-library-sidecar-schema.md`.

- **v1.38.0 — TÌM KIẾM TOÀN VĂN (mở Phase 2 lớp tri thức).** Màn Tìm từ bề mặt rỗng thành tra
  thật: gõ tới đâu tìm tới đó, kết quả là ĐOẠN TRÍCH có tô sáng kèm môn/tài liệu/nhãn/trang, chạm
  là mở đúng trang (`/viewer/<uri>?p=N`). **Gõ KHÔNG DẤU ra kết quả CÓ DẤU** — yêu cầu gốc của
  spec §7. Huynh test tay rồi duyệt và merge 05/09; tag `v1.38.0`.
  **CHƯA lên máy Gú** — Prod vẫn đang ở bản trước v1.37.0, hai beat này đẩy sang lúc nào là quyết
  riêng (§7: máy Gú chỉ nhận bản đã nghiệm thu).
  - **Chỉ mục nằm trong IndexedDB của máy, KHÔNG vào cây Syncthing** (spec §4.3 dữ liệu phái sinh).
    Hỏng thì xoá dựng lại — có cần gạt **"Dựng lại chỉ mục tìm kiếm"** trong Cài đặt.
  - **`SafPlugin.listFolder` nay trả thêm `size` + `lastModified`** trong CÙNG cursor (không tốn
    thêm vòng SAF). Đây là dấu vân tay để chỉ đọc lại file đã đổi. **`-1` = provider không trả cột
    đó → phải coi là ĐÃ ĐỔI, tuyệt đối không coi hai cái "không biết" là bằng nhau.**
  - **Số đo trên UBS1 (6GB, kho QA 178 tài liệu · 147.777 đơn vị · 20,8M ký tự):**
    | | |
    |---|---|
    | dựng lần đầu | **14,0 s** (đọc 63% · tách từ 35%) — có màn tiến độ |
    | lần mở sau | vào thẳng ô nhập; lối tắt "kho không đổi" khỏi đụng IndexedDB |
    | tra một từ | **1–3 ms** |
    | chỉ mục | **24,6 MB** trong IndexedDB |
    | bộ nhớ màn Tìm | **303 MB** lắng · đỉnh tạm **389 MB** (nền Home 174 MB) |
  - **Đọc sidecar bằng `Saf.readFile`, KHÔNG phải fetch qua local-server** — ngược với suy đoán ban
    đầu, đo được 8,7 s so với 14,2 s cho 178 file. Bài học OOM v1.4.1 là về **MỘT** file 64 MB dựng
    String ~170 MB; sidecar trung bình 330 KB nên không chạm trần, còn fetch trả giá mỗi file
    (probeReadable + một vòng HTTP × 178). **Luật: nhiều file nhỏ → bridge, một file lớn → fetch.**
  - **Đã verify tay trên máy:** gõ "dat dai" ra 50+ đoạn tô đúng cả `ĐẤT ĐAI`/`Đất đai`/`đất đai` ·
    chạm kết quả mở đúng trang 290/667 và 31/46 · lần mở sau không dựng lại · chạm `mtime` một
    sidecar thì chỉ cập nhật chứ không dựng lại từ đầu.
  - **CÒN TREO, chưa làm trong beat này:**
    1. **Chỉ mục nằm lại trong RAM sau khi rời màn Tìm** (Ionic giữ trang sống) → app ôm thêm
       ~130 MB tới hết phiên. Chưa thấy hại trên máy 6GB nhưng là món đầu tiên nên gỡ nếu Gú kêu ì.
    2. **Xếp hạng còn thô** (nguyên cụm > khớp sớm > đơn vị ngắn), chưa có TF-IDF, và trần 50 kết
       quả nên chưa biết tổng thật.
    3. **Cross-link tới Điều (spec §8) chưa làm** — chỗ đắt của nó không phải nhận diện tham chiếu
       mà là làm cho nó BẤM ĐƯỢC: Viewer render bằng pdf.js ra canvas, không có lớp text.
    4. **Kho Prod của Gú khác kho QA** (QA 178 tài liệu, Ops doc ghi Prod ~107) → lần dựng đầu bên
       Prod sẽ nhanh hơn, nhưng chưa đo.
  - **SỐ OCR ĐỆ BÁO 05/09 LÀ SAI — đã sửa ở v1.38.1.** Đệ đếm "tài liệu rỗng text" bằng tiêu chí
    `text` RỖNG THẬT → ra 1/178. Phiên worker đếm bằng tiêu chí đúng (mọi unit là
    `IMAGE_PAGE_MARKER`) → **QA 13/178 (7,3%) · Prod 12/113 (10,6%)**. Hai số khác nhau vì
    **marker là chuỗi KHÔNG rỗng**, nên v1.38.0 đã **index marker như chữ thật**: tài liệu ảnh
    nằm trong bảng như thể tra được, gõ gì cũng không ra, lại đẻ token rác. Xem v1.38.1.
  - Chi tiết spike dẫn tới thiết kế này: `Docs/perf/2026-09-05-spike-search-index.md`.

- **v1.38.0 verify trên dGen1 (05/09) — CHẠY ĐÚNG, kèm 3 bài học về máy này.**
  Dựng chỉ mục 178 tài liệu · nạp lại sau reboot vẫn đúng · gõ "dat dai" ra 50+ đoạn tô đúng ·
  cần gạt "Dựng lại chỉ mục" hoạt động (lần đầu bấm thử).
  - **Bộ nhớ (chính + renderer):** Home sạch **250 MB** → màn Tìm **433 MB** (**+183 MB**).
    So với UBS1: 174 → 303 (+129 MB). Chỉ mục tốn nhiều hơn trên dGen1 — WebView 124 cũ hơn,
    máy khác lớp. 433 MB trên máy 7,59 GB là thoải mái.
  - **BẪY 1 — MÀN ĐEN sau nhiều lượt `am force-stop` (KHÔNG phải lỗi app).** Log của chính tiến
    trình app: `cr_ChildProcessConn: Failed to establish the service connection` + `Fallback to
    …SandboxedProcessService1` → WebView KHÔNG bind được tiến trình con sandbox → không có
    renderer → màn đen, dù activity vẫn resumed, RAM còn 5 GB, không lmkd, không crash.
    **`am force-stop com.android.webview` KHÔNG cứu được. REBOOT máy thì hết.** Chỉ xuất hiện sau
    chuỗi force-stop liên tiếp do adb — người dùng thật không gặp. Gặp lại thì reboot, đừng đi
    tìm bug trong JS.
  - **BẪY 2 — tên gói WebView KHÁC THEO MÁY.** UBS1 là `com.google.android.webview`, dGen1 là
    `com.android.webview`. Script đo bộ nhớ hard-code tên gói của UBS1 nên trên dGen1 nó không
    tìm được renderer (may là có guard nên nó DỪNG chứ không báo số thiếu). Khớp theo `*webview*`.
  - **BẪY 3 — màn VUÔNG 480dp chật chiều dọc.** Home: mục "Môn học" bị thanh nav cắt ngang ngay
    từ đầu. Màn Tìm: bàn phím ăn quá nửa màn, chỉ còn chỗ cho ~1 kết quả. Không phải lỗi, nhưng
    là ca bố cục chưa từng có trong dự án — cân nhắc khi làm UI về sau.

- **v1.37.0 — Book Press raster.** Huynh duyệt và merge 04/09; tag `v1.37.0`.
  **CHƯA lên máy Gú** — Prod vẫn ở bản trước, đẩy sang khi huynh thấy đúng lúc (§7: máy Gú chỉ nhận
  bản đã nghiệm thu; beat này mới nghiệm thu trên MỘT máy QA là UBS1).
  Beat THÍ ĐIỂM cho hướng gáy-sách-raster bàn ngày 04/09: lấy máy ép làm miếng nhỏ nhất kiểm được
  cả chất asset lẫn perf raster trên WebView mà không đụng kệ. `BookPress.tsx` đổi từ SVG tự vẽ sang
  3 sprite cắt từ MỘT tấm ảnh Higgsfield bằng `scripts/make-press-sprites.py`.
  - **Trạng thái thành LIÊN TỤC** theo số tài liệu (bản SVG chỉ có 3 nấc 0 / 1–4 / ≥5). Phép ánh xạ
    tách ra `src/home/press.ts` — thuần, 12 test, cùng lối `shelf.ts`. Đổi khổ = sửa đúng `PRESS_H`.
  - **`PRESS_W` giữ ĐÚNG 83 như bản SVG.** Thử 122 rồi 88: cả hai đều bị packShelves đẩy xuống một
    tầng gần như trống (kho QA tầng 2 chỉ còn ~90px). Ảnh máy ép vốn bè ngang hơn hình SVG cũ nên
    muốn to hơn là phải chấp nhận kệ đẻ thêm tầng — đo được, không phải suy.
  - **Gate máy 6GB — ĐO 04/09 trên UBS1** (Android 14, RAM 5.89 GB, 720×1600 @320dpi, kho QA).
    A/B cùng máy, cùng kho, 3 lượt mỗi bản, PSS = chính + renderer:
    | | v1.36.0 (SVG) | v1.37.0 (raster) |
    |---|---|---|
    | PSS Home (trung vị) | **173 MB** (175/171/173) | **174 MB** (176/173/174) |
    | Janky frames khi cuộn kệ | 0.40% (0.81/0.40/0.40) | 0.41% (1.21/0.41/0.40) |
    | p90 / p95 khung | 11 / 11 ms | 11 / 11 ms |
    | APK | 4.97 MB | 5.08 MB (**+115 KB**) |
    → Chênh 1 MB nằm gọn trong dải dao động của CHÍNH nó (171–176). **Raster không tốn thêm gì
    đo được.** Chạm mở "Chưa phân loại" verify tay: đúng.
  - **Prompt sinh ảnh gốc (giữ để dựng lại được):** *"Product photograph of an antique cast-iron and
    dark walnut wooden book binding press (book press / nipping press), shot perfectly straight-on
    from the front, orthographic, symmetrical and centred. Dark aged wood with warm grain, aged brass
    fittings, a turned brass screw with a horizontal handle bar across the top, two vertical posts, a
    heavy flat base plinth, and a small blank brass nameplate on the front of the base. The press is
    EMPTY: absolutely no paper, no sheets, no book between the platen and the base. The brass
    nameplate is completely BLANK: no text, no letters, no engraving. Soft even studio lighting, warm
    museum-object look. Isolated on a plain flat white background. Sharp focus, high detail, 4K."*
    Model nano-banana qua Higgsfield, tỉ lệ 3:4. Ảnh gốc 6MB KHÔNG commit — chạy lại script với ảnh
    mới nếu cần đổi art.
  - **BA CÁI BẪY ĐÃ VẤP TRONG BEAT NÀY (đọc trước khi làm miếng raster tiếp theo):**
    1. **Tách nền bằng flood-fill từ biên thì vùng KÍN bị coi là vật thể.** Ô trống giữa xà–hai
       trụ–đế là vùng kín → lần đầu ra một mảng TRẮNG ĐỤC chắn ngang máy ép. Phải gieo thêm mầm
       nền ở TRONG ô đó (`WINDOW_SEED`). Cùng bẫy lần hai: xoá bàn ép RỒI mới tách nền cũng hỏng —
       phải tách nền trên ảnh GỐC rồi mới thay hàng.
    2. **Ngưỡng tách nền phải cắt được BÓNG ĐỔ studio, và nó nằm THẤP chứ không cao.** 228 giữ
       nguyên bóng thành mảng trắng cạnh đế; 185 mới sạch. Cách kiểm không cần mắt: đế sau khi tách
       phải ĐỐI XỨNG quanh cột tâm của xà (897) — ở ngưỡng 228 đế chạy tới x1791, lệch hẳn.
    3. **Máy có HAI `sandboxed_process0`** (app khác cũng xài WebView). `ps` chỉ hiện uid cách ly
       (`u0_i9017`) nên KHÔNG suy ra chủ; chỗ duy nhất nói ai là chủ là `dumpsys activity processes`,
       ghi dạng `u0a<uid-app>i<n>`. Lấy `head -1` của `ps` là đo nhầm app khác — đã đo nhầm thật.
       *(Bẫy anh em với bài học S20 FE, nhưng cách gắn UID ở đó KHÔNG áp dụng được cho máy này.)*
  - **BẪY THỨ TƯ, quan trọng nhất, áp cho CẢ APP: WebView KẸP CỠ CHỮ TỐI THIỂU ~8px — nhưng chỉ
    với chữ đặt bằng CSS.** Bảng đồng của máy ép cần chữ ~5px. Đặt `fontSize: 4.4px` trên `<div>`
    thì WebView âm thầm nâng lên ~8px, chữ tràn khỏi bảng (huynh bắt được trên máy). Đặt ĐÚNG cỡ
    đó trong `<svg viewBox>` — cỡ chữ tính bằng user unit rồi cả khung mới thu nhỏ — thì KHÔNG bị
    nâng. *Bằng chứng, hai lần đo mà hộp bảng khớp đúng số trong code:* bản `<div>` bảng 65 CSS px,
    chữ nominal 4.4px (đáng lẽ ~31px) **tràn khỏi 65px**; bản `<svg>` bảng 66 CSS px, chữ rộng
    **40 px, lề 13px mỗi bên** — đúng cỡ 23 user unit × 0,243 ≈ 5,6px như đặt.
    → **Luật giữ về sau: chữ nhỏ hơn 8px BẮT BUỘC đi đường SVG có viewBox, không dùng CSS
    font-size.** (Đường khác là chỉnh `WebSettings.setMinimumFontSize(1)` ở tầng native — sửa được
    cả app nhưng đụng vỏ app, không làm trong beat áp da này.) Bản SVG cũ vốn đã đúng đường này;
    lỗi sinh ra đúng lúc đệ đổi nó sang `<div>`.
  - **Hai lỗi tự gây nữa, đã sửa, ghi lại vì dễ tái phạm:**
    (a) đệ đổi chữ trên bảng thành "CHƯA ĐÓNG GÁY" theo bản vẽ AI, trong khi bản gốc ghi
    "Chưa phân loại" cho khớp tên folder dùng ở Import / "Chuyển tới…" — beat áp da KHÔNG được
    đổi chữ; (b) `overflow:hidden` trên bảng XÉN MẤT DẤU tiếng Việt ("ĐÓNG GÁY" ra "ĐONG GAY"),
    vì dấu nhô cao hơn thân chữ — chặn tràn phải bằng cỡ chữ chứ không bằng kéo.
    Và (c) khối hai dòng chữ CAO HƠN bảng thì phép căn giữa ra số ÂM, nét trên chọc lên khỏi mép —
    nay `INK_TOP`/`INK_BOTTOM` tính trong `press.ts` và có test chặn.
  - **Còn để ngỏ:** xấp giấy vẫn là khối CSS phẳng cạnh cỗ máy chụp thật — hợp mắt ở khổ 83px nhưng
    là chỗ chênh chất liệu rõ nhất nếu sau này phóng to.

- Worker **v0.13.0** — hai task rclone đã triển khai và đang chạy; OAuth Drive đã setup.
  **Không còn nợ hạ tầng.** Beat gần đây: ảnh→PDF 1 trang (v0.12.0), archive gốc
  `.doc`/`.ppt` thay vì xóa (v0.13.0). Nợ Phase 2 đã đặt cọc: re-extract cấu trúc từ
  các nguồn `.doc`/`.ppt` đã archive (làm cùng lúc thiết kế search).
- Backlog cũ (M10 folder-level, breadcrumb, nav chữ-bên-icon) đã **giải quyết xong** (M10 +
  breadcrumb đã làm; nav = won't-do). **Không còn backlog feature Phase 1 mở.** Nguyên tắc giữ
  nguyên: không mở beat mới cho tới khi có vấn đề quan sát được từ người dùng thật — không suy
  diễn nhu cầu. (Các beat v1.20→v1.25 vừa qua đều xuất phát từ feedback thật của Gú khi dùng.)
