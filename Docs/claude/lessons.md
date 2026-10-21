# Bài học và quyết định đã chốt

Bản tóm cho mọi phiên Claude Code, local lẫn cloud. Nguồn gốc là memory trên Mac và log phiên trong vault Obsidian, hai thứ không có trên GitHub. Repo này **public**: chỉ ghi điều kỹ thuật, không thông tin riêng tư, không khoá hay mật khẩu. Cập nhật lần cuối 21/10/2026 (main `fc852b9` = 1.43.0, tag `v1.43.0`; máy Gú chạy 1.42.3).

Chi tiết từng bản nằm ở `CHANGELOG.md` và `Docs/gu-library-ops-qa-prod.md` §8.1. File này chỉ giữ thứ dễ quên hoặc đã từng cắn.

## Kiến trúc đã chốt

- Kho là một folder thật do Syncthing đồng bộ giữa điện thoại và mini PC (QA `gu-library-kho`, Prod `gu-library-kho-prod`). App đọc ghi qua plugin SAF tự viết (`android/.../SafPlugin.java`), không có server. Worker Python (repo `Gu-Library-Worker`) nhặt file trong `_inbox/` (tiền tố `[Môn][Con] tên`), convert, xếp vào môn và sinh sidecar JSON cạnh mỗi PDF (`Docs/gu-library-sidecar-schema.md`).
- Mỗi máy chỉ ghi file đọc dở của mình `_reading-<deviceId>.json` ở gốc kho, nên Syncthing không bao giờ conflict. `mergeReading` gộp theo `lastReadAt` (đơn vị ms × 1000 + bộ đếm, chỉ để so sánh).
- File đi kèm tài liệu do app sở hữu: `<base>.print.json` (cờ cần in), `<base>.display.json` (tên hiển thị). App không bao giờ sửa sidecar.
- `src/storage/khoSnapshot.ts`: một lượt đi cả kho thành cây trong RAM của phiên; mọi phép đếm, tóm tắt, danh sách đọc dở đều dẫn xuất từ cây đó. `emitKhoChanged` bỏ cache; thao tác lô bọc `coalesceKhoChanged` để lô N thao tác chỉ phát một lần.
- Chỉ mục tìm kiếm toàn kho nằm trong IndexedDB của từng máy, phái sinh, không sync, chẻ theo tài liệu (`DocShard`). Dấu vân tay là `size` + `lastModified` từ `listFolder`; giá trị `-1` nghĩa là provider không trả cột đó, phải coi như đã đổi. "Tìm trong tài liệu này" ở Viewer index riêng một tài liệu (`src/search/docIndex.ts`, khoảng 80 ms), không nạp chỉ mục toàn kho (khoảng 130 MB).
- Mục lục Điều (`src/viewer/dieuToc.ts`, từ 1.43.0): đọc đúng một sidecar sau khi pane vẽ xong trang đầu (`onFirstPaint` của `PdfView`/`DocPane`), chỉ giữ danh sách Điều nhỏ; nút chỉ hiện khi tài liệu có đơn vị `dieu`. Tìm sidecar của một tài liệu qua `findDocInKho` (`khoSnapshot.ts`), dùng chung với `docIndex`.
- Đọc PDF: `Saf.probeReadable` rồi `fetch(Capacitor.convertFileSrc(uri))`, file đi thẳng vào renderer, không base64. Luật: nhiều file nhỏ (sidecar) đi `Saf.readFile` qua bridge, một file lớn đi `fetch` (đo 178 sidecar: bridge 8,7 s, fetch 14,2 s).
- Viewer (`src/components/PdfView.tsx`): chỉ render vài trang quanh khung nhìn, ô mỗi trang cao cố định theo tỉ lệ trang; pinch-zoom xem trước bằng CSS transform rồi mới vẽ lại nét. Nhảy trang bằng `scrollTop`; lệnh nhảy là đối tượng `{page}` qua `src/viewer/jumpGate.ts` (để lệnh tới sớm không bị bước khôi phục trang ghi đè); trang hiện tại do `src/viewer/currentPage.ts` quyết (`pageInView`, `pageHold`).
- **pdf.js vẽ ra canvas, không có lớp chữ.** Vì vậy không tô sáng được chữ trên trang, "tìm trong tài liệu" trả về sheet đoạn trích, và cross-link bấm ngay trong trang là phần đắt.
- Split-screen: pane trên để đọc (ghi tiến độ), pane dưới để tra (không ghi). Đổi tài liệu pane dưới làm tuần tự: unmount pane cũ rồi mới nạp cái mới, không bao giờ ba tài liệu cùng sống. Thanh chia kéo được, mỗi pane tối thiểu 132 px, tỉ lệ nhớ trong phiên.
- Lưu tiến độ đọc qua `src/reading/progressSaver.ts`: một lần lưu mỗi lúc, chỉ coi là đã lưu khi thành công, trang lỗi chờ 2 s mới thử lại. Kho bị giấu thì im lặng; lỗi khác đi `logWarn`.
- Kho bị Android giấu (dGen1, 17/10, sau một lần boot lỗi): mọi folder liệt kê rỗng nhưng tạo folder vẫn được. Native trả `KHO_HIDDEN` khi provider đổi tên bản mới thành `x (k)` mà danh sách không thấy `x`; `src/plugins/saf.ts` đổi lỗi đó thành `KhoUnreadableError` cho mọi lệnh gọi; màn hình báo khởi động lại máy và app không ghi gì.

## Bẫy SAF và Android

- Samsung SAF `createFile` có lúc để file thật mang đuôi `.tmp` trong khi `getName()` báo tên sạch: đừng tin tên SAF trả về. `copyToDir` phải truyền mime khớp đuôi; khi trùng tên thì chèn `(k)` trước đuôi.
- `DocumentFile.findFile` dùng cache, có thể cũ khi worker hoặc Syncthing vừa xoá rồi tạo lại folder; dò con bằng một cursor `DocumentsContract` tươi.
- Đĩa kho của UBS1 **không phân biệt** hoa thường, của dGen1 **có phân biệt**, máy Samsung cũng không phân biệt. Kiểm trùng tên phải không phân biệt hoa thường; đổi tên chỉ khác hoa thường phải đi hai bước qua một tên tạm. Ca hoa thường chỉ thử trên UBS1, thử trên dGen1 sẽ tạo folder thật.
- Provider thay ký tự FAT không cho phép (`:` thành `_`): đó không phải trùng tên (`SafNames.mayBeRenamed`).
- Native đọc file lớn phải `catch (Throwable)`: `OutOfMemoryError` không phải `Exception`. `fetch` chạm file đã xoá làm sập cả app, nên luôn `probeReadable` trước.
- Scan JPEG2000 (`/JPX`) được pdf.js vẽ trắng; file đi qua worker đã được re-encode nên không bị. Kho QA có file mồi cố ý `Chưa phân loại/Giám định pháp y, tâm thần.pdf`: thấy trắng là đúng.
- File `.syncthing.*.tmp` là của Syncthing, app không xoá.
- Quyền SAF là theo từng cây thư mục, không hiện trong Cài đặt ứng dụng; muốn ép lỗi quyền thì move hoặc xoá file.

## Bẫy WebView, Ionic, React

- `className="ion-padding"` trên `IonContent` không có tác dụng: đặt lề bằng các biến `--padding-*`.
- CSS của Ionic phải nạp trước `src/theme/variables.css` (ở `main.tsx`), không thì palette xanh mặc định đè màu nâu.
- Floating label có sẵn của `IonInput` lệch khác nhau trên mỗi WebView: dùng `NameField` tự vẽ.
- Ionic giữ trang trong tab sống và khớp view theo path, bỏ qua query: một link tới Viewer đang mở ở tab khác sẽ dùng lại instance cũ. Xử tham số trong `useIonViewWillEnter` đọc `history.location`, kèm mã dùng một lần.
- Đóng `IonModal` bằng `isOpen`, đừng unmount khi đang mở (để lại `aria-hidden` treo trên router outlet). Nội dung sheet không tự đặt `overflow:auto`. `autoFocus` không ăn trong `IonModal`. Sheet có breakpoint cần `expandToScroll={false}`.
- Nút back cứng: handler riêng đăng ký priority 50 (chế độ chọn nhiều 60), không gọi `processNextHandler` (không thì lùi hai lần).
- `position: sticky` trong `IonContent` bám vào mép trong lớp đệm (content box) của vùng cuộn: `top: 0` để lộ một dải bằng `--padding-top` cho hàng trượt qua phía trên. Dùng `top` âm bằng lớp đệm, kèm `margin-top` âm và nền đặc (`DieuTocSheet`, đã đo trên dGen1).
- WebView nâng chữ CSS nhỏ hơn khoảng 8 px lên 8 px: chữ nhỏ phải vẽ trong `<svg viewBox>`. `<svg>` trần không ăn cỡ của `ion-icon[slot=icon-only]`; `IonIcon src=` với data-URI không render gì.
- Icon đã mang nghĩa trong app: `swapHorizontalOutline` là Chuyển (di chuyển file), `refresh` là làm mới, `syncCircle` là Syncthing. Tra trước khi thêm icon.
- Bản release không in `console.*` ra logcat. **Đừng bật `loggingBehavior`** trong `capacitor.config.ts`: khi đó Capacitor stringify và in nội dung mọi lệnh plugin (sidecar, nội dung `writeFile`). Cảnh báo cần thấy ở bản release thì gọi `logWarn` (`src/plugins/appLog.ts`, đọc bằng `adb logcat -s GuApp`).
- `react-pdf` 10.4.1 ghim cùng `pdfjs-dist` 5.4.296 (lệch version là lỗi worker). Viewer lazy-load vì react-pdf cần `DOMMatrix`, jsdom không có.
- Mọi thứ khổ cố định đặt lên kệ Home (máy ép sách, bookend) phải nằm trong mảng bề rộng đưa cho `packShelves`.

## Bẫy test, build, đo

- vitest không typecheck: luôn chạy thêm `npx tsc -b`.
- Test thời gian tuyệt đối chập chờn khi cả bộ chạy song song. Kiểm cơ chế (spy) hoặc so tương đối với một phép làm chuẩn trong cùng lượt, chừa biên rộng.
- Spy trên global (`console`, `Array.prototype`) phải trả lại trong `afterEach`; trả lại ở cuối test thì một assertion đỏ sẽ để spy dính sang test sau.
- Công cụ ghi file của Claude Code có thể giải mã escape `\u00D0` trong nội dung thành chữ Ð thật (trông y hệt Đ). Viết ký tự dễ nhầm bằng escape rồi kiểm bằng `od -c`.
- jsdom không có `Element.prototype.scrollIntoView`: gán `vi.fn` trong `beforeEach`, trả bản gốc trong `afterEach`.
- `ViewerPage` test được trong jsdom (`src/pages/ViewerPage.test.tsx`) bằng cách giả `DocPane` (pdf.js cần `DOMMatrix`) và stub `ResizeObserver`; pane giả có nút để test tự quyết lúc nào "vẽ xong trang đầu".
- `./gradlew assembleRelease` ghi đè APK trong `android/app/build/outputs/apk/release/`: sao lưu APK nghiệm thu trước khi build lại.
- Shell giữ cwd sau `cd android`: mọi lệnh sau đó dùng đường dẫn tuyệt đối. Muốn chắc bundle đã vào APK thì grep trong `android/app/src/main/assets/public/assets/*.js`, đừng tin dòng "BUILD SUCCESSFUL".
- Version được nướng vào APK lúc build: bump `package.json` thì phải build lại. Bản release đè bản debug phải gỡ trước (khác chữ ký).
- Đo bộ nhớ phải cộng tiến trình renderer `…:sandboxed_process0`, và đúng renderer của app (UID dạng `u0a<uid>i<n>`). Cắt số theo từng lượt thao tác, đừng hồi quy cả pha. PSS cao sau phiên nặng phần lớn là trang đã swap sang zram, không phải rò.
- Truy vấn theo role của Testing Library chậm trong jsdom (khoảng 0,4 s mỗi lần trên 50 đến 120 hàng): đếm nhiều hàng bằng `querySelectorAll` theo `role` và `aria-label`, tìm nút bằng `queryByText(…, { selector: 'button' })`. Test phân trang của `DocSearchSheet` từng quá hạn 5 s khi cả bộ chạy song song trên Mac bận (5,4 đến 7,3 s), nay khoảng 0,9 s.

## Bẫy thiết bị (chỉ ở local)

- UBS1: đồng hồ có thể tụt về năm 2024 sau khi khởi động lại; test đọc đỏ thì xem `adb shell date` trước. Gboard trên UBS1 nuốt chữ "u". Bàn phím che nút trong sheet.
- dGen1: chỉ một lần `am force-stop` lúc renderer đang chạy là WebView đen tới khi khởi động lại máy. Mở bằng `adb shell monkey -p com.gulibrary.app -c android.intent.category.LAUNCHER 1`, không relaunch. Màn vuông 720 × 720.
- Kiểm bảng "Có gì mới" sau khi cài: mở lần đầu bằng `monkey` (mở bằng `agent-device open` thì UBS1 không thấy bảng).
- e2e (`e2e/`, đọc `e2e/README.md` trước): 8 test theo nhãn, khoảng 3 ph 20 s, không gọi model. Test Tìm mở một bộ luật ở trang 24 nên trạng thái đọc của kho QA đổi sau mỗi lượt.
- Kho QA trên UBS1 ở `/sdcard/Download/kho`; kéo sidecar về Mac bằng `adb exec-out tar`.
- Kiểm tay không cần agent-device: `adb shell uiautomator dump` thấy `aria-label` của WebView; bấm vào node **nhỏ nhất** khớp nhãn (node cha chứa chữ của mọi con), và tránh phần node nằm dưới thanh tab (gáy sách ở Trang chủ, cuối danh sách chọn tài liệu của pane dưới trên dGen1).
- Đo "bao lâu sau trang đầu thì X hiện": `adb shell screenrecord` chỉ ghi khung khi màn đổi, `ffprobe -show_entries frame=pts_time` cho mốc từng khung. Độ giật: `dumpsys gfxinfo com.gulibrary.app reset`, thao tác, rồi đọc "Janky frames"; so với bản trước cùng cách làm, vì một lượt lệch tới vài điểm phần trăm.

## Quyết định sản phẩm đã chốt

- Gú dùng split theo kiểu trên đọc, dưới tra. Gú có dùng "Chọn hết" nên giữ.
- Cỡ chữ Viewer có 3 mức (Vừa, Lớn, Rất lớn); thêm mức là tính năng mới, không phải áp da.
- Không hạ cỡ chữ theo độ dài tên; tên dài cắt đuôi bằng `…`.
- Kho có lưới lùi `.stversions` khoảng 30 ngày, nên câu xác nhận xoá không doạ "không thể hoàn tác".
- Ghi chú phát hành (`src/whatsNew/notes.ts`) viết cho "Pé", chỉ nói điều Pé thấy hoặc cảm được; huynh duyệt câu chữ mỗi bản.
- Mục lục Điều (chốt 21/10): nút riêng ở footer, ở split là chữ "Mục lục" trên vạch chia cho pane dưới; lọc theo số khớp đúng trước rồi khớp phần đầu; danh sách phẳng có dòng tiêu đề Chương, không có Khoản; đánh dấu và tự cuộn tới Điều đang đọc; ô lọc không tự focus và không nhớ khi đóng; tài liệu không có Điều thì không hiện nút.
- Lớp nền `KhoRow`, `GuSheet`, `GuDialog`: danh sách hành động do màn truyền vào. Bảy beat liên tiếp không phải sửa interface của chúng; giữ như vậy.

## Việc còn mở (21/10/2026)

- 1.42.4 và 1.43.0 đã merge và tag (APK nghiệm thu `b5c64d9` và `d8b7b7d`, e2e 8/8), máy Gú còn 1.42.3; Gú cài bản nào thì chép APK đó vào `releases/` và sửa dòng Prod trong ops doc.
- Chưa tái hiện được trạng thái provider giấu kho trên máy. Nhập lô dừng giữa chừng và `createDir` không xoá được bản trùng chưa kiểm trên máy.
- Xoay ngang thì pane trên hiện trắng (chưa rõ có từ trước hay không).
- Chỉ mục tìm kiếm nằm lại trong RAM sau khi rời màn Tìm (khoảng 130 MB tới hết phiên).
- Mục lục Điều (bậc 1) ra ở 1.43.0. Kho QA: 72/182 tài liệu có `dieu`, dòng đầu `text` là tên Điều ở văn bản luật. Chưa hỏi Pé có cần không, có dùng không.
- Worker bắt các Điều được trích trong bài hội thảo thành unit `dieu` (8 tài liệu ở `Hình sự chung/Tài liệu tham khảo`), nên Mục lục của chúng là các Điều rời, tên là câu văn. Sửa ở parser worker nếu cần.
