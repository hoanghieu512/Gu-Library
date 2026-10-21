# Brief: Mục lục Điều trong Viewer (bậc 1)

Brief cho một phiên (cloud hoặc local) mở beat tính năng kế tiếp. Đọc `CLAUDE.md` và `Docs/claude/lessons.md` trước.

## Vì sao

Gú học luật và đọc các bộ luật dài trong Viewer. Muốn tới "Điều N" hiện có ba cách: cuộn, đoán trang, hoặc mở "Tìm trong tài liệu này" gõ "dieu N" (từ 1.42.2 Điều N đứng đầu kết quả). Spec §8 (`Docs/gu-library-design-spec.md`) chốt cross-link tới Điều; phần đắt của nó là làm cho tham chiếu bấm được ngay trong trang, vì pdf.js vẽ ra canvas, không có lớp chữ. Vì vậy chia hai bậc, và **beat này chỉ làm bậc 1**:

- **Bậc 1 (beat này):** một bảng mục lục Chương và Điều của tài liệu đang đọc, lấy từ sidecar, chạm một Điều là nhảy tới trang của nó, có ô lọc theo số Điều.
- **Bậc 2 (ngoài phạm vi):** tham chiếu bấm được ngay trong trang ("theo quy định tại Điều 5"), link sang văn bản khác, tô sáng.

## Dữ liệu sẵn có

Sidecar của văn bản luật (`kind: "legal"`) có chuỗi đơn vị `dieu` / `khoan` / `diem`; mỗi đơn vị có `label` ("Điều 5"), `path` (tổ tiên, ví dụ `["Chương I", "Điều 5"]`), `page` (trang bắt đầu, đánh số từ 1), đôi khi `bbox`. Xem `Docs/gu-library-sidecar-schema.md`. Tài liệu slide, giáo trình hay ảnh scan không có `dieu`.

## Dùng lại, không dựng mới

- Đọc sidecar của một tài liệu như `src/search/docIndex.ts`: tìm `jsonUri` trong cây `khoSnapshot` (đã cache trong phiên) rồi `Saf.readFile`. Không nạp chỉ mục toàn kho.
- Nhảy trang qua `setJumpTo({ page })` (pane trên) hoặc `setBottomJumpTo({ page })` (pane dưới) ở `src/pages/ViewerPage.tsx`, đúng như `DocSearchSheet` đang làm (`onJump`). Lệnh nhảy tới trước khi PDF dựng xong đã có `src/viewer/jumpGate.ts` lo.
- Lối vào và cách chọn pane: theo mẫu "Tìm trong tài liệu này" (v1.39.0). Chế độ đơn có icon 🔍 cùng hàng ô "Tới trang…"; split có chữ "Tìm" cạnh "Đổi" ở vạch chia và tra pane dưới (Gú dùng split theo kiểu trên đọc, dưới tra).
- Vỏ sheet: `GuSheet` (`src/components/GuSheet.tsx`). Chữ trên màn bằng tiếng Việt, giọng của app, không em dash.

## Ràng buộc

- Không đụng đường đọc PDF (`src/storage/safFile.ts`), không bật lớp chữ của pdf.js, không đổi schema sidecar hay worker.
- Chỉ đọc một sidecar (trung bình khoảng 330 KB, bộ luật lớn có thể vài MB). Cân giữa đọc lúc mở tài liệu (để biết có hiện lối vào không) và đọc lúc bấm; đo nếu nghi ngờ.
- Nhãn có thể dính biến thể chữ "Ð" (khác mã với "Đ") khi văn bản đi qua OCR; lọc theo số Điều phải chịu được.
- TDD: logic thuần (rút danh sách Chương/Điều từ units, lọc theo số) tách ra hàm có test; sidecar mẫu dựng ngay trong test theo schema.
- Không bump version, không sửa `src/whatsNew/notes.ts`, `CHANGELOG.md`, ops doc (đó là việc lúc phát hành, ở local).

## Cần chốt với huynh trước khi code

Dùng superpowers:brainstorming, hỏi từng câu một, rồi ghi spec vào `Docs/superpowers/specs/` và plan vào `Docs/superpowers/plans/`.

1. Lối vào đặt ở đâu (icon riêng cạnh 🔍, hay một tab trong sheet tìm)? Ở split thì cho pane nào?
2. Ô lọc: gõ "5" thì Điều 5 đứng đầu rồi tới 50, 51… (giống cách xếp từ 1.42.2) hay chỉ khớp đúng?
3. Nhóm theo Chương hay danh sách Điều phẳng? Có cần Khoản không (mặc định: không)?
4. Có đánh dấu Điều chứa trang đang đọc không?
5. Tài liệu không có `dieu`: ẩn lối vào, hay hiện nhưng báo "tài liệu này không có mục lục Điều"?

## Phần chỉ local làm được (ghi vào file bàn giao)

- Đếm trong kho QA bao nhiêu tài liệu có đơn vị `dieu`, và soi vài bộ luật thật (nhãn, `path`, `page` có đúng không). Kho QA trên UBS1 ở `/sdcard/Download/kho`, kéo sidecar về bằng `adb exec-out tar`.
- Hỏi Pé có hay phải lục một Điều cụ thể không, đang lục bằng cách nào (câu này treo từ 15/10).
- Build release, cài UBS1 và dGen1 (màn vuông), e2e 8/8, kiểm tay: mở mục lục, lọc, nhảy đúng trang ở chế độ đơn và split.

## Bàn giao

- Nhánh `feat/muc-luc-dieu` tách từ `main`.
- Kết thúc: nhánh đã push, `npm test`, `npx tsc -b`, `npm run lint` xanh, file `Docs/claude/handoff/feat-muc-luc-dieu.md` theo mẫu `Docs/claude/handoff/README.md`.
