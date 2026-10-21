# Mục lục Điều trong Viewer (bậc 1)

*Spec 21/10/2026, phiên cloud. Brief: `Docs/claude/briefs/2026-10-21-muc-luc-dieu.md`. Năm câu trong brief và hai phần thiết kế đã chốt cùng huynh ngày 21/10.*

## 1. Vấn đề

Gú đọc các bộ luật dài trong Viewer. Muốn tới "Điều N" hiện có ba cách: cuộn, đoán trang, hoặc mở "Tìm trong tài liệu này" gõ "dieu N" (từ 1.42.2 Điều N đứng đầu kết quả). Cả ba đều vòng vo cho một việc rất thường gặp với người học luật. Spec §8 chốt cross-link tới Điều; phần đắt của nó (tham chiếu bấm được ngay trong trang) cần lớp chữ mà pdf.js không có. Beat này chỉ làm bậc 1: mục lục Điều lấy từ sidecar.

## 2. Mục tiêu và tiêu chí đạt

1. Đang đọc một văn bản luật, Gú mở được bảng Chương và Điều của chính tài liệu đó và chạm một Điều để nhảy tới trang của nó.
2. Gõ số Điều vào ô lọc thì Điều đúng số đứng đầu; gõ "dieu 5", "Điều 5" hay "Ðiều 5" (chữ Ð do OCR) đều hiểu là 5.
3. Mở mục lục là thấy ngay mình đang ở Điều nào.
4. Ở split, mục lục áp cho pane dưới (pane tra cứu), đúng thói quen "trên đọc, dưới tra".
5. Tài liệu không có Điều (slide, giáo trình, ảnh scan) không hiện nút nào thừa.
6. Mở tài liệu không chậm đi: sidecar chỉ đọc sau khi trang đầu đã vẽ, chỉ giữ danh sách Điều nhỏ gọn.

## 3. Quyết định đã chốt (với huynh, 21/10)

- **Lối vào (A):** chế độ đơn có nút icon riêng cạnh 🔍 ở footer; split có chữ "Mục lục" trên vạch chia, trước "Tìm · Đổi", áp cho pane dưới. Đã bác: tab trong sheet tìm (hai lần chạm, bàn phím tự bật che tab, phải sửa nhiều `DocSearchSheet`); hiện mục lục khi ô tìm trống (khó đoán ra, gõ số thì lẫn giữa tìm chữ và lọc Điều).
- **Ô lọc (A):** khớp đúng số lên đầu, rồi các số bắt đầu bằng chữ số đã gõ (gõ "3": các Điều 3, rồi 30 đến 39, 300...), trong mỗi nhóm giữ thứ tự tài liệu. Cùng kiểu xếp với 1.42.2. Đã bác: chỉ khớp đúng (số không có thì trống, không duyệt được lân cận); lọc thêm theo tên Điều (vượt brief, chồng với sheet tìm).
- **Nhóm (A):** danh sách phẳng theo thứ tự tài liệu, chèn dòng tiêu đề Chương khi sang Chương mới, không gập mở. Đang lọc thì bỏ tiêu đề, Chương xuống dòng phụ của từng Điều. Không có Khoản. Đã bác: phẳng hoàn toàn (khó thấy ranh giới Chương); gập mở (thêm một lần chạm, giữ trạng thái, dễ vỡ khi `path` lạ).
- **Đang đọc (A):** đánh dấu các Điều của trang hiện tại và tự cuộn tới đó khi mở sheet với ô lọc trống. Đã bác: chỉ cuộn không đánh dấu (mở ra ở giữa mà không có mốc); không làm gì (bộ luật vài trăm Điều chỉ còn cách gõ số).
- **Không có Điều (A):** ẩn lối vào. Sidecar đọc một lần khi mở tài liệu, sau khi trang đầu đã vẽ. Đã bác: luôn hiện nút và đọc khi chạm (nút chết trên slide và giáo trình, mỗi lần mở phải chờ); lai (giao diện đổi sau lần chạm đầu). Nếu đo trên máy thấy giật thì đổi sang đọc khi chạm mà không phải sửa sheet.
- **Kiến trúc:** module thuần + bộ nạp riêng + sheet riêng. Đã bác: gộp vào `indexOneDoc` (phải giữ chỉ mục một tài liệu trong RAM, ngược quyết định của `docIndex`); gom mục lục lúc dựng `khoSnapshot` (đọc cả 178 sidecar mỗi lần đi kho, khoảng 8,7 s).
- **Ô lọc không tự focus**, khác sheet tìm: bàn phím bật ngay sẽ che vị trí đang đọc vừa cuộn tới. Ô lọc không được nhớ khi đóng sheet: mở lại sau khi nhảy thì dấu "đang đọc" nằm ở Điều vừa tới.

## 4. Thiết kế

### 4.1 Logic thuần: `src/viewer/dieuToc.ts` (MỚI)

```ts
export interface TocEntry {
  i: number;        // position in the TOC (document order), stable id for marking and keys
  num: string;      // folded article number: "5", "10a"; "" when the label carries none
  label: string;    // display label, NFC with Ð/ð replaced: "Điều 5"
  title: string;    // first line of the unit text without the "Điều N." lead, at most 160 chars
  chapter: string;  // nearest "Chương ..." in path, "" when none
  page: number;     // 1-based start page
}
export function buildToc(sidecar: Sidecar): TocEntry[];
export function filterToc(entries: TocEntry[], query: string): TocEntry[] | null; // null = no filter
export function readingEntries(entries: TocEntry[], page: number): Set<number>;     // set of `i`
```

`buildToc`:

- Lấy các unit `type === "dieu"` theo đúng thứ tự trong `units`. Bỏ unit không có `page` hữu hạn ≥ 1 (không nhảy được thì không liệt kê).
- Chuẩn hoá chữ: NFC rồi đổi `Ð`/`ð` (U+00D0/U+00F0) thành `Đ`/`đ`. Sidecar từ worker v0.20.0 đã đổi sẵn; app vẫn tự đổi để chịu được sidecar cũ.
- `label`: nhãn đã chuẩn hoá và trim. Nhãn rỗng thì lấy "Điều N" ở đầu dòng đầu của `text` nếu có; không có nữa thì bỏ unit.
- `num`: từ nhãn, bỏ dấu (`fold`) rồi khớp `dieu` + số + đuôi chữ ("10a"). Không khớp thì `""`: vẫn liệt kê, lọc không bao giờ ra.
- `title`: dòng đầu của `text` (tách ở `\n`), bỏ phần "Điều N" và dấu `.`/`:` theo sau, trim, cắt còn 160 ký tự. `text` không đọc được (rỗng hoặc câu đánh dấu trang ảnh, `isReadableText`) thì `""`.
- `chapter`: phần tử cuối cùng trong `path` bắt đầu bằng "Chương " (sau chuẩn hoá). Bỏ qua Phần, Mục. Lấy phần tử cuối nên `path` lạ kiểu "Chương II" nằm dưới "Chương I" vẫn ra Chương gần nhất.
- Điều trùng số (luật sửa đổi kèm cuối bản hợp nhất, ví dụ hai "Điều 3" trong Luật DN 2020 ở trang 1 và 128) giữ cả hai.

`filterToc`:

- Chuẩn hoá câu gõ: đổi Ð/ð, `fold`, bỏ chữ `dieu` ở đầu, bỏ mọi ký tự không phải `a-z0-9`. Kết quả rỗng thì trả `null` (không lọc).
- Nhóm 1: `num === q`. Nhóm 2: `num.startsWith(q)` mà không thuộc nhóm 1. Mỗi nhóm giữ thứ tự tài liệu. Gõ "10" ra 10, rồi 10a, 100...

`readingEntries(entries, P)`:

- Các Điều có `page === P`.
- Không có thì lấy đúng một Điều: trong các Điều có `page < P`, chọn Điều có `page` lớn nhất, hoà thì Điều đứng sau cùng trong tài liệu (Điều đang chạy dài qua trang P).
- P đứng trước Điều đầu tiên thì tập rỗng.

### 4.2 Tìm sidecar dùng chung: `findDocInKho` trong `src/storage/khoSnapshot.ts`

Chuyển `findDoc` đang nằm riêng trong `src/search/docIndex.ts` sang `khoSnapshot.ts` thành `findDocInKho(snap, pdfUri): { jsonUri, name, mon } | null` (đi qua mọi môn rồi đệ quy cây con). `indexOneDoc` gọi hàm này; hành vi giữ nguyên.

### 4.3 Nạp: `src/viewer/loadToc.ts` (MỚI)

`loadToc(pdfUri): Promise<TocEntry[] | null>`: `getKhoSnapshot()` (đã cache trong phiên), `findDocInKho`, `Saf.readFile({ uri: jsonUri })`, `JSON.parse`, `buildToc`. Chuỗi sidecar và đối tượng parse ra không được giữ lại; chỉ danh sách `TocEntry` sống tiếp.

Không thấy tài liệu trong snapshot, không đọc được sidecar, JSON hỏng, kho bị giấu (`KhoUnreadableError`): trả `null`, không ném, không `logWarn` (thiếu sidecar là chuyện thường với tài liệu đang chờ worker).

### 4.4 Thời điểm nạp

- `PdfView` thêm prop tuỳ chọn `onFirstPaint?: () => void`, gọi đúng một lần ở chỗ đang chốt mốc perf `openDoc` (trang đầu vẽ xong). `DocPane` chuyển tiếp prop này. Đường đọc PDF (`safFile.ts`) không đổi.
- Hook `useDieuToc(docUri: string | null): TocEntry[] | null` (`src/viewer/useDieuToc.ts`, MỚI): `docUri` null thì không làm gì; có `docUri` thì gọi `loadToc`. Kết quả gắn với uri đã nạp; uri đổi thì kết quả cũ không bao giờ trả ra, kể cả khi lượt nạp cũ về muộn.
- Pane trên: `useDieuToc(topPainted ? docUri : null)`. Pane dưới: `useDieuToc(bottomPainted === bottomUri ? bottomUri : null)`, `bottomPainted` là uri của tài liệu pane dưới đã vẽ xong trang đầu.

### 4.5 `src/pages/ViewerPage.tsx`

- State mới: `tocFor: 'top' | 'bottom' | null`, `topPainted`, `bottomPainted`, `bottomPage` (trang pane dưới, chỉ để đánh dấu, không ghi tiến độ đọc). Chọn tài liệu pane dưới thì `bottomPage` về 1.
- Footer (chế độ đơn): nút `IonButton` icon `listOutline` (chưa mang nghĩa nào trong app), `aria-label="Mục lục Điều"`, đứng ngay trước 🔍, cùng kiểu nút. Chỉ hiện khi mục lục pane trên có ít nhất một Điều.
- Vạch chia (split, đã có tài liệu pane dưới): nút chữ "Mục lục" trước "Tìm", cùng khuôn `<button>` (chặn `onTouchStart` để không kéo nhầm vạch), `aria-label="Mục lục Điều của tài liệu tra cứu"`. Chỉ hiện khi mục lục pane dưới có Điều.
- `DieuTocSheet` nhận mục lục và trang hiện tại của pane tương ứng; `onJump` gọi `setJumpTo({ page })` hoặc `setBottomJumpTo({ page })` như `DocSearchSheet`.

### 4.6 Sheet: `src/components/DieuTocSheet.tsx` (MỚI)

- Vỏ `GuSheet`, tiêu đề "Mục lục Điều", breakpoint 0.75. Thân sheet chỉ mount khi mở và có mục lục, `key` theo uri tài liệu: đóng là mất ô lọc, mở lại là tự cuộn lại.
- Ô lọc: chữ gợi ý "Lọc theo số Điều…", `inputMode="numeric"`, nút ✕ xoá khi có chữ, không tự focus.
- Dòng trạng thái: chưa lọc "218 Điều"; lọc có kết quả "3 Điều khớp"; lọc không ra "Không có Điều nào số “999”" (số đã chuẩn hoá). Số lớn định dạng `vi-VN`.
- Hàng Điều: cùng khuôn thẻ với kết quả của sheet tìm (`KhoRow` dành cho hàng kho có vuốt, không hợp). Dòng chính "Điều 5" đậm + tên Điều một dòng, dài thì cắt `…`; bên phải "tr. 3". `role="button"`, `aria-label="Nhảy tới Điều 5, trang 3"`.
- Chưa lọc: chèn dòng tiêu đề Chương mỗi khi `chapter` khác hàng trước và khác rỗng. Đang lọc: không có tiêu đề; dòng phụ "Chương I · trang 3" (không có Chương thì "trang 3").
- Hàng thuộc `readingEntries`: vạch nâu bên trái và chữ nhỏ "đang đọc" (cả khi đang lọc).
- Mở sheet với ô lọc trống: sau một nhịp cho sheet trượt xong (cùng mức hoãn 350 ms như focus của sheet tìm), cuộn hàng "đang đọc" đầu tiên vào giữa khung (`scrollIntoView({ block: 'center' })`).
- Vẽ hết các hàng, không có "Hiện thêm" (tự cuộn cần hàng đích đã có). BLDS khoảng 700 Điều.
- Chạm hàng: `onJump(page)` rồi `onClose()`.
- Chữ trên màn tiếng Việt, giọng app, không em dash.

## 5. Lỗi và trường hợp biên

- Không có sidecar, sidecar hỏng, kho bị giấu, tài liệu không có `dieu`: mục lục `null` hoặc rỗng, không hiện nút.
- PDF không vẽ được (pane báo lỗi): không có `onFirstPaint`, không đọc sidecar, không hiện nút. Đúng ý: tài liệu đã hỏng.
- Worker ghi lại sidecar khi tài liệu đang mở (OCR xong): mục lục giữ bản cũ tới lần mở sau. Chấp nhận.
- Đổi tài liệu pane dưới trong lúc đang nạp: kết quả cũ bị bỏ (4.4).
- Unit `dieu` từ OCR (`ocr: true`) dùng như thường; tên Điều có thể sai dấu.

## 6. Kiểm thử

TDD, test đỏ trước. Sidecar mẫu dựng ngay trong test theo `Docs/gu-library-sidecar-schema.md`.

- `src/viewer/dieuToc.test.ts`: chỉ lấy `dieu`; bỏ unit không có trang; số kể cả Ð/ð và "10a"; nhãn rỗng lấy từ `text`; tên Điều (có và không có xuống dòng, chỉ có tiêu đề, câu đánh dấu trang ảnh, cắt 160); Chương gần nhất, bỏ Phần/Mục; giữ Điều trùng số. Lọc: khớp đúng trước, khớp đầu sau, thứ tự tài liệu, "dieu 5"/"Điều 5"/"Ðiều 5"/" 5." như "5", câu gõ rỗng hoặc chỉ "dieu" là không lọc, số không có thì rỗng. Đang đọc: trang có Điều bắt đầu, trang giữa hai Điều, nhiều Điều cùng trang trước đó, trang trước Điều đầu, Điều trùng số.
- `src/storage/khoSnapshot.test.ts`: `findDocInKho` tìm trong cây con, trả `null` khi không có.
- `src/viewer/loadToc.test.ts` (giả plugin bằng `fakeKho`): có sidecar thì ra mục lục; thiếu sidecar, JSON hỏng, kho bị giấu thì `null`.
- `src/viewer/useDieuToc.test.ts` (`renderHook`, giả `loadToc`): uri null thì không nạp; uri đổi giữa chừng thì không trả kết quả cũ.
- `src/components/DieuTocSheet.test.tsx` (giả `GuSheet` như test sheet tìm): tiêu đề Chương, dòng trạng thái, lọc, chạm thì `onJump` + `onClose`, dấu "đang đọc", tự cuộn (spy `scrollIntoView`, trả lại trong `afterEach`).
- `npm test`, `npx tsc -b`, `npm run lint` xanh.

## 7. Ngoài phạm vi

Khoản và Điểm; bậc 2 (tham chiếu bấm được ngay trong trang, link sang văn bản khác, tô sáng); nhớ ô lọc; cache mục lục qua nhiều lần mở; mục lục cho pane trên khi đang split; bump version, ghi chú phát hành, CHANGELOG, ops doc (việc lúc phát hành, ở local).

## 8. Cần kiểm trên máy (local)

- Đếm số tài liệu có `dieu` trong kho QA; soi vài bộ luật thật: `label`, `path`, `page` đúng không, tên Điều có nằm ở dòng đầu `text` không, Chương có mang tên không.
- Thời gian từ lúc trang đầu vẽ xong tới lúc nút hiện với bộ luật lớn nhất kho; trang đầu không chậm đi (mốc `openDoc`).
- Footer chật thêm một nút: kiểm dGen1 (720 × 720) và màn hẹp nhất có trong tay.
- Tự cuộn trong `IonModal`, vẽ khoảng 700 hàng (BLDS) có mượt không.
- Nhảy đúng trang ở chế độ đơn và split, dấu "đang đọc" đúng sau khi nhảy.
