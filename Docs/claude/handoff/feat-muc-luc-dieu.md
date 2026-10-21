---
branch: feat/muc-luc-dieu
base: bfd2d93
date: 2026-10-21
status: device-checked
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

- [x] Build release, cài UBS1 và dGen1 (dGen1 mở bằng `monkey`, không force-stop); e2e 8/8.
- [x] Mở một bộ luật (ví dụ Luật DN 2020): nút danh sách hiện cạnh 🔍 sau khi trang đầu vẽ (đây là chỗ duy nhất kiểm được `onFirstPaint` thật). Mở một slide hay giáo trình: không có nút.
- [x] Mục lục: tiêu đề Chương đúng, tên Điều đúng (dòng đầu `text`), hai "Điều 3" (trang 1 và 128) đều có; gõ "3" thì hai Điều 3 lên đầu rồi 30 đến 39; chạm thì nhảy đúng trang.
- [x] Dấu "đang đọc" đúng Điều của trang hiện tại; mở sheet thì tự cuộn tới đó trong `IonModal` (không cuộn nhầm container ngoài); sau khi nhảy, mở lại thì dấu ở Điều vừa tới.
- [x] Split: chữ "Mục lục" trên vạch chia chỉ hiện khi tài liệu tra cứu có Điều; nhảy pane dưới, pane trên đứng yên; "Đổi" thì chữ biến mất ngay; chọn lại đúng tài liệu cũ thì chữ chỉ hiện sau khi pane vẽ.
- [x] Footer thêm một nút: kiểm dGen1 720 × 720 và máy hẹp nhất có trong tay (ô "Tới trang…" và nút "Nhảy" không bị đẩy tràn).
- [x] Đo bộ luật lớn nhất kho (vài MB sidecar): mốc `openDoc` không chậm đi so với 1.42.3; thời gian từ lúc trang đầu vẽ tới lúc nút hiện; sheet khoảng 700 Điều (BLDS) cuộn mượt.
- [x] Đếm số tài liệu có `dieu` trong kho QA; soi vài sidecar thật: `path` có Chương viết hoa không, dòng đầu `text` của Điều có đúng là tên Điều không, có dạng "Điều 5 - Tên" hay "Điều 8Tên" (dính chữ do OCR) không.

## Kết quả kiểm trên máy (phiên local 21/10)

Tất cả mục trên đạt. Số đo thật:

- Nhánh `94f5b80`: `npm test` 468/468 (63 file), `npx tsc -b` sạch, `npm run lint` 0 lỗi, 10 cảnh báo. Không cần `npm install` (không đổi dependency).
- APK release của nhánh sha1 `1cb13b5…` (mang số 1.42.3 vì nhánh tách trước bump), sao lưu ở `android/app/build/feat-muc-luc-dieu/`; APK nghiệm thu 1.42.4 `b5c64d9…` sao lưu ở `android/app/build/acceptance-1.42.4/`. Cài UBS1 và dGen1, dGen1 mở bằng `monkey`, không force-stop lần nào. **e2e 8/8 · 3 ph 17 s · $0 · Haiku 5.5 (không gọi model).**
- `onFirstPaint` thật (quay màn dGen1, khung chỉ ghi khi màn đổi): Luật DN 2020 trang đầu hiện ở khung 3,11 s, nút ≡ ở khung kế 3,27 s; BLDS 91/2015 (689 Điều, sidecar 0,87 MB) 2,53 s rồi 2,68 s; sidecar nặng nhất kho `11. HT Hình sự và Tố tụng Hình sự` (8,65 MB, 667 trang, 2 Điều) 4,64 s rồi 5,49 s. Vậy nút hiện chậm hơn trang đầu dưới 0,16 s với bộ luật, dưới 0,85 s với sidecar 8,65 MB. Giáo trình `Hop_dong_Chuong_1_2_4` và slide `0. GIỚI THIỆU MÔN HỌC`: không có nút.
- Mục lục Luật DN 2020 (dGen1): "220 Điều", tiêu đề "Chương I", tên Điều đúng; có cả hai Điều 3 (tr. 1 "Áp dụng Luật Doanh nghiệp và luật khác", tr. 128 "Điều khoản chuyển tiếp", dòng phụ "Chương X · trang 128"); gõ "3" ra "12 Điều khớp": hai Điều 3 rồi 30 đến 39; chạm Điều 30 thì tới trang 17.
- Dấu "đang đọc": mở ở tr. 4 thì Điều 5, 6 được đánh dấu và cuộn tới; sau khi nhảy tới tr. 17 mở lại thì dấu ở Điều 29, 30, 31, ô lọc trống. Tự cuộn chỉ cuộn trong sheet: đóng sheet vẫn ở trang 17.
- Split (UBS1): pane dưới `1. VỤ ÁN BÌNH PHƯỚC` (không có Điều) thì vạch chia chỉ có "Tìm · Đổi". Pane dưới Luật DN 2020: khung có trang đầu (1,04 s) chưa có "Mục lục", khung kế (1,21 s) có. Lọc "45" ra "1 Điều khớp", nhảy thì pane dưới tới tr. 23, pane trên đứng yên ở tr. 24; mở lại thì dấu ở Điều 42 đến 45. "Đổi" thì chữ mất ngay; chọn lại đúng Luật DN 2020 thì chữ chỉ hiện ở khung sau trang đầu.
- Footer: dGen1 720 × 720 vừa đủ ≡, 🔍, "Tới trang…", "Nhảy" trên một hàng. UBS1 (720 × 1600, bề ngang 360 dp, máy hẹp nhất có trong tay) với Luật DN 2020 ("Trang 17 / 129"): "Nhảy" vẫn nguyên, nhưng ô nhập co lại và chữ gợi ý bị cắt còn "Tới trang" (mất "…"); slide "Trang 7 / 8" trên cùng máy, không có nút ≡, thì hiện đủ "Tới trang…".
- `openDoc` (chạm tới trang đầu, BLDS, dGen1, một mẫu mỗi bản): nhánh 1,46 s, 1.42.4 1,55 s. Cuộn ngay sau khi mở tài liệu sidecar 8,65 MB (`dumpsys gfxinfo`, 8 lần vuốt): khung giật nhánh 7,75 / 8,84 / 6,43%, 1.42.4 6,47 / 10,79 / 10,95%, tức không khác đo được. Không cần lùi sang đọc sidecar khi chạm nút. Cuộn sheet BLDS 689 hàng: 421 khung, 0,95% giật, p90 12 ms, p99 17 ms.
- Sidecar kho QA (kéo từ UBS1 bằng `adb exec-out tar`, chỉ đọc; chạy đúng `buildToc` của nhánh trên từng file): 182 sidecar, 72 có `dieu` (50 mục lục khác nhau vì nhiều file nằm ở hai môn), 4.646 Điều. "CHƯƠNG" viết hoa trong `path` ở 183 Điều của một tài liệu (`Luật Thi hành án dân sự`), "chương" thường ở 19 Điều của một tài liệu hội thảo; cả hai đã nhận từ `4f0efdf`. Dòng đầu `text` luôn bắt đầu bằng "Điều N": **0** ca "Điều 8Tên", **0** ca "Điều 5 - Tên". Ở văn bản luật dòng đầu đúng là tên Điều; 1 Điều tên rỗng (text chỉ có "Điều 29."), 13 tên dài từ 150 ký tự (tên thật dài, màn cắt `…`), tên xuống dòng chỉ lấy dòng đầu (vd "về các tình tiết giảm nhẹ trách nhiệm hình sự quy định tại", NQ hướng dẫn Đ51 và Đ52).

## Phát hiện mới ở phiên local

- **Ô lọc cuộn đi cùng danh sách.** Sheet mở là tự cuộn tới Điều đang đọc, nên ô lọc nằm ngoài màn ngay khi đang đọc quá vài Điều đầu (thấy trên dGen1 với Luật DN 2020 ở tr. 4 và tr. 17). Với BLDS đang ở Điều 400 thì phải cuộn ngược khoảng 400 hàng mới gõ được số, ngược mục tiêu 2 của spec. Hướng sửa: ghim ô lọc và dòng trạng thái ở đầu vùng cuộn của sheet (`position: sticky`).
- **Tài liệu hội thảo có Điều "giả".** 8 tài liệu trong `Hình sự chung/Tài liệu tham khảo` có 1 đến 27 unit `dieu` do worker bắt các Điều được trích trong bài: số không theo thứ tự, tên là câu văn (vd Điều 298 "Việc quy định này bảo đảm vai trò của VKS ngoài chức năng công tố còn có"). Nút vẫn hiện, chạm thì tới trang có đoạn trích. Luật "phải có Điều 1" sẽ ẩn nhầm 3 văn bản thật (bản trích Luật Tư pháp người chưa thành niên, hai phần Luật Đất đai 2024), nên chỗ sửa đúng là parser của worker, không phải app.
- **Footer chật trên máy 360 dp:** chữ gợi ý "Tới trang…" bị cắt khi có nút ≡ và tổng trang 3 chữ số (UBS1). Ô vẫn gõ được, "Nhảy" không tràn. Hướng sửa nếu cần: rút chữ gợi ý (vd "Trang…") hoặc thu hẹp lề nút.
- dGen1 (có từ trước, không do nhánh): ở split, thanh tab che phần cuối danh sách chọn tài liệu của pane dưới; bấm hàng cuối dễ trúng tab.

## Còn mở, cần huynh quyết

- [ ] Duyệt câu chữ trên màn: "Mục lục Điều", "Lọc theo số Điều…", "218 Điều", "3 Điều khớp", "Không có Điều nào số “999”", "đang đọc", "tr. 4", "Chương I · trang 3", chữ "Mục lục" trên vạch chia.
- [ ] Bốn Minor review để lại, chưa sửa: (1) đang gõ dở chữ "Điều" thì hiện "Không có Điều nào số “d”" (bàn phím số làm ca này hiếm); (2) "Điều 8Quyền" (OCR dính chữ) cho tên "ền", "Điều 5 - Nguyên tắc" giữ dấu "-" ở đầu tên; (3) `buildToc` chuẩn hoá cả `text` trước khi cắt dòng đầu (rẻ hơn nếu cắt trước); (4) chuyển tiếp `onFirstPaint` của `DocPane` không có test đơn vị. Sửa hay để, tuỳ huynh sau khi soi sidecar thật.
- [ ] Hỏi Pé có hay phải lục một Điều cụ thể không, đang lục bằng cách nào (treo từ 15/10).
- [ ] Phiên bản phát hành (tính năng mới nên là minor, 1.43.0) và ghi chú cho Pé: việc ở local lúc phát hành.
