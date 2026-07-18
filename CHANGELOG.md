# Changelog

Theo [Semantic Versioning](https://semver.org/). Mỗi milestone Phase 1 = một minor; polish/sửa lỗi = patch.

## [1.25.1] — 2026-07-18 — Fix đổi tên thư mục sang biến thể hoa/thường của chính nó ra "(1)"
### Fixed
- Đổi tên môn/thư mục con sang **biến thể CHỈ khác hoa/thường của chính nó** ("Luật Công chứng" → "Luật Công Chứng", "Slide" → "slide") trước đây ra **"… (1)"**. Gốc: đĩa Samsung case-insensitive → `renameDocument` thẳng sang tên đích bị coi là "đã tồn tại" (chính thư mục đang đổi) → provider tự đẻ "(1)". Nay khi phát hiện case-only (`isCaseOnlyChange`, TDD) → đổi **2 bước**: qua tên tạm duy nhất (`<tên>-gu-case-<timestamp>`, không đụng ai) rồi mới sang tên đích (FS lúc này thấy tên đích trống) → ra ĐÚNG tên, không "(1)". Lỗi có sẵn từ rename v1.22.0, lộ khi QA v1.25.0. Không đụng native, không dep mới.

## [1.25.0] — 2026-07-18 — Toast phản hồi cho thao tác đơn (giọng Gú)
### Added
- **Toast báo thành công cho MỌI thao tác ĐƠN** (trước đây chỉ thao tác LÔ mới có): đánh dấu/bỏ "cần in" 1 tài liệu, xóa 1 tài liệu, đổi tên 1 tài liệu, chuyển 1 tài liệu (màn duyệt); **đổi tên + xóa thư mục con** (màn duyệt); **đổi tên + xóa môn** (Home — trước Home không có hệ toast); **tick "cần in"** trong Viewer. `DeleteFolderConfirm.onDeleted` chỉ fire khi xóa THẬT thành công → không báo nhầm lúc bị chặn (còn file chờ).
### Changed
- Tách hệ toast 3 trạng thái của FolderPage (v1.11.0) thành **hook dùng chung `useGuToast()`** (`src/lib/useGuToast.tsx`) — giữ nguyên palette nâu/kem + animation (loading icon quay / success tích xanh / error đỏ đất, tự đóng 3s + nút X); Home + màn duyệt + Viewer cùng dùng, không fork.
- Câu toast đổi sang **giọng Gú thân thiện** ("… gòi nha!") đồng bộ cả đơn lẫn lô: "Đã đánh dấu cần in gòi nha!" / "Đã bỏ đánh dấu in gòi nha!" / "Đã xóa tài liệu gòi nha!" / "Đã đổi tên gòi nha!" / "Đã chuyển tài liệu gòi nha!" / "Đã xóa môn gòi nha!" / "Đã xóa thư mục gòi nha!"; toast lô cũng nhận đuôi "gòi nha!" cho đồng tông (câu lỗi giữ nguyên, thông tin). Không đụng dữ liệu/sidecar, không dep/token mới.

## [1.24.0] — 2026-07-18 — Định vị khi cây sâu: phụ đề rút gọn + avatar màu thuần
### Changed
- **Phụ đề "Đang đọc dở" định vị tới thư mục cha** (thay vì chỉ tên môn): hiện môn + đường dẫn thư mục con của tài liệu, **RÚT GỌN theo ĐÚNG luật `…` của breadcrumb** (tái dùng `folderHeaderTitle` v1.15.0/v1.20.0 qua helper mới `readingLocator` — KHÔNG viết logic định vị thứ hai). Tài liệu nằm thẳng trong folder môn → chỉ tên môn (không `/`/`…` thừa); sâu → "… / Cha / Hiện tại". Hai tài liệu cùng môn khác thư mục con giờ phụ đề KHÁC nhau, đọc ra được đang ở ngăn nào. Cả card Home (`ContinueReadingCard`) lẫn sheet "Xem tất cả" (`ReadingListSheet`); phụ đề dài → cắt gọn `ellipsis` một dòng, KHÔNG xuống dòng vỡ thẻ. **Màn "Đi in" KHÔNG đổi** (đã nhóm theo môn bằng header nhóm → nhét path vào từng dòng là lặp). Trade-off đã chấp nhận: hai thư mục con trùng tên ở hai nhánh (cùng ra "… / Buổi 2") không giải — full path vỡ layout Flip gập.
- **Avatar môn bỏ chữ cái, còn ô màu thuần** (`MonSwatch`): màu là thứ Gú chủ động gán qua picker màu môn (v1.5.0) và nhớ; chữ cái là thứ máy tự suy — thường trùng/sai với tên luật tiếng Việt (Công chứng / hành chính / Lao Động đều ra `L`). Bỏ cái tự-suy-sai, giữ cái người-chủ-động; gỡ luôn prop `icon` (override chữ) không còn cần. KHÔNG thêm quy tắc "đoán chữ thông minh" (strip tiền tố / initials) — mỗi quy tắc là một ổ ca-biên. "Chưa phân loại" giữ nguyên ô `?` viền gạch-đứt (mục built-in, không phải môn có màu). Trade-off: số môn > palette → màu lặp, CHẤP NHẬN (không tệ hơn nhiều ô cùng chữ `L`); không mở rộng palette beat này.
- Helper `readingLocator` (TDD, `folderHeader.ts`). Không đụng dữ liệu/sidecar, không dep/token mới. Backlog "nav chữ-bên-icon" (tab bar tùy biến) đóng sổ — sẽ không làm.

## [1.23.1] — 2026-07-18 — Empty-state thân thiện khi thư mục bị xóa từ máy khác
### Fixed
- Khi đang đứng bên trong một thư mục mà nó bị **xóa từ máy khác** (Syncthing rải về / worker) rồi mở tiếp thư mục con, màn duyệt trước đây hiện **dòng lỗi trần** ("Không đọc được thư mục: list failed: … FileNotFoundException…"). Nay thay bằng **empty-state panda buồn** (giống Viewer v1.14.0): panda + "Uh oh" + câu giọng-Gú **"Thư mục đã bị xóa gòi dợ iu! Nếu là xóa nhầm thì liên hệ chùn để khôi phục."** + nút **"Về Trang chủ"**. (Ca mở FILE trong thư mục bị xóa đã dùng panda này từ v1.14.0.)
### Changed
- Tách empty-state panda thành component chung `SadPandaState` (panda + tiêu đề + câu + nút về Home), dùng chung cho `ViewerPage` (không mở được tài liệu) và `FolderPage` (thư mục bị xóa) — không fork. Không đổi logic đọc/list, không dep/token mới.

## [1.23.0] — 2026-07-18 — M10b phần 2: xóa môn + thư mục
### Added
- **Xóa môn** (vuốt trái hàng môn ở Home → "Xóa" đỏ, cạnh "Đổi tên") và **xóa thư mục con** (vuốt trái hàng thư mục → "Xóa"). Hộp xác nhận (`ConfirmDialog` v1.13.0) **nêu SỐ LƯỢNG thật, đếm ĐỆ QUY cả cây**: "Bên trong … có N tài liệu và M thư mục con" (rỗng → "… đang trống", không "0 tài liệu"). KHÔNG dọa "không thể hoàn tác" (sai — có `.stversions`, và không phải giọng app; bài học v1.13.0) — nêu số lượng là đủ để Gú tự cân.
- **Xóa = xóa THẬT trọn cây trên đĩa** (`deleteDocument` trên dir = đệ quy cả file bên trong, gồm companion `.print.json`/`.display.json` → cờ đi-in + tên hiển thị dọn theo; `_print/` do worker tự lành). Reading entry của MÁY NÀY dưới cây → tombstone (`removeReadingSubtree`, cưỡi lên `removeEntry` v1.5.0 — không fork); entry máy khác trỏ path chết → `listReading` bỏ qua im lặng. Sau xóa không còn hàng ma ở Đang-đọc-dở / Đi-in.
- **CHẶN xóa khi còn file chờ ⏳** trong `_inbox/` dưới cây (kể cả thư mục con sâu) — worker mkdir-if-missing dựng lại thư mục ma. Hộp báo thân thiện 1 nút (`ConfirmDialog singleAction`), không thuật ngữ. App CHỈ đọc `_inbox` đếm, tuyệt đối không đụng. Helpers `foldCounts` (đếm đệ quy) + `deleteFolderMessage` (TDD).
### Changed
- KHÔNG thùng rác trong app — lưới an toàn là `.stversions` của Syncthing (~30 ngày, chốt từ v1.5.0). "Chưa phân loại" không có action Xóa (UI `onDelete` undefined). Component chung `DeleteFolderConfirm` (Home + màn duyệt); double-tap "Xóa" khi cây lớn được chặn (`busyRef`). Không đụng đổi tên v1.22.0, không dep/token mới.

## [1.22.0] — 2026-07-18 — M10b phần 1: đổi tên môn + thư mục
### Added
- **Đổi tên môn** (vuốt trái hàng môn ở Home → "Đổi tên") và **đổi tên thư mục con** (vuốt trái hàng thư mục ở màn duyệt → "Đổi tên") — cùng ngôn ngữ vuốt-trái v1.5.0, không pattern mới. Sheet đổi tên (`RenameModal`) điền sẵn tên hiện tại, nhãn "Tên môn"/"Tên thư mục" theo ngữ cảnh, nút "Lưu".
- **Rename THẬT** thư mục trên đĩa (`SafPlugin.renameDir` → `DocumentsContract.renameDocument`) — tên trong app khớp tên thật ở mini PC + Drive, KHÔNG dùng companion display-file (thư mục do Gú đặt → sửa cái thật). Companion `.print.json`/`.display.json` + cờ đi-in của tài liệu bên trong theo thư mục tự động (rename dir tại chỗ). Entry đọc-dở của MÁY NÀY tự dời theo (`renameReadingSubtree` đổi prefix path cả cây); entry máy khác trỏ path cũ → `listReading` lọc im lặng (sẵn từ v1.5.0).
- **Chặn đổi tên khi còn file chờ ⏳** trong `_inbox/` dưới thư mục (kể cả thư mục con) — vì tiền tố `_inbox/` trỏ tên cũ, worker mkdir-if-missing sẽ dựng lại thư mục ma. Báo thân thiện ("Đang có N file chờ xử lý ở đây, chờ chút rồi thử lại nhé"), không thuật ngữ. App CHỈ đọc `_inbox/` để đếm, tuyệt đối không ghi/migrate tiền tố (né race worker). Helper `parseInboxPath` (parse đủ tầng ngoặc) + TDD.
### Changed
- Ô nhập floating label tự-vẽ (v1.21.0) tách thành component chung `NameField`, dùng lại ở cả `CreateFolderModal` (Tạo) lẫn `RenameModal` (Đổi tên) — không fork, không quay lại floating-label native Ionic.
- Hàng thư mục con (v1.5.0 "không action") giờ mở đúng một action vuốt "Đổi tên"; long-press vẫn chọn-nhiều-tài-liệu, hàng thư mục vẫn không tick được (v1.6.0). "Chưa phân loại" không có action đổi tên (worker phụ thuộc). Tên qua `validateFolderName` (chặn `[ ] /` / đầu `_` / rỗng) như cũ. Không đụng breadcrumb v1.20.0, không dep/token mới.
- **Trùng tên KHÔNG PHÂN BIỆT HOA/THƯỜNG** (ở cả Tạo lẫn Đổi tên): đĩa Samsung case-insensitive nên "Slide" vs "slide" đụng nhau → provider tự đẻ `(1)`; giờ chặn theo case-insensitive (`toLowerCase`) → **không bao giờ ra `(1)`**. Câu báo theo ngữ cảnh (`dupFolderError`): "Môn đã tồn tại gòi dợ iu" / "Thư mục cùng tên gòi dợ iu".
- Swipe trên thẻ môn bo góc (Home): div bọc ngoài bo góc + `overflow:hidden`, `IonItem --border-radius:0` → thẻ và nút vuốt liền một khối (như `ReadingListSheet`), không hở góc.

## [1.21.0] — 2026-07-17 — Ô nhập tên floating label + fix chữ sai sheet "Môn mới"
### Fixed
- Sheet **"Môn mới"** (Home → `+` heading Môn học) trước đây placeholder ghi *"Nhập tên thư mục…"* dù đang tạo MÔN — chữ sai. Gốc: chuỗi hardcode dùng chung cho cả hai sheet. Nay nhãn/placeholder suy từ prop `noun` theo ngữ cảnh ("môn" ≠ "thư mục") → hết sai.
### Changed
- `CreateFolderModal` (dùng chung "Môn mới" + "Thư mục mới") đổi ô nhập sang **floating label TỰ VẼ** ở light-DOM (viền + nhãn do component dựng; `IonInput` chỉ lo phần nhập, trong suốt, KHÔNG viền/nhãn riêng), bỏ dòng nhãn tĩnh "Tên". Bốn trạng thái: **mặc định** (nhãn "Tên môn"/"Tên thư mục" canh GIỮA ô, không placeholder); **focus** (nhãn trượt lên viền, thu nhỏ + đậm, nền kem cắt viền, placeholder "Nhập tên môn…"/"Nhập tên thư mục…" hiện, viền/nhãn nâu `--gu-brown`); **đã nhập** (nhãn trên viền, placeholder ẩn); **lỗi** (viền/nhãn/dòng lỗi đỏ `--ion-color-danger`, GIỮ NGUYÊN chữ lỗi cũ). Trượt ~190ms ease-out, chỉ trượt-không-nảy. Thêm prop `noun` (HomePage="môn", FolderPage="thư mục"). **Lý do tự vẽ thay vì floating-label native của Ionic:** nhãn native nằm trong shadow DOM, canh bằng `translateY(100%)` phụ thuộc metric từng WebView → **lệch khác nhau giữa các máy** (đo thật: Z Fold 3 WebView 150 vs Flip 4 WebView 149 lệch ~14px, không host-CSS nào hoà giải được vì không chạm được shadow). Nhãn tự vẽ canh giữa bằng `top:50% + translateY(-50%)` THẬT → render **giống hệt mọi WebView** (đo lại: cả hai máy lệch ~−0.7px, đồng nhất). KHÔNG đổi luồng validate/tạo (nút "Tạo" vẫn không disable, bấm rỗng vẫn báo đỏ); KHÔNG trạng thái disabled; phần Màu môn giữ nguyên; không dep/token mới.

## [1.20.0] — 2026-07-17 — Breadcrumb header bấm-nhảy-tầng
### Added
- Header màn duyệt thư mục (FolderPage) giờ **bấm-nhảy-tầng**: chạm tên một tầng cha → nhảy thẳng lên thư mục đó (tầng cuối đang đứng KHÔNG bấm). Khi cây sâu >2 tầng, prefix **`…`** bấm được → mở `IonPopover` liệt kê ĐỦ + đúng thứ tự các tầng cha bị nuốt (kể cả tầng môn), chạm một mục = nhảy tới. Component mới `src/components/HeaderBreadcrumb.tsx` — giữ NGUYÊN quy tắc rút gọn `folderHeaderTitle` v1.15.0 (1 tầng=môn / 2=`Môn / Thư mục` / ≥3=`… / Cha / Hiện tại`), chỉ thêm khả năng bấm. URI mỗi tầng resolve qua `khoSnapshot.folderByPath`; tầng cuối = URI hiện tại. Nhảy tầng dùng `useIonRouter().push(path, 'back')` → **thu gọn stack** (unwind tới view tổ tiên đã có) nên back từ tầng vừa nhảy về đúng CHA của nó, KHÔNG quay lại tầng sâu vừa rời. **Chỉ nhảy LÊN** — không dropdown thư mục con, không nhảy ngang anh-em (cân nhắc, quyết không làm; thiết kế hiện tại là tập con, nâng cấp sau không phải làm lại). Vùng chạm mỗi tầng `min-height:44px`; header `overflow:hidden` + ellipsis tầng cha/hiện-tại → không tràn/xuống dòng trên Flip gập. Không dep/token mới, không đụng luồng dữ liệu/listing. Back arrow + tab bar giữ nguyên (không thêm icon Home).

## [1.19.0] — 2026-07-13 — App nhận file ảnh (jpg/png/webp) vào kho
### Added
- Mở các đường nhập sẵn có để nhận thêm **ảnh** (jpg/jpeg/png/webp) — Gú chụp/lưu ảnh bài báo đưa vào kho như mọi file. Ảnh đi ĐÚNG luồng import cũ (chọn/nhận môn → áp tiền tố `[Môn]` → dedup `(1)` → vào `_inbox/` → badge ⏳), không luồng riêng. Thay đổi thuần native 3 điểm: (1) `SafPlugin.mimeForName` map `image/jpeg|png|webp` (mime khớp đuôi để SAF provider giữ đuôi, không gắn `.tmp` → worker mới nuốt); (2) `SafPlugin.pickFiles` whitelist thêm 3 mime ảnh (picker "Chọn file từ máy" cho chọn ảnh); (3) `AndroidManifest` intent-filter SEND/SEND_MULTIPLE thêm 3 mime ảnh (app hiện trong share sheet Gallery). Whitelist LOẠI CỤ THỂ (không `image/*`) → né HEIC/gif worker chưa xử sẽ kẹt ⏳. JS-side ext-agnostic sẵn (prefix/importBatch/badge không lọc đuôi) — không đổi. **Coupling deploy: worker phải xử ảnh→PDF TRƯỚC khi bản này lên Prod, nếu không ảnh nằm ⏳ vô hạn.** Không OCR, app KHÔNG xử ảnh.
### Fixed
- **Chống tạo trùng `_inbox (k)` + môn biến mất** (lỗi tiềm ẩn pre-existing, lộ ra khi nhập nhiều ảnh liên tiếp): khi worker/Syncthing vừa xóa+tạo lại `_inbox`, cache `DocumentFile.findFile` trả stale → `ensureDir` tưởng chưa có → `createDirectory` → Samsung auto-dedup ra `_inbox (1)`, `(2)`… File vào đó thành mồ côi (worker chỉ quét `_inbox`) và snapshot coi `_inbox (k)` là môn rồi throw → **cả danh sách môn biến mất** (data KHÔNG mất, chỉ hiển thị rỗng). Ba lớp sửa: (1) `SafPlugin.ensureDir` dò con bằng cursor `DocumentsContract` TƯƠI trước khi tạo (né cache stale) + nếu vẫn bị dedup thì xóa bản rỗng, trả bản gốc → không bao giờ đọng `_inbox (k)`; (2) `buildSnapshot` lọc môn theo tiền tố `_` (`!startsWith('_')`) thay vì so đúng `_inbox`/`_print` → folder hệ thống không bao giờ bị nhầm là môn; (3) `buildSnapshot` bọc try/catch TỪNG môn → một folder URI stale chỉ rớt đúng môn đó ở lần tải này, không giật sập toàn bộ danh sách. (Đợt churn cực đoan còn có thể làm DocumentsProvider của OS trả cursor rỗng tạm thời — dọn bằng reboot; ba lớp trên chặn nguồn churn nên không tái diễn.)

## [1.18.0] — 2026-07-11 — Popup nhập xong thêm nút "Thêm tiếp"
### Added
- Popup "Đã nhập N/N file" (luồng chọn-file-từ-máy) thêm nút **"Thêm tiếp"** (secondary, `fill="outline"`) cạnh "Xem kho" (giữ vai primary). Bấm → đóng popup → mở lại đúng file picker của nút "Chọn file từ máy" (tái dùng `pickFiles`, không luồng nhập mới) → nhập nhiều đợt liên tiếp không phải quay lại màn Thêm. Đóng modal HẲN rồi mới mở picker qua `IonModal.onDidDismiss` + cờ `pendingAddMore` (né picker bị nuốt sự kiện trên Capacitor nếu bật khi modal chưa đóng hết). `onAddMore` là prop **optional** → luồng share (ShareReceiver) không truyền nên giữ nguyên 1 nút "Xem kho". Không dep/token/component mới.

## [1.17.0] — 2026-07-08 — Heading "Đang đọc dở" thêm lối vào "Xem tất cả ›"
### Added
- Heading "Đang đọc dở" (Home) thêm nhãn **"Xem tất cả ›"** bên phải (đối xứng vị trí "+" của heading "Môn học") → mở đúng sheet danh sách đầy đủ đã có (v0.8.0). Chỉ hiện khi **≥2** tài liệu đang đọc dở (1 cái đã nằm ở card, mở sheet 1 dòng là thừa). Chevron `chevronForward` = ngôn ngữ "drill/mở list" (như cuối mỗi hàng môn), tách bạch với chip mũi tên "đọc tiếp" trên card (v1.16.0). Tái dùng token nâu `--gu-brown`, không token mới.
### Changed
- Bỏ lối vào "tap khu vực heading" mơ hồ cũ (`<div onClick>` bọc cả cụm) → thay bằng nút "Xem tất cả ›" rõ ràng, tránh hai lối chồng chéo. Chạm card vẫn = đọc tiếp (card tự `stopPropagation`).

## [1.16.0] — 2026-07-07 — Card "Đang đọc dở" thêm affordance đọc-tiếp
### Added
- Card "Đang đọc dở" (Home) thêm **chip tròn kem-mờ + mũi tên kem** (`arrowForward`) ở góc phải → tín hiệu "bấm để đọc tiếp" (CTA mời bấm, tương phản trên nền nâu đậm). Card vẫn là MỘT button tổng (chạm bất kỳ đâu = đọc tiếp); chip chỉ là affordance thị giác. Tái dùng `--gu-cream`, không token mới.

## [1.15.0] — 2026-07-07 — Header động theo path (Option C)
### Changed
- Header màn duyệt môn/thư mục **theo vị trí thật** thay vì hardcode "Môn / Chương": cấp 1 = tên môn; cấp 2 = "Môn / Thư mục"; cấp ≥3 = "… / Cha / Hiện tại" (giữ 2 tầng cuối để header hẹp Flip gập không tràn). `src/storage/folderHeader.ts` (`folderHeaderTitle` pure + TDD 6 test) từ relPath. CHỈ đổi text tiêu đề — không breadcrumb bấm-nhảy; back arrow giữ nguyên.

## [1.14.2] — 2026-07-07 — Căn lề ngang: Tìm / Thêm / Môn mới
### Fixed
- 3 màn Tìm / Thêm / sheet "Môn mới" nội dung dính sát mép → dùng biến `--padding-start/end` trên `IonContent` (class `ion-padding` VÔ HIỆU — cùng bệnh Home v1.10.0) → lề ngang 16px khớp Home; nút "Chọn file từ máy" không còn tràn.

## [1.14.1] — 2026-07-07 — Toast "back lần nữa để thoát" khớp palette
### Fixed
- Toast xác nhận thoát ("Nhấn back lần nữa để thoát") dùng palette neutral hệ toast v1.11.0 (`color="primary"` + `cssClass="gu-toast"` → nền nâu `#553B08` + chữ kem) thay nền xám mặc định Ionic. Toast neutral (không icon trạng thái); KHÔNG đổi luồng back-exit.

## [1.14.0] — 2026-07-07 — Empty-state khi không mở được tài liệu
### Changed
- **Thay dòng lỗi trần trong Viewer bằng empty-state tử tế** (khi v1.4.1 phát hiện OOM/file quá nặng): minh họa **panda buồn** (`src/assets/gu-mascot-sad.svg`, mascot app mặt buồn) căn giữa + tiêu đề "Uh oh" + câu thông báo giọng-Gú (GIỮ NGUYÊN lời) + nút **"Về Trang chủ"** (nâu bo tròn) → `history.push('/home')`.
- Bỏ nhãn kiểu "404" (sai ngữ cảnh — lỗi mở file, không phải 404). Palette + typography app (nền giấy, tiêu đề Merriweather, thân Montserrat).
### Notes
- CHỈ đổi lớp hiển thị lỗi; KHÔNG đụng cơ chế phát hiện "không mở được" của v1.4.1 (`readFileBase64` catch Throwable → setErr).
> Verify Flip 4 (temp-force err): empty-state panda nét (SVG vector) + "Uh oh" + câu cũ + nút; "Về Trang chủ" → Home. 113 test. Chờ verify 2 máy.

## [1.13.0] — 2026-07-06 — Xác nhận trước khi xóa (chống lỡ tay)
### Changed
- **Dialog xác nhận trước khi xóa** tài liệu — cả xóa lẻ (sheet "Tài liệu"/vuốt → Xóa) và xóa lô (chọn nhiều → Xóa). `src/components/ConfirmDialog.tsx` (IonModal nhỏ giữa màn, palette app): icon cảnh báo tròn (đỏ đất trên nền đỏ-đất nhạt) + tiêu đề + mô tả + **Hủy** (viền nhạt) / **Xóa** (đỏ đất nhấn mạnh). Bấm Xóa → chạy luồng xóa hiện có (v1.11.0 toast loading→success); Hủy → đóng, không xóa gì.
- Tiêu đề động: lẻ "Xóa tài liệu này?"; lô "Xóa {n} tài liệu?".
- **Bỏ text "không hoàn tác"** (kho có versioning Syncthing ~30 ngày — M8): mô tả trung tính + nhắc nhẹ "Vẫn khôi phục được từ bản sao đồng bộ (~30 ngày)". Thay 2 `useIonAlert` cũ (text dọa "Không hoàn tác").
### Notes
- Confirm chèn TRƯỚC loading toast; KHÔNG đổi logic xóa file bên dưới (runDelete/runBatchDelete v1.11.0 nguyên).
> Verify Flip 4: dialog lẻ "Xóa tài liệu này?" + lô "Xóa 2 tài liệu?" khớp mockup (icon + palette + Hủy/Xóa); Hủy → file còn nguyên trên đĩa. 113 test. Chờ verify 2 máy.

## [1.12.0] — 2026-07-06 — Modal import có tiến trình + Hủy
### Changed
- **Thay overlay "Đang nhập N/T…" (IonLoading v1.9.0) bằng modal tiến trình** (`src/import/ImportProgressModal.tsx`, dùng `IonModal` có sẵn): vòng % (SVG) + "Đang nhập {i}/{tổng}…" + "Vui lòng không tắt ứng dụng." + nút **Hủy**. Xong → modal success: dấu tích xanh + "Đã nhập {ok}/{tổng} file" + phụ đề + nút **Xem kho** (đóng modal, về Trang chủ). **CHỈ một điểm kết** — bỏ toast xác nhận lặp lại sau đó.
- **Hủy** = dừng nhập các file CÒN LẠI ở **ranh giới giữa hai file** (không cắt ngang file đang copy), GIỮ nguyên file đã nhập xong (không rollback): `importBatch` thêm `shouldCancel?()` kiểm ở đầu mỗi vòng → `break`.
### Notes
- Không đụng logic import/worker/baseline `.tmp`; chỉ đổi lớp UI + thêm khả năng dừng vòng lặp ở ranh giới file. % dựa trên tiến trình copy N/T (local ~150–230ms/file, copy-bound). Palette nâu/kem; ring nâu, tích xanh rêu.
> Verify Flip 4 (modal forced-open): importing (ring 60% "Đang nhập 3/5…" + Hủy) + success (tích xanh "Đã nhập 5/5 file" + Xem kho) khớp mockup. 113 test. Chờ verify 2 máy thật (picker → nhập → Hủy giữa chừng → Xem kho).

## [1.11.0] — 2026-07-06 — Toast lô 3 trạng thái (loading → success/error)
### Changed
- **Lô Xoá / Chuyển: toast 3 trạng thái** (một `IonToast` controlled morph, đúng 1 toast/lô — khớp coalesce v1.9.0): Loading = icon reload XOAY + "Đang {xoá|chuyển} {n} tài liệu…", bám tới khi lô resolve, KHÔNG X/không auto; Success = tích xanh rêu + "Đã {xoá|chuyển} {n} tài liệu", tự đóng 3s + nút X; Error (lô có lỗi) = "Đã {xoá} {x}/{n} · {y} lỗi", tự đóng + X. `{n}/{x}/{y}` từ số thật.
- **Lô In**: chỉ Success "Đã đánh dấu {n} cần in" (thao tác nhanh, không loading).
- Mở RỘNG toast Ionic (không hệ toast song song): nền nâu `#553B08` + chữ kem (`color="primary"` + contrast có sẵn); phân biệt trạng thái bằng MÀU ICON (`::part(icon)`: loading kem xoay, success `#90ab63`, error `#d6805c`); nâng toast lên trên thanh nav bằng `transform` host (`src/theme/toast.css`).
### Notes
- KHÔNG đụng logic xoá/chuyển/in tầng file (per-doc try/catch v1.6.0 + phản-ánh-tức-thì v1.9.0 giữ nguyên); chỉ đổi lớp thông báo.
- Ghi chú kỹ thuật: spinner qua `IonicSafeString` (HTML trong message) bị Ionic lọc → dùng icon reload xoay; toast lift bằng `transform` host (margin trên `::part(container)` chỉ đẩy nội dung, lộ dải nâu trống → cao lêu nghêu).
> Verify Flip 4: loading (reload xoay + "Đang xóa N…"), success (tích xanh + "Đã xóa N tài liệu" + X), compact + nằm trên thanh nav, palette nâu/kem. 113 test. Chờ verify 2 máy + trạng thái error/chuyển/in.

## [1.10.0] — 2026-07-06 — Nav "bung khi active" + tinh chỉnh lề
### Changed
- **Thanh nav dưới kiểu "bung khi active"** (`src/theme/nav.css`, CSS thuần — KHÔNG đụng điều hướng): inactive = chỉ icon, nâu-xám nhạt, hẹp (`flex-grow:1`); active = bung rộng (`flex-grow:1.9`), icon + chữ **nâu accent** (`--gu-brown`, KHÔNG trắng), chữ fade-in + trượt (`translateX -12px→0`), underline ngắn = bề rộng chữ (`scaleX 0→1`), icon bounce (overshoot). Chữ inactive ẩn bằng `max-width/opacity` (KHÔNG `display:none`) → screen-reader vẫn đọc đủ 4 nhãn.
- **Trang chủ + sheet "Đang đọc dở"**: sửa lề thẻ + header. `IonContent` dùng biến `--padding-start/end` (class `ion-padding` VÔ HIỆU trên IonContent → trước đó thẻ sát lề ~0) → thẻ inset 16px khớp màn "Đi in"; header "Đang đọc dở"/"Môn học" thêm `paddingInlineStart:16` → thẳng nội dung thẻ.
- **Sheet "Tài liệu"**: ô "Tên hiển thị" dùng `--padding-start` (thay `padding` vô hiệu) → chữ không còn dính viền trái.
### Notes
- Chỉ spacing + animation; KHÔNG đụng luồng dữ liệu/điều hướng/hành vi tab. Giữ palette nâu-giấy.
- Giới hạn Ionic: chữ nav nằm DƯỚI icon (stacked, shadow-DOM không cho đổi layout ngang không hack) — "bung/màu/underline/bounce" đều đạt; nếu cần chữ BÊN CẠNH icon phải làm tab bar tùy biến (đụng nav, để beat sau nếu muốn).
> Verify Flip 4: Home lề khớp Đi in (thẻ 16px, header thụt); nav active icon+chữ nâu + underline = bề rộng chữ, 3 tab kia icon-only. Chờ verify 2 máy + cảm nhận hoạt ảnh.

## [1.9.0] — 2026-07-04 — Hiệu năng đường GHI/ACTION (phản ánh tức thì + gom pháo)
### Changed
- **Phản ánh TỪNG tài liệu ngay khi op xong** (không đợi hết lô): xóa/chuyển → hàng biến khỏi danh sách ngay khi tài liệu đó xử xong ở tầng file; In lô → cờ in hiện dần; đổi tên → tên đổi liền. Cập nhật ảnh RAM của thư mục (`FolderPage` listing) từ kết-quả-đã-biết — filesystem vẫn là nguồn sự thật (không optimistic đoán trước khi ghi). Bỏ `refresh()` re-read cả folder sau mỗi op.
- **Gom pháo `khoChanged`**: `coalesceKhoChanged()` ([src/lib/khoEvents.ts](src/lib/khoEvents.ts)) gom mọi emit trong một lô thành ĐÚNG MỘT phát ở cuối (lô N file: N `khoChanged` → 1) — hết bão reload nền chen giữa thao tác. Vòng làm tươi theo sự kiện giữ nguyên vai như v1.8.0.
- **Import có trạng thái tiến hành nhìn thấy được**: overlay "Đang nhập N/T…" (`IonLoading` + `importBatch(onProgress)`) — file nguồn cloud (Drive) copy = tải mạng trong stream, có thể lâu; cho người dùng thấy nó đang về. (Đo Drive-vs-local: `Docs/perf/2026-07-04-import-drive-vs-local.md`.)
### Notes
- **KHÔNG đổi cái gì ghi xuống đĩa** — reading-state/tombstone/companion/dedup `(k)` giữ nguyên tuyệt đối; chỉ đổi NHỊP phản ánh + tần suất phát sự kiện. Toàn vẹn từng-cụm-một v1.6.0 giữ nguyên (lô lỗi giữa chừng: chỉ tài liệu đã xong mới phản ánh, báo ok/lỗi như cũ). Đường đọc v1.8.0 không đụng. Perf marks v1.7.0 giữ nguyên.
> Verify Flip 4 (đo tạm, đã gỡ): xóa lô 5 → **đúng 1 `khoChanged`** (trước: 5) + danh sách trơ về rỗng, file đầu biến ngay. 113/113 test (thêm `coalesceKhoChanged` TDD). Chờ verify 2 máy QA thật + số Drive.

## [1.8.0] — 2026-07-04 — Hiệu năng đường đọc (một walk chung + native bulk-query)
### Changed
- **Một lần tải = MỘT walk toàn kho chia chung** (`src/storage/khoSnapshot.ts`): dựng cây kho một lần trong RAM phiên (KHÔNG ghi file cache vào cây Syncthing), rồi `listMon` / `summarizeMon` / `countPrintFlagged` / `listInboxByMon` / `listReading` DẪN XUẤT từ cây đó — không consumer nào tự walk từ root nữa. Nội dung `_reading-*.json` vẫn đọc tươi mỗi lần (giữ đúng tiến độ). Sheet chọn đích dùng lại cây đã cache (0 SAF call thay 16).
- **Native `SafPlugin.listFolder`**: một truy vấn cursor `DocumentsContract` (id+name+mime cho cả đàn con) thay `DocumentFile.listFiles()` + `getName()`/`isDirectory()` hỏi provider TỪNG con (nameLoop chiếm 60–75% mỗi lần list). Interface không đổi → mọi caller nhanh lên.
- **HomePage**: một trigger tải lúc vào màn (`useIonViewWillEnter`), bỏ reload mount đúp; làm tươi giữ nguyên vai `khoChanged` (bỏ cache ở tầng module) + `resume` (đổi từ máy khác) → `invalidateKho()` rồi reload.
### Notes
- **Không đổi một pixel hành vi nhìn thấy; KHÔNG đụng đường ghi** (emit-per-op, mutate sau action để nguyên cho v1.9.0). Perf marks v1.7.0 giữ nguyên.
> Verify Flip 4 (đo tạm, đã gỡ): **cold start 17.6s → 1.32s (~13×)**; vòng SAF một cold start **~315 → 53**; dựng cây **2→1 lần/mount**; sheet chọn đích **16→0 SAF**; đối chứng 8 môn + đang-đọc-dở + badge khớp 100%; `khoChanged`→invalidate + `resume`→invalidate verified. Số đầy đủ: `Docs/perf/2026-07-04-ket-qua-v1.8.0.md`. 108/108 test. Chờ verify 2 máy QA thật.

## [1.7.0] — 2026-07-04 — Bộ đo hiệu năng nội bộ (đo, chưa sửa)
### Added
- **Perf marks 6 luồng xương sống**, neo ở mốc người dùng cảm nhận (vẽ xong trên màn): (1) khởi động → Trang chủ, (2) mở môn → danh sách, (3) mở tài liệu → trang đầu raster, (4) commit zoom → bản nét, (5) import lô → copy _inbox, (6) vào chế độ chọn nhiều. Marks = `performance.now()` diff + Map/array push (rẻ, không profiling thường trực → không observer effect); số đo chỉ giữ **in-memory** (không ghi file, không đẻ file trong cây Syncthing). Module `src/perf/perf.ts` (cap 30 mẫu/luồng).
- **Màn debug trong Cài đặt → "Đo hiệu năng (debug)"**: bảng last/min/median/max/n mỗi luồng + nút **Copy text** (clipboard, fallback textarea) + Làm mới + Reset. Người dùng thường không thấy gì khác (không popup, không auto-đo). Ghi rõ: số chỉ có nghĩa trên máy thật/release; mốc "mở" không gồm hoạt ảnh chuyển trang, "khởi động" không gồm phần native trước WebView.
### Notes
- Bản này **chỉ gắn thước đo, KHÔNG sửa hiệu năng** — baseline đo trên máy thật (Flip 4/Fold 3) làm nền cho beat sửa sau. Kèm beat điều tra riêng (`Docs/perf/2026-07-04-dieu-tra-hieu-nang.md`) đã chỉ đích danh thủ phạm (listReading walk-per-entry, Home reload đúp, emit-per-op → reload nền, native listFolder nameLoop…).
> Verify 2 máy (Z Flip 4 + Z Fold 3): đủ 6 luồng có số hợp lý, lặp cập nhật min/max/median, copy đọc được, người thường không thấy khác, Cài đặt hiện "Phiên bản 1.7.0". 104/104 test.

## [1.6.0] — 2026-07-04 — M10 phần 2: chọn nhiều + action lô (In / Chuyển / Xóa)
### Added
- **Nhấn giữ hàng tài liệu → chế độ chọn nhiều:** hàng đó tự tick, các hàng hiện checkbox, header "Đã chọn N" + nút X; tap = tick/bỏ tick (không mở); hàng thư mục + ⏳ không tick được. Thoát bằng X hoặc back cứng (ionBackButton priority 60 > global 50).
- **Thanh đáy: In lô · Chuyển · Xóa** — CƯỠI LÊN đúng hàm đơn v1.5.0 (loop, không fork): In lô = `setPrintFlag` mỗi doc (idempotent, KHÔNG toggle — file đã đánh dấu giữ nguyên); Chuyển lô = ChooseMonSheet một-đích → `moveDocument`+`moveReading` mỗi cụm (dedup `(k)` hợp nhất từng cụm); Xóa lô = xác nhận nêu SỐ LƯỢNG → `deleteDocument`+`removeReading` mỗi cụm. Per-doc try/catch → toast "xong/lỗi". Xong → thoát mode + refresh.
- Long-press (timer 450ms, huỷ khi ngón di >10px hoặc nhấc sớm) → KHÔNG phá tap-mở lẫn vuốt IonItemSliding.
### Fixed (v1.5.0, phát hiện lúc test)
- Vuốt hàng bấm In/⋯ xong → **menu vuốt tự đóng** (trước treo ở vị trí mở) — `IonItemSliding.close()` sau thao tác.
- Header Viewer **đổi sang tên đã rename gần như tức thì** (resolve tên song song đầu effect, không đợi PDF nặng load xong).
> Verify Z Flip 4: nhấn-giữ vào mode + tick/bỏ + thoát X/back; In lô giữ file cũ; Chuyển lô drill 2 cấp + dedup; Xóa lô nêu số lượng; ⏳ không lọt; tap/vuốt đơn không hồi quy. 95/95 test.
### Notes
- Còn: beat hiệu năng (snap nhẹ + load lần đầu máy mới chậm do Syncthing rải file). M10 folder-level (đổi tên/xóa môn, thư mục) chưa làm.

## [1.5.0] — 2026-07-03 — M10 phần 1: quản lý tài liệu (đổi tên / chuyển / xóa)
### Added
- **Vuốt trái hàng tài liệu → In · Xóa · ⋯** (bỏ nút In luôn-hiện). In = toggle cờ đi-in; Xóa = xác nhận rồi xóa; ⋯ = sheet 4 hành động (Đổi tên hiển thị / Chuyển tới… / In / Xóa). Folder con + hàng ⏳: không action.
- **Đổi tên hiển thị** = companion `<base>.display.json {name}` (KHÔNG rename file thật, KHÔNG ghi sidecar). Ưu tiên: `.display.json` > tên file. Hiện ở danh sách môn / Đang đọc dở / Đi in / header Viewer; sync qua Syncthing; để trống = về tên mặc định. Icon máy in nhỏ cuối hàng cho tài liệu đã chọn đi in.
- **Chuyển tới…** tái dùng nguyên sheet chọn đích v1.3.0 (drill / Gốc môn / Thư mục mới / Chưa-phân-loại) → dời **trọn cụm** (pdf + sidecar + companions) bằng copy(pdf stream)+write(json)+delete, **dedup `(k)` hợp nhất** cả cụm; reading-state máy mình dời sang đường dẫn mới (máy khác entry mồ côi → app lọc, trade-off chốt).
- **Xóa** = xóa trọn cụm + dọn reading máy mình (không thùng rác app; lưới = versioning Syncthing phía mini PC).
### Changed
- `Document` thêm `fileBase` (tên FILE — thao tác move/xóa/print theo cái này; `name` = hiển thị). Màn Đi in hiện tên-đổi nhưng đặt tên `_print/`/match vẫn theo `fileBase`. `ChooseMonSheet.onPick(path, destUri)` (move dùng destUri; import bỏ qua). `createSubfolder` trả uri.
- UX: In/Xóa/đổi tên reload KHÔNG xoá trắng list (hết "snap"); Xóa chạy nền (popup tắt ngay). Nút ⋯ xanh ô-liu (`#4A5D3A`, màu palette môn — không token mới).
> Verify Z Flip 4: vuốt In/Xóa/⋯, đổi tên mọi nơi + về mặc định, chuyển drill 2 cấp giữ cụm+trang đọc+cờ in, dedup đích trùng, xóa sạch cụm, folder không action. 95/95 test.
### Notes
- Hiệu năng (snap nhẹ vài chỗ, load lần đầu máy mới chậm do Syncthing rải file) → **beat riêng** (v1.6.0 phần 2 = chọn nhiều, hoặc beat hiệu năng).

## [1.4.1] — 2026-07-03 — Chết cho đẹp: file quá nặng không kéo sập cả app
### Investigation (logcat máy thật — root cause KHÁC giả định ban đầu)
- Repro (PDF 70MB/300dpi bypass `_inbox/` + sidecar giả để mở được) → app văng ra launcher. Logcat: **KHÔNG có `onRenderProcessGone`** (renderer không chết kiểu out-of-process). Thủ phạm thật: `FATAL EXCEPTION: CapacitorPlugins → java.lang.OutOfMemoryError: Failed to allocate 187MB at android.util.Base64.encodeToString ← SafPlugin.readFileBase64`. Tức đọc cả file rồi Base64 thành String khổng lồ → **OOM Java heap ở PROCESS CHÍNH**; `catch (Exception)` KHÔNG bắt `OutOfMemoryError` (là `Error`) → uncaught trên thread CapacitorPlugins → app chết (SIG 9). pdf.js/renderer chưa từng chạy.
### Fixed
- **`SafPlugin.readFileBase64` bắt `Throwable`** (gồm `OutOfMemoryError`) → `call.reject` êm thay vì để lọt uncaught. `readPdfBytes` reject → **ViewerPage hiện thông báo thân thiện + nút quay lại chạy, app KHÔNG chết, không mất trạng thái** (đúng "chết cho đẹp", còn tốt hơn reboot vì giữ nguyên ngữ cảnh).
- Thông báo lỗi Viewer (giọng thân thiện của Gú): là catch-all cho mọi lỗi tải tài liệu (chính = file quá nặng; cũng gồm quyền SAF bị thu hồi / file bị move-xóa).
- **Defense-in-depth:** lưới `bridge.addWebViewListener(onRenderProcessGone → true + recreate)` (MainActivity) + `CrashNotice` (thông báo sau khi tự khởi động lại) cho ca renderer CHẾT THẬT out-of-process (kiểu OOM lúc pinch-zoom v1.1.0) — không đụng ca readFileBase64 này nhưng giữ làm lớp đỡ chung.
> Verify Z Flip 4 (R5CT844VRCN): mở file 70MB → app sống, hiện thông báo, quay lại dùng tiếp bình thường; mở lại lần 2 không crash-loop; file thường không hồi quy.

## [1.4.0] — 2026-07-03 — M6b: nhập file dự phòng qua file picker (tab "Thêm")
### Added
- **Tab "Thêm" → nút "Chọn file từ máy"**: mở system file picker (multi-select), **whitelist pdf/doc/docx/ppt/pptx** ngay tại picker (không lọt ảnh/zip vào `_inbox/`). Chọn xong → **tái dùng nguyên sheet chọn đích v1.3.0** (drill thư mục con / Gốc môn / Thư mục mới / Chưa-phân-loại phẳng) → copy cả lô về MỘT đích. Huỷ picker/sheet → không side effect.
- Native `Saf.pickFiles()` (`ACTION_OPEN_DOCUMENT` + `EXTRA_ALLOW_MULTIPLE` + `EXTRA_MIME_TYPES` + DISPLAY_NAME).
### Changed
- **Một đường copy duy nhất** cho Share + picker: tách `importBatch()` (inboxRepo) + component `ImportDestinationFlow` (sheet + toast) dùng chung; `ShareReceiver` rút gọn dùng flow đó (hành vi Share giữ nguyên). Tiền tố lồng / dedup `(k)` trước đuôi / strip-tmp / mime-theo-đuôi không đổi.
- `AddStubPage` → `AddPage`. Không đẻ token màu mới (thẻ-rời/button hai bậc/Title-case giữ).
> Verify Z Flip 4 (R5CT844VRCN): picker multi + whitelist → sheet đích lồng → `_inbox/` tiền tố đúng + ⏳/badge; huỷ sạch; Share Intent không hồi quy. 85/85 test.

## [1.3.0] — 2026-07-03 — Share: chọn đích thư mục con (drill độ sâu bất kỳ)
### Added
- **Sheet "Lưu vào môn nào?" drill-down** (cùng một IonModal, không sheet chồng sheet): tap môn → bước 2 "Lưu vào đâu trong «môn»?" = **"Lưu vào «môn»"** (gốc) + danh sách thư mục con + **"Thư mục mới"** + nút back; thư mục con lại drill tiếp, độ sâu bất kỳ; mỗi cấp đều lưu-tại-đây / tạo con. "Chưa phân loại" luôn phẳng (không bước 2).
- **Tạo thư mục ngay tại sheet** (inline): "Thư mục mới" → `createSubfolder` (M6c) rồi chọn nó làm đích luôn — không đợi worker. Chặn tên tại UI: `[` `]` `/` `\` `: * ? " < > |`, tên bắt đầu `_`, rỗng/toàn space (`validateFolderName`).
- **Hợp đồng tiền tố lồng** (khớp worker v0.9.0): đích ghi bằng **lặp ngoặc mỗi cấp** `[Môn][Con] file.pdf`; gốc môn/Chưa-phân-loại = một ngoặc. `parseInboxPrefix` lấy **ngoặc đầu = môn** cho badge (file lồng vẫn đếm đúng dưới môn).
- Multi-share cả lô vẫn về MỘT đích (chỉ nay có thể sâu hơn); dedup `(k)` trước đuôi + strip đuôi tạm + mime-theo-đuôi giữ nguyên (không đụng luồng copy `_inbox/`).
### Notes
- **Điều kiện:** worker v0.9.0 (hiểu tiền tố lặp ngoặc) phải chạy trên mini PC trước khi cài app này.
- Tinh chỉnh nghiệm thu: tap môn LUÔN vào bước 2 (kể cả môn chưa có con → 2 hàng "Lưu vào «môn»" + "Thư mục mới") để tạo con được ở mọi môn.
> Verify Z Flip 4 (R5CT844VRCN): drill 1-3 cấp + tiền tố ngoặc đúng, tạo folder tại chỗ + chặn tên, Chưa-phân-loại phẳng, multi-share một đích, gesture sheet không hồi quy.

## [1.2.3] — 2026-07-02 — Fix chớp một nhịp khi commit zoom (Viewer)
### Investigation (soi source react-pdf, không suy từ model)
- Root cause ở `react-pdf 10.4.1 dist/Page/Canvas.js` (`drawPageOnCanvas`): khi `width` của `<Page>` đổi, effect set `canvas.width` mới (**xóa trắng pixel cũ ngay**) + `visibility:'hidden'` tới khi pdf.js render xong mới hiện lại → trong khoảng đó slot lộ nền kem = cú chớp. Không phải Page remount.
### Fixed
- **Overlay snapshot swap:** ngay TRƯỚC commit zoom (pinch-thả + double-tap), chụp pixel các canvas đang hiển thị (drawImage đồng bộ, dùng bounding-rect đã transform nên khớp cả preview scale) vào **một canvas overlay cỡ viewport** phủ lên trên (không cuộn theo); giữ tới khi mọi trang nhìn-thấy bắn `onRenderSuccess` (timeout 1.5s đỡ) rồi gỡ → cũ(mờ)→nét, **không còn khoảng trống/chớp**. Zoom liên tiếp nhanh: giữ overlay cũ, chỉ reset lưới đỡ. Double-tap khi đã fit-width: không swap (tránh treo overlay).
- Không đụng windowing/neo/nhớ-trang. Bộ nhớ tạm = 1 canvas cỡ màn hình (~vài MB).
> Verify Z Flip 4 (R5CT844VRCN): zoom in/out/double-tap/nhiều nhịp — không chớp, neo đúng, lật trang giữ zoom, nhớ-trang đúng; logcat phiên test: 0 renderer kill, 0 lmkd reclaim, 0 onTrimMemory từ app (biên OOM v1.1.0 giữ vững).

## [1.2.2] — 2026-07-02 — UX polish: gesture sheet + header nhóm + thẻ-rời "Đi in"
### Investigation (điều tra trước, 2 lần sửa hụt do suy từ model)
- **Gesture sheet:** đọc `@ionic/core` `modal/gestures/sheet.js` — trọng tài "cuộn nội dung vs kéo sheet" (check `scrollTop===0`) CHỈ chạy khi breakpoint max = 1; đổi max sang 0.92 vẫn hỏng. Đúng cơ chế = prop **`expandToScroll={false}`** (kéo-sheet chỉ bắt đầu khi nội dung ở đỉnh).
- **Header "Đi in":** header có dải nền kem (`--ion-background-color`), item nền giấy sáng hơn. Nhóm đầu dải mỏng (chỉ padding-top content) vs nhóm sau (thêm margin) → bất đối xứng. CSS `.print-group ion-list{padding-block:0}` thua specificity selector scoped của Ionic → phải inline style.
### Fixed
- **Sheet ("Đang đọc dở" + "Lưu vào môn nào?"): `expandToScroll={false}`** → kéo dọc trong danh sách = cuộn nội dung (sheet đứng yên); kéo header/grabber = di chuyển sheet; over-scroll đỉnh = đóng. Giữ 2 mức (`[0,0.92]`), vuốt-ngang-xóa vẫn chạy, nền Home khóa.
- **Header nhóm "Đi in" đồng đều:** padding NGANG ở IonContent (`--padding-start/-end`), padding DỌC tự chứa trong từng `h2` → dải nền header bằng nhau mọi nhóm (kể cả nhóm đầu).
- **"Đi in" thành thẻ-rời:** mỗi tài liệu = thẻ giấy bo góc (nền `--gu-paper-2`, cách nhau 10px, bo góc + overflow ở div bọc → nút "Bỏ" vuốt liền khối) — đồng bộ sheet "Đang đọc dở".
> Verify Z Flip 4 (R5CT844VRCN): sheet cuộn nội dung không kéo sheet + vuốt-xóa OK; header nhóm đầu = nhóm sau; "Đi in" thẻ-rời bo góc.

## [1.2.1] — 2026-07-02 — Fix badge "Chưa thấy mini PC" báo sai ở Prod
### Investigation (code trace)
- Badge offline khi 1 trong 3: connections null / device không connected / **completion null**. `useSyncStatus` query `/rest/db/completion?folder=${cfg.folderId}&...` nhưng `st_folder_id` **KHÔNG bao giờ được set** (`setFolderId` không chỗ nào gọi, không UI) → luôn rơi về **`DEFAULT_FOLDER='gu-library-kho'` (hardcode QA)**. Ở Prod (folder `gu-library-kho-prod`) → query folder không tồn tại → non-200 → `completion=null` → `deriveLight`→'offline' dù device connected. QA đúng vì default trùng folder QA.
### Fixed
- Query completion **theo device** (`/rest/db/completion?device=<minipc>`, Syncthing gộp mọi folder share) — bỏ hẳn folder-ID hardcode → chạy đúng với BẤT KỲ kho nào (local-first).
- `deriveLight`: connected + completion null → **'synced'** (vẫn "thấy mini PC"); offline CHỈ khi device thật sự không connected. An toàn kể cả khi device-only completion không hỗ trợ.
- Dọn `folderId`/`DEFAULT_FOLDER`/`setFolderId` khỏi `config.ts` (không còn hằng số tên/ID kho trong logic badge).
> Verify tablet Gú (SM-X710) kho Prod: online → "Đã đồng bộ", mất kết nối → "Chưa thấy mini PC"; QA `gu-library-kho` không hồi quy.

## [1.2.0] — 2026-06-30 — Nav · Sheet thẻ-rời · Button hai bậc · Cài đặt
### Added
- **Cài đặt — Folder kho** hiện đường dẫn đọc-được (`readableTreePath`, vd "Download/kho") thay URI thô; bấm vào = chọn/cấp lại quyền SAF (không gỡ-cài).
- **Cài đặt — Cỡ chữ Viewer** (Vừa/Lớn/Rất lớn = base-scale 1/1.5/2, lưu Preferences): áp cỡ mặc định khi mở tài liệu; **pinch-zoom chồng lên base** (min vẫn fit-width), nhớ-trang không vỡ.
- **Cài đặt — Thông tin máy này**: hiện `deviceId` (khớp tên `_reading-<id>.json`) để đối chiếu reading-state đa máy.
### Changed (kế thừa token v1.1.0, KHÔNG đẻ token mới)
- **Nav:** icon tab Trang chủ → **sách** (`library`); giữ nguyên 4 nhãn chữ.
- **2 sheet ("Đang đọc dở" + "Lưu vào môn nào?") = thẻ-rời:** mỗi item một thẻ giấy ấm bo góc, cách nhau, không che khuất; giữ grabber + title serif. "Đang đọc dở": thẻ mới nhất nâu/kem, còn lại giấy; vuốt-Bỏ + tiến độ "Trang N/M" giữ nguyên; nút **"Bỏ" liền khối** với thẻ.
- **Button hai bậc:** primary = pill đặc nâu/chữ kem (`shape="round"`); secondary (Đóng/Xong) = chữ nâu trơn (`fill="clear"`).
- **`--ion-color-danger` → đỏ-đất** (`#A1402C`) dùng chung pill "Chưa thấy mini PC" + nút "Bỏ" (Title case, `ion-item-option` text-transform none).
> Verify Z Flip 4 (R5CT844VRCN): nav sách + nhãn chữ; sheet thẻ-rời không che khuất, vuốt-Bỏ + tiến độ đúng, "Bỏ" liền khối; button hai bậc; "Bỏ" đỏ-đất khớp pill; folder path đọc-được + chọn lại; cỡ chữ áp đúng + pinch mượt + nhớ-trang; deviceId khớp file.

## [1.1.0] — 2026-06-30 — Pinch-zoom Viewer + đồng nhất UI (token)
### Added
- **Pinch-zoom Viewer:** phóng/thu hai ngón (neo đúng điểm dưới ngón tay, cả dọc lẫn ngang), pan khi đã phóng, double-tap về fit-width; **giữ mức zoom khi lật trang**; không thu dưới fit-width. **Windowing** (chỉ render trang quanh khung nhìn, slot cao cố định theo tỉ lệ thật) → zoom re-raster **nét** mà **không OOM**; điều hướng/nhớ-trang bằng offsets xác định → không trôi. (Còn 1 nhịp re-raster "chớp" nhẹ lúc commit — để dành khử oversample sau.)
### Changed (token layer — giải gốc, không vá rời)
- **Sửa thứ tự CSS:** nạp `@ionic/react/css/*` TRƯỚC `theme/variables.css` (main.tsx) → hết xanh dương rò rỉ (trước đây core.css nạp sau, ghi đè primary nâu về `#3880ff`).
- **`action` = nâu đậm `#553B08`** + chữ kem cho nút đặc; áp đồng loạt mọi nút/icon/back-button.
- **`success` = một shade** (pill sync) cho badge "Đã gửi đi in".
- **Title case toàn app** (`ion-button` text-transform none).
- Tiêu đề sheet "Đang đọc dở" trùng heading Home; nút Gom → "Gom để in (N)" (bỏ `_print/`); căn lề header nhóm môn màn "Đi in".
### Investigation (zoom crash — điều tra trước, fix sau)
- Triệu chứng "pinch → văng app" (3 máy). Logcat: `Render process kill (OOM or update) ... killing application` + `onTrimMemory:40` hàng loạt → **OOM renderer** do render MỌI trang rồi re-raster ở zoom cao. Fix gốc = windowing (giới hạn bộ nhớ). Vị trí trôi (dọc + ngang) do slot cao tự-động + thiếu neo → sửa bằng slot cao cố định + neo offsets/tỉ lệ.
> Verify Z Flip 4 (R5CT844VRCN): hết crash; zoom/double-tap giữ đúng trang + đúng điểm ngón tay (dọc+ngang); lật trang giữ zoom; nhớ-trang đúng; không còn xanh dương; Title case toàn app.

## [1.0.0] — 2026-06-30 — Phase 1 khép trọn: signed release + version hiển thị
### Added
- **APK release có ký** bằng keystore riêng (build CLI `./gradlew assembleRelease`, không Android Studio). Keystore ngoài repo (`~/keystores/gu-library/gu-library-release.jks`, alias `gu-library`), credential ở `android/keystore.properties` (gitignored); `build.gradle` nạp signing từ file đó (vắng file → debug vẫn build).
- **Dòng "Phiên bản X.Y.Z" trong Cài đặt**, đọc tự động từ `package.json` (build.gradle `versionName` ← package.json; Vite `__APP_VERSION__` fallback web; UI qua `App.getInfo()`). Không hardcode.
### Notes
- Mốc **Phase 1 khép trọn** — MVP đủ vòng đời: thêm (Share) → mini PC worker convert/extract → sync 3 máy → xem + nhớ chỗ đọc (đa file, sync) → gom đi in → versioning cứu xóa nhầm.
- ⚠ Mất keystore/mật khẩu = không update được app đã cài. Backup `.jks` + `keystore.properties` (xem README).
> Verify Z Flip 4 (SM-F721B, R5CT844VRCN): APK release ký đúng (CN=Gu Library), cài + chạy lõi (mở môn/PDF/sync) OK, update-over-release `-r` không cần gỡ, Cài đặt hiện "Phiên bản 1.0.0".

## [0.10.0] — 2026-06-30 — M9: Print outbox (mức C) — gom tài liệu đi in
### Added
- **Cờ "cần in" per-file:** tick ở Viewer (header) + dòng tài liệu trong môn → companion `<base>.print.json` cạnh cặp pdf+json (app-owned, Syncthing sync, KHÔNG đụng sidecar). Untick → xóa companion. `classify` bỏ qua `.print.json` + gắn `Document.printFlagged`.
- **Khối "🖨 Đi in (N)" trên Home** giữa "Đang đọc dở" và "Môn học", chỉ hiện khi N≥1 (N = số file cờ "cần in"), cập nhật qua `khoEvents` + foreground resume.
- **Màn "Đi in":** liệt kê file cần in gom theo môn; nút **Gom vào `_print/`** copy (giữ gốc) với tên tiền tố môn `[<môn>] <tên>.pdf` (dedup `(k)` trước đuôi); trạng thái **"đã gửi đi in"** suy từ hiện diện trong `_print/`; tick **"Xong"** xóa file `_print/` + clear cờ. **Vuốt một dòng chưa gom = "Bỏ"** (xóa cờ tại chỗ, khỏi ra môn untick).
- Native `Saf.deleteFile` (DocumentsContract.deleteDocument); `printRepo` (set/clear/scan/gom/markPrinted); `printName` helpers (có test).
- **Khép Phase 1.** Mức A (mini PC tự đẩy `_print/` lên Drive) để Phase 3 — không đập lại C.
> Verify trên Z Flip 4 (SM-F721B, serial R5CT844VRCN): tick/untick/gom/đã-gửi/Xong/vuốt-bỏ + ⏳ không tick được + `.print.json` không lọt danh sách — pass.

## [0.9.0] — 2026-06-29 — M6c: tạo môn + folder con trong app
### Added
- **Tạo môn (cấp 1)** từ nút "+" cạnh "Môn học" ở Home: nhập tên + chọn màu (palette 6 swatch trầm) → folder môn + `_mon.json {color}`. Sort alphabet (không hỏi `order`), "Chưa phân loại" vẫn cuối.
- **Tạo folder con** (mkdir, KHÔNG `_mon.json`) từ nút "+" trong FolderPage, độ sâu bất kỳ.
- Native `Saf.createDir` (chặn trùng, KHÁC `ensureDir` reuse); `repo.createMon`/`createSubfolder`; `validateFolderName` (chặn ký tự cấm `/ \ : * ? " < > |` + rỗng, có test); `CreateFolderModal` (tên + màu tùy chọn, chặn trùng "Đã tồn tại"); palette `MON_PALETTE`.
- Sort trong folder: folder trước, file sau, mỗi nhóm alphabet (vi).
- Refresh ngay qua `khoEvents`. Spike SAF `createDirectory` verify trên máy: tên tiếng Việt + lồng đúng (createDirectory đáng tin, khác createFile). Cũng là spike sống cho M10.

## [0.8.1] — 2026-06-29 — Fix file kẹt `.tmp` trong `_inbox/` (Share Intent)
### Investigation
- Root cause (6 vòng đo logcat+adb): **Samsung SAF ghi FILE THẬT `<tên>.<ext>.tmp` ở tầng filesystem** cho một số ca (pdf/docx/ppt, chập chờn) trong khi MediaStore/`getName()` báo tên sạch → worker (đọc FS thật) thấy `.tmp` → skip → kẹt. KHÔNG phải worker, KHÔNG phải tên nguồn. App qua SAF **không đọc/sửa được tên thật**.
### Fixed (app-side, giảm `.tmp` + sửa lỗi thật)
- `copyToDir` truyền **mime đúng theo đuôi** (không `application/octet-stream`) → pdf/doc/docx/pptx sạch.
- **Dedup `(k)` TRƯỚC đuôi** (`x (1).pdf`) thay vì để Android tự thêm sau đuôi (`x.pdf (1)` — đuôi hỏng, worker bỏ qua).
- **Strip đuôi tạm** (`.tmp/.crdownload/.part/...`) của tên file nguồn share trước khi ghi (`stripTempSuffix`, có test).
### Còn lại → worker (real FS, lưới phổ quát)
- Ca Samsung ghi `.tmp` ở FS mà SAF che mất: **fix ở repo worker** — strip `.tmp` cuối của file app `[<môn>] x.<ext>.tmp`. Spec: `Docs/gu-library-worker-tmp-normalization.md`.

## [0.8.0] — 2026-06-28 — Dedupe "Chưa phân loại" + reading-state đa file & sync
### Changed
- **"Chưa phân loại" gộp một dòng** (folder thật, luôn cuối, icon `?` trầm); bỏ mục ảo. Sheet import cũng chỉ còn một (folder bị lọc khỏi danh sách, giữ nút fallback). `classify` bỏ qua mọi file `_`-prefix.
### Added
- **Reading-state đa tài liệu + sync đa máy (Option D):** mỗi máy ghi `_reading-<deviceId>.json` ở root kho; app render = **union** mọi file (key = đường dẫn tương đối; tombstone last-action-wins → vuốt-xoá/đọc-xong đồng bộ, đọc-lại hiện-lại). Conflict Syncthing = 0. `deviceId` uuid lưu Preferences.
- **Sheet "Đang đọc dở":** card lớn = mới nhất (tap mở đúng trang); tap khu vực → sheet liệt kê đầy đủ (sort mới→cũ), vuốt một dòng = bỏ khỏi danh sách (file/tiến độ giữ nguyên). Vào list khi mở; tự rời khi đọc hết trang.
- Viewer khôi phục trang từ union (đa máy). Migration một lần từ Preferences cũ.
- **Home re-scan khi về foreground** (`@capacitor/app` resume): badge ⏳ + số tài liệu + danh sách đọc dở cập nhật không cần tắt-mở.

## [0.6.3] — 2026-06-21 — Share nhiều file (một lô = một môn)
### Added
- Nhận **ACTION_SEND_MULTIPLE** (intent-filter + MainActivity) → app xuất hiện trong share sheet khi chọn nhiều file. `ShareTargetPlugin` trả danh sách (`getSharedFiles`), `ShareReceiver` copy cả lô vào `_inbox/` với tiền tố môn đã chọn (một môn áp cho toàn lô). File trùng tên gốc tự thêm hậu tố `(1)` (không đè).
### Fixed
- Home cập nhật badge "N chờ" / dòng "Chưa phân loại" **ngay** sau khi import (event `kho-changed`), không phải đợi điều hướng lại tab.

## [0.6.2] — 2026-06-21 — UI "Chưa phân loại" hòa tông + nhất quán
### Changed
- Sheet chọn môn: bỏ nút "CHƯA PHÂN LOẠI" outlined xanh/all-caps (lạc Material). Thay bằng item mờ **xám in nghiêng, title case**, đặt **cuối** danh sách → môn thật là lựa chọn nổi bật (sửa hierarchy ngược).
- Concept "Chưa phân loại" dùng chung visual giữa Home + sheet qua component `UnfiledSwatch` (ô xám viền đứt) — cùng tông + casing.
- Không đụng logic lưu/phân loại/share; badge "Đã đồng bộ" xanh lá giữ nguyên (semantic success).

## [0.6.1] — 2026-06-21 — Sửa môn seed "Aa Dân sự" → "Luật Đất đai"
### Fixed
- Đổi tên môn placeholder seed sai **"Aa Dân sự" → "Luật Đất đai"**. Vì tên môn = tên folder (khóa), migrate an toàn bằng **rename folder** trên đĩa — tài liệu trong môn (`giao-trinh`, `de-cuong.pptx`) giữ nguyên, không tạo môn mới. `_inbox/` không có tiền tố cũ nên không cần migrate prefix.
### Added
- `_mon.json` field tùy chọn **`icon`** (override chữ swatch). "Luật Đất đai" → icon "Đ" + màu xanh `#3F6B2E` để **không trùng** ô icon với "Luật Công chứng" ("L" nâu). Các môn khác vẫn dùng chữ cái đầu mặc định (không phải cơ chế icon tổng quát).
- Fixture (`make-fixture.mjs`) cập nhật theo để khỏi tái tạo placeholder.

## [0.6.0] — 2026-06-21 — M6: Import qua Share Intent
- Share file (PDF/Word/PPTX) từ app khác → Gú's Library → **sheet trượt lên** chọn môn (môn vừa dùng ở đầu) + "Chưa phân loại" → copy vào `_inbox/` tên `[<môn>] <gốc>` (tiền tố = interface M6↔M7).
- Native `ShareTargetPlugin` (ACTION_SEND intent-filter, bắt EXTRA_STREAM cold + warm qua `@capacitor/app` resume); `Saf.copyToDir` copy nhị phân qua content-URI; `Saf.ensureDir`.
- Logic tiền tố thuần (`makeInboxName`/`parseInboxPrefix`, có test). Home gộp ⏳ từ `_inbox/` vào đúng môn; thêm chip "Chưa phân loại — N chờ".
- Nền tảng de-risk bằng 2 spike trên máy thật (SAF ghi + Share Intent) trước khi xây luồng (commit 510f4e8).

## [0.5.1] — 2026-06-20 — Android back navigation
### Fixed
- Android hardware/gesture back nay lùi **một cấp** (folder → cha → Home, viewer → folder) thay vì thoát app. Ở **Home** mới hỏi nhấn back lần nữa ("Nhấn back lần nữa để thoát") rồi thoát — chống thoát nhầm.
- Sửa **double-pop**: `IonTabs` đăng ký `ionBackButton` ở priority 0 (pop một lần + gọi `processNextHandler`), nên handler ở -1 pop lần hai (folder → ông bà, viewer → sai folder). Chuyển handler lên **priority 50** (trên IonTabs, dưới overlay 100/menu 99) → handler của ta là người duy nhất điều hướng.
### Added
- `decideBackAction` (pure, có unit test) + `useAndroidBackButton` hook (gắn `ionBackButton`, overlay-safe) + `BackButtonHandler` mount trong `IonReactRouter`.
- `@capacitor/app`.
> Verify trên SM-S908E (debug build): back chạy đúng, KHÔNG dính bug debug-build #26599 — bỏ qua Task 6 (release diagnostic).

## [0.5.0] — 2026-06-20 — M5: Viewer (xem PDF + nhảy trang)
- Viewer PDF thật (react-pdf / pdf.js, pinned 5.4.296): mở PDF từ kho qua SAF content-URI (`Saf.readFileBase64` → bytes), cuộn nhiều trang, nhảy tới trang N, nhớ + khôi phục trang đang đọc (nối card "đang đọc dở").
- Plugin `Saf.readFileBase64` cho file nhị phân; `src/storage/bytes.ts` + `safFile.ts`; `src/components/PdfView.tsx` (copy buffer tránh detach, theo dõi trang qua IntersectionObserver); `src/pages/ViewerPage.tsx` (header gọn + footer "Trang X / Y" + ô nhảy trang).
- Viewer code-split (lazy) — không nằm trong bundle chính, không vỡ test jsdom.
- Gỡ placeholder viewer + spike. Highlight passage để Phase 2.

## [0.4.2] — 2026-06-20
- Card "đang đọc dở": tên môn (dòng 2) nay được **suy tươi từ docUri lúc render** (không phụ thuộc `monName` đã lưu cũ) — sửa việc card vẫn hiện "Đang đọc" với progress lưu trước bản 0.4.1.

## [0.4.1] — 2026-06-20
### Polish M4 (lệch khỏi spec 9.4, không phải spec sai)
- Bottom nav: mục active đổi sang **nâu** (`#75420E`), inactive xám — bỏ xanh Ionic mặc định.
- Badge "N chờ" (cấp môn) + nhãn chờ xử lý (cấp tài liệu): thay emoji ⏳ bằng **icon vector** (`hourglassOutline`) đồng tông pill.
- Card "đang đọc dở": dòng 2 hiện **tên môn** thật của tài liệu (suy từ SAF tree/document URI) thay cho chữ "Đang đọc".

## [0.4.0] — 2026-06-20 — M4: UI shell (Home lai + điều hướng)
- Home lai (spec 9.4): header serif + đèn sync pill có chữ, ô search lối tắt, MỘT card "đang đọc dở", danh sách môn 1 cột (swatch màu + chữ cái đầu + badge "N chờ"), bottom nav 4 tab.
- Điều hướng môn→chương độ sâu bất kỳ; tài liệu chờ xử lý mờ + nhãn, không mở.
- Theme nâu giấy (CSS variables) + font offline Merriweather/Montserrat.
- Placeholder viewer ghi/khôi phục tiến độ đọc (Viewer thật để M5).
- Launcher icons (panda) qua @capacitor/assets — adaptive + round.
- Fixes lúc nghiệm thu: lọc folder ẩn Syncthing; base64url cho route param SAF; khôi phục đúng trang đang đọc.

## [0.3.0] — 2026-06-20 — M3: Sync status reader (đèn trạng thái)
- Đèn 3 trạng thái (✓ đã đồng bộ / ⟳ đang đẩy / ⚠ chưa thấy mini PC) đọc REST API Syncthing v2 local.
- Native plugin `Syncthing` (HTTPS self-signed localhost-only); Settings nhập API key + chọn mini PC; poll ~10s.

## [0.2.0] — M2: Storage layer & data model
- Native plugin `Saf` (SAF tree access, persistable permission); đọc cây môn/chương độ sâu bất kỳ; `_mon.json` (color/order); nhận diện cặp PDF+JSON; trạng thái chờ xử lý.

## [0.1.0] — M1: Khởi tạo project & toolchain
- App rỗng Capacitor + Ionic React + Vite build APK bằng CLI, cài chạy trên thiết bị Android thật.
