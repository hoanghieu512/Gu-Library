---
branch: feat/muc-luc-dieu
base: bfd2d93
date: 2026-10-21
status: ready-for-device
---

# Mục lục Điều trong Viewer (bậc 1)

Phiên cloud 21/10. Brief `Docs/claude/briefs/2026-10-21-muc-luc-dieu.md`; spec `Docs/superpowers/specs/2026-10-21-muc-luc-dieu-design.md`; plan `Docs/superpowers/plans/2026-10-21-muc-luc-dieu.md`. Không bump version, không sửa `notes.ts`, `CHANGELOG.md`, ops doc.

## Đã làm

- `0e9f27d`, `56c539b`: spec và plan (năm câu của brief và hai phần thiết kế đã chốt với huynh).
- `907cd05`: `src/viewer/dieuToc.ts`, logic thuần: rút danh sách Điều từ sidecar (số, tên Điều ở dòng đầu `text`, Chương gần nhất trong `path`, trang), lọc theo số (khớp đúng trước, khớp phần đầu sau), tìm Điều đang đọc.
- `8af70f8`: `findDocInKho` trong `khoSnapshot.ts`, dùng chung với `docIndex` (hành vi giữ nguyên).
- `f9b4c1c`: `src/viewer/loadToc.ts`, đọc một sidecar, trả `null` khi thiếu sidecar, sidecar hỏng hay kho bị giấu.
- `c030700`: hook `useDieuToc`, không bao giờ trả mục lục của tài liệu trước.
- `f0e7949`: sheet `DieuTocSheet` (tiêu đề Chương, ô lọc bàn phím số không tự focus, dấu "đang đọc", tự cuộn sau 350 ms).
- `2500f3c`: nối vào Viewer: prop `onFirstPaint` của `PdfView`/`DocPane`; nút `listOutline` ở footer; chữ "Mục lục" trên vạch chia cho pane dưới; test mới `src/pages/ViewerPage.test.tsx`.
- `e10d73f`: `Docs/claude/lessons.md`.
- `4f0efdf`: sửa theo review độc lập: chọn lại đúng tài liệu cũ ở pane dưới không còn đọc sidecar trước khi vẽ; Chương viết hoa ("CHƯƠNG II") vẫn nhận; thêm test ghim việc đổi tài liệu pane dưới không bao giờ hiện mục lục cũ.

## Quyết định

- Lối vào: nút riêng cạnh 🔍 ở footer; ở split là chữ "Mục lục" trên vạch chia, áp cho pane dưới. Bỏ tab trong sheet tìm (hai lần chạm, bàn phím che tab) và hiện mục lục khi ô tìm trống (khó đoán, lẫn tìm chữ với lọc Điều).
- Lọc: khớp đúng số trước, rồi các số bắt đầu bằng chữ số đã gõ (như 1.42.2). "Điều 5", "dieu 5", "Ðiều 5" (Ð do OCR), " 5." đều là 5; gõ "10" ra cả 10a.
- Danh sách phẳng có dòng tiêu đề Chương, không gập mở, không có Khoản. Đang lọc thì Chương xuống dòng phụ.
- Đánh dấu và tự cuộn tới Điều đang đọc: các Điều bắt đầu trên trang hiện tại, không có thì Điều gần nhất phía trước.
- Tài liệu không có `dieu` thì ẩn nút; sidecar đọc một lần sau khi pane vẽ xong trang đầu, chỉ giữ danh sách Điều. Nếu đo trên máy thấy giật thì chuyển sang đọc khi chạm mà không phải sửa sheet.
- Ô lọc không tự focus (khác sheet tìm) và không nhớ khi đóng: mở lại sau khi nhảy thì dấu "đang đọc" nằm ở Điều vừa tới.
- Vạch "đang đọc" vẽ bằng `box-shadow` inset thay vì `border-left`, để không trộn `border` với `borderLeft` khi dấu đổi chỗ.

## Bẫy đã gặp

- Công cụ ghi file của phiên cloud giải mã `Ð` trong nội dung thành ký tự Ð thật, nhìn giống hệt Đ. Đã đổi lại thành escape trong `dieuToc.ts` và test; khi đọc code thấy "Ð" thì kiểm bằng `od -c`.
- jsdom không có `Element.prototype.scrollIntoView`; test gán `vi.fn` trong `beforeEach` và trả bản gốc trong `afterEach`.
- `ViewerPage` test được trong jsdom nếu giả `DocPane` (pdf.js cần `DOMMatrix`) và stub `ResizeObserver`. Vì vậy chuyển tiếp `onFirstPaint` từ `DocPane` sang `PdfView` không có test đơn vị nào phủ: phải kiểm trên máy (bước đầu tiên dưới đây).

## Kiểm chứng đã chạy

- `npm test`: 63 file, 468 test, tất cả pass (main lúc tách nhánh: 58 file, 423 test).
- `npx tsc -b`: sạch. `npm run lint`: 0 lỗi, 10 cảnh báo (đúng số cũ).
- Đột biến tạm, đã trả code về: bỏ `try/catch` của `loadToc` (2 test đỏ); bỏ so uri trong `useDieuToc` (test đỏ); nạp mục lục trước khi vẽ (2 test đỏ); đột biến (b) của reviewer trên hook (2 test đỏ).
- Review độc lập cả nhánh (một subagent): kết luận "With fixes", 0 Critical; 2 Important đã sửa ở `4f0efdf`, 1 Minor nâng lên Important và đã sửa.

## Cần kiểm trên máy (local)

- [ ] Build release, cài UBS1 và dGen1 (dGen1 mở bằng `monkey`, không force-stop); e2e 8/8.
- [ ] Mở một bộ luật (ví dụ Luật DN 2020): nút danh sách hiện cạnh 🔍 sau khi trang đầu vẽ (đây là chỗ duy nhất kiểm được `onFirstPaint` thật). Mở một slide hay giáo trình: không có nút.
- [ ] Mục lục: tiêu đề Chương đúng, tên Điều đúng (dòng đầu `text`), hai "Điều 3" (trang 1 và 128) đều có; gõ "3" thì hai Điều 3 lên đầu rồi 30 đến 39; chạm thì nhảy đúng trang.
- [ ] Dấu "đang đọc" đúng Điều của trang hiện tại; mở sheet thì tự cuộn tới đó trong `IonModal` (không cuộn nhầm container ngoài); sau khi nhảy, mở lại thì dấu ở Điều vừa tới.
- [ ] Split: chữ "Mục lục" trên vạch chia chỉ hiện khi tài liệu tra cứu có Điều; nhảy pane dưới, pane trên đứng yên; "Đổi" thì chữ biến mất ngay; chọn lại đúng tài liệu cũ thì chữ chỉ hiện sau khi pane vẽ.
- [ ] Footer thêm một nút: kiểm dGen1 720 × 720 và máy hẹp nhất có trong tay (ô "Tới trang…" và nút "Nhảy" không bị đẩy tràn).
- [ ] Đo bộ luật lớn nhất kho (vài MB sidecar): mốc `openDoc` không chậm đi so với 1.42.3; thời gian từ lúc trang đầu vẽ tới lúc nút hiện; sheet khoảng 700 Điều (BLDS) cuộn mượt.
- [ ] Đếm số tài liệu có `dieu` trong kho QA; soi vài sidecar thật: `path` có Chương viết hoa không, dòng đầu `text` của Điều có đúng là tên Điều không, có dạng "Điều 5 - Tên" hay "Điều 8Tên" (dính chữ do OCR) không.

## Còn mở, cần huynh quyết

- [ ] Duyệt câu chữ trên màn: "Mục lục Điều", "Lọc theo số Điều…", "218 Điều", "3 Điều khớp", "Không có Điều nào số “999”", "đang đọc", "tr. 4", "Chương I · trang 3", chữ "Mục lục" trên vạch chia.
- [ ] Bốn Minor review để lại, chưa sửa: (1) đang gõ dở chữ "Điều" thì hiện "Không có Điều nào số “d”" (bàn phím số làm ca này hiếm); (2) "Điều 8Quyền" (OCR dính chữ) cho tên "ền", "Điều 5 - Nguyên tắc" giữ dấu "-" ở đầu tên; (3) `buildToc` chuẩn hoá cả `text` trước khi cắt dòng đầu (rẻ hơn nếu cắt trước); (4) chuyển tiếp `onFirstPaint` của `DocPane` không có test đơn vị. Sửa hay để, tuỳ huynh sau khi soi sidecar thật.
- [ ] Hỏi Pé có hay phải lục một Điều cụ thể không, đang lục bằng cách nào (treo từ 15/10).
- [ ] Phiên bản phát hành (tính năng mới nên là minor, 1.43.0) và ghi chú cho Pé: việc ở local lúc phát hành.
