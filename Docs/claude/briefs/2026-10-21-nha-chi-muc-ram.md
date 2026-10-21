# Brief: nhả chỉ mục tìm kiếm khỏi RAM sau khi rời màn Tìm

Brief cho một phiên (cloud hoặc local) mở beat kế tiếp sau 1.43.0. Đọc `CLAUDE.md` và `Docs/claude/lessons.md` trước. Đây là bản sửa hiệu năng, Pé không thấy tính năng mới; phát hành dự kiến là bản patch (1.43.1), việc đó làm ở local.

## Vì sao

Màn Tìm nạp chỉ mục toàn kho vào RAM để tra tức thì. Ionic giữ trang trong tab sống, nên sau khi Gú rời màn Tìm (sang Trang chủ, mở một kết quả, sang Cài đặt) chỉ mục vẫn nằm trong RAM tới hết phiên. Việc này đã ghi là "còn treo" từ v1.38.0 (ops doc §8.1, CHANGELOG 1.38.0) và nằm ở "Việc còn mở" của `Docs/claude/lessons.md`. Chưa thấy hại trên máy 6 GB, nhưng đó là món đầu tiên nên gỡ: khi máy thiếu RAM, Android dọn các app ở nền trước, app càng ôm nhiều thì càng dễ bị dọn, và Gú quay lại sẽ thấy app mở lại từ đầu. Chưa ai đo chuyện này trên máy Gú.

## Số đo đang có (cần đo lại, xem cuối brief)

- Spike 05/09 (`Docs/perf/2026-09-05-spike-search-index.md`, UBS1 6 GB, kho QA 178 tài liệu, 57 MB sidecar): JS heap sau khi dựng 149,7 MB; PSS (tiến trình chính + renderer) 174 MB ở Trang chủ, 259 MB khi có chỉ mục, tức +85 MB; chỉ mục trong IndexedDB 24,6 MB; nạp lại từ IndexedDB 0,49 s; dựng nguội 14 s; tra 1 đến 3 ms. Các tài liệu khác của repo gọi tròn là "khoảng 130 MB heap".
- Từ đó chỉ mục đã to thêm: schema 3 (v1.40.0) gắn Điều vào nhãn đơn vị, schema 4 (v1.41.0) thêm chuỗi token đã bỏ dấu `n` cho mỗi đơn vị. Số hiện tại chưa ai đo.
- Comment trong `refreshIndex` (`src/search/store.ts`): nếu hai bản chỉ mục cùng sống (bản đang giữ và bản vừa gộp lại) thì đỉnh bộ nhớ vọt từ 304 lên 568 MB. Lối tắt so dấu vân tay `known` có để tránh đúng chuyện đó.

## Code hiện tại

- `src/pages/SearchPage.tsx`: chỉ mục nằm trong state `ix`; dấu vân tay của lượt dựng gần nhất trong ref `stamps`. Effect lúc mount: `loadIndex()` (nạp từ IndexedDB, `mergeShards`) rồi `refreshIndex(stamps)` ngầm; chưa có gì thì dựng lần đầu, hiện tiến độ (`phase` `building`). Effect thứ hai tra lại mỗi khi `q` hoặc `ix` đổi (debounce 130 ms). Cờ `alive` chặn kết quả về muộn sau khi unmount, nhưng trang tab không unmount nên trên máy cờ này gần như không bao giờ tắt.
- `src/search/store.ts`: `loadIndex`, `refreshIndex`, `clearIndex` (nút "Dựng lại chỉ mục tìm kiếm" ở Cài đặt gọi `clearIndex`). Chỉ mục là dữ liệu phái sinh trong IndexedDB, chẻ theo tài liệu (`DocShard`).
- Lối vào màn Tìm: tab Tìm (`src/App.tsx`), thanh "Tìm trong tài liệu…" ở Trang chủ (`src/components/SearchShortcut.tsx`, `history.push('/search')`). Lối ra quen nhất: chạm một kết quả hoặc "Xem cả N đoạn" mở Viewer, rồi bấm back về màn Tìm để xem kết quả kế tiếp.
- Không đụng: `src/search/docIndex.ts` (chỉ mục một tài liệu cho Viewer, khoảng 80 ms, không dùng chỉ mục toàn kho), `DocSearchSheet`, Mục lục Điều.
- Ionic có `useIonViewWillEnter` / `useIonViewDidLeave` (ViewerPage và HomePage đã dùng `useIonViewWillEnter`); `@capacitor/app` có sự kiện `pause` / `resume` (HomePage, PrintPage, ShareReceiver đã nghe `resume`).

## Ràng buộc

- Không bao giờ để hai bản chỉ mục cùng sống. Giữ lại `stamps` (nhỏ) khi nhả chỉ mục để lượt làm mới sau vẫn đi được lối tắt.
- Kết quả của một lượt `loadIndex`/`refreshIndex` về muộn, sau khi đã nhả, không được gắn chỉ mục trở lại (cùng kiểu bẫy mà `useDieuToc` đã chặn ở 1.43.0).
- Vào lại màn Tìm sau khi nhả phải đi đúng đường như lần đầu: nạp từ IndexedDB, làm mới ngầm; nếu IndexedDB trống (vừa bấm "Dựng lại chỉ mục" ở Cài đặt) thì dựng lại có tiến độ. Câu đang gõ dở trong ô tìm nên còn nguyên, kết quả hiện lại khi nạp xong.
- Không đổi định dạng chỉ mục, `SCHEMA`, đường đọc sidecar, hay worker.
- TDD: đặt luật "giữ hay nhả, lúc nào" vào một module thuần hoặc hook có test (giả thời gian bằng `vi.useFakeTimers`); phần nối vào Ionic giữ thật mỏng. `ViewerPage.test.tsx` và `HomePage.test.tsx` đã render trang Ionic trong jsdom bằng `IonApp` + `IonReactMemoryRouter`; thử xem `useIonViewDidLeave` có bắn trong jsdom không, không bắn thì ghi rõ trong file bàn giao để kiểm trên máy.
- Không bump version, không sửa `src/whatsNew/notes.ts`, `CHANGELOG.md`, ops doc. Nếu cần chữ mới trên màn (ví dụ báo đang nạp lại), đề xuất câu chữ trong file bàn giao để huynh duyệt.

## Cần chốt với huynh trước khi code

Hỏi huynh từng câu một (dùng skill brainstorming nếu phiên có; plugin cài ở máy local không chắc có trên cloud), rồi ghi spec vào `Docs/superpowers/specs/` và plan vào `Docs/superpowers/plans/`.

1. Nhả lúc nào: ngay khi rời màn Tìm; sau khi rời đi một khoảng (bao lâu); chỉ khi app vào nền (`pause`); hay kết hợp? Lưu ý đường quen "chạm kết quả, xem, back, chạm kết quả kế" sẽ phải chờ nạp lại nếu nhả ngay.
2. Rời sang Viewer (mở kết quả) có tính là rời không, hay chỉ tính khi sang tab khác?
3. Vào lại sau khi đã nhả: hiện gì trong lúc nạp (dùng lại `phase` `loading`, hay giữ danh sách kết quả cũ cho tới khi nạp xong)?
4. Có giữ lại danh sách kết quả của câu đang gõ (`result`) khi nhả không? Nó trỏ vào một phần nhỏ của chỉ mục.

## Phần chỉ local làm được (ghi vào file bàn giao)

- Đo trên UBS1 và dGen1, trước (1.43.0) và sau: PSS tiến trình chính cộng renderer `…:sandboxed_process0` đúng UID của app (`dumpsys meminfo`, xem "Bẫy test, build, đo" trong lessons) ở Trang chủ, khi màn Tìm có chỉ mục, và sau khi rời màn Tìm quá ngưỡng nhả. Cắt số theo từng lượt; nhớ PSS cao sau phiên nặng phần lớn là trang đã swap sang zram. V8 có thể chưa thu hồi ngay khi bỏ tham chiếu: thử `adb shell am send-trim-memory com.gulibrary.app RUNNING_CRITICAL` hay chờ, và ghi rõ cách đã làm.
- Thời gian vào lại màn Tìm sau khi đã nhả tới lúc tra được (so với 0,49 s của spike 05/09), và đường "chạm kết quả, back" theo đúng lựa chọn ở câu 1 và 2.
- Bấm "Dựng lại chỉ mục" ở Cài đặt rồi vào màn Tìm: dựng lại có tiến độ, không giữ chỉ mục cũ.
- Build release, cài UBS1 và dGen1 (dGen1 mở bằng `monkey`, không force-stop), e2e 8/8 (bốn test ở `tests/search.e2e.ts` đi qua màn Tìm).

## Bàn giao

- Nhánh `fix/search-index-ram` tách từ `main`.
- Kết thúc: nhánh đã push, `npm test`, `npx tsc -b`, `npm run lint` xanh (0 lỗi, đúng 10 cảnh báo), file `Docs/claude/handoff/fix-search-index-ram.md` theo mẫu `Docs/claude/handoff/README.md`.
