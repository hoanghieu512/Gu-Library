# Nhả chỉ mục tìm kiếm khỏi RAM sau khi rời màn Tìm

*Spec 21/10/2026, phiên cloud. Brief: `Docs/claude/briefs/2026-10-21-nha-chi-muc-ram.md`. Bốn câu trong brief và hai phần thiết kế đã chốt cùng huynh ngày 21/10. Bản sửa hiệu năng, phát hành dự kiến 1.43.1 (việc ở local).*

## 1. Vấn đề

Màn Tìm nạp chỉ mục toàn kho vào state (`ix`) để tra tức thì. Màn Tìm, Viewer và các tab nằm chung một `IonRouterOutlet`, Ionic giữ trang sống, nên `SearchPage` không bao giờ unmount: chỉ mục (spike 05/09: khoảng 130 đến 150 MB heap, +85 MB PSS; nay còn to hơn vì schema 3 và 4) nằm trong RAM tới hết phiên. Khi máy thiếu RAM, Android dọn app ở nền trước, app càng ôm nhiều càng dễ bị dọn, Gú quay lại thấy app mở lại từ đầu.

Lỗ hổng có từ trước, gộp vào beat này: nút "Dựng lại chỉ mục tìm kiếm" ở Cài đặt xoá IndexedDB và báo "mở màn Tìm để dựng lại", nhưng nếu màn Tìm đã mở trong phiên thì nó vẫn giữ chỉ mục cũ và không dựng lại cho tới khi khởi động lại app.

## 2. Mục tiêu và tiêu chí đạt

1. Rời màn Tìm (sang tab khác hoặc mở một kết quả sang Viewer) quá 3 phút thì chỉ mục được nhả.
2. App vào nền thì chỉ mục được nhả ngay, kể cả khi đang đứng ở màn Tìm.
3. Đi qua lại nhanh "chạm kết quả, đọc, back, chạm kết quả kế" (dưới 3 phút) không phải chờ gì.
4. Quay lại sau khi đã nhả: danh sách kết quả cũ vẫn hiện và chạm được, dòng trạng thái báo "đang cập nhật chỉ mục…" cho tới khi nạp xong; câu đang gõ dở còn nguyên.
5. Không bao giờ có hai bản chỉ mục cùng được dựng một lúc; kết quả về muộn sau khi nhả không gắn lại.
6. Bấm "Dựng lại chỉ mục" rồi vào màn Tìm thì luôn dựng lại có tiến độ, không giữ chỉ mục cũ.
7. Không đổi định dạng chỉ mục, `SCHEMA`, đường đọc sidecar, worker; không thêm chữ mới trên màn.

## 3. Quyết định đã chốt (với huynh, 21/10)

- **Lúc nhả (D):** rời màn Tìm quá 3 phút, hoặc app vào nền (`pause`) thì nhả ngay. Đã bác: nhả ngay khi rời (đường "kết quả, back" lần nào cũng phải nạp lại); chỉ hẹn giờ (timer của WebView ở nền có thể bị hãm, nên ca vào nền không chắc được phủ); chỉ khi vào nền (đọc cả tiếng trong app vẫn ôm chỉ mục).
- **Viewer có tính là rời (A):** một luật cho mọi kiểu rời; ca "tìm ra một bộ luật rồi đọc nó cả tiếng" chính là lúc nên trả RAM. Đã bác: không tính (đọc lâu vẫn ôm chỉ mục, thêm nhánh đọc đường đi kế tiếp); tính nhưng hẹn lâu hơn (hai con số phải chỉnh).
- **Lúc nạp lại (A):** giữ màn như lúc rời đi, dòng trạng thái dùng lại câu sẵn có "đang cập nhật chỉ mục…". Gõ câu khác trong lúc nạp thì ẩn danh sách cũ. Đã bác: màn trống như lần mở đầu (chớp trắng, mất chỗ cuộn); lớp chờ giữa màn (chặn tầm nhìn, thêm chữ mới).
- **Giữ danh sách kết quả (A):** giữ `result` (mỗi tài liệu khớp một đoạn tiêu biểu, ước dưới 1 MB), bảng tên hiển thị và dấu vân tay `stamps`. Không giữ bảng token, danh sách đơn vị hay chuỗi đã bỏ dấu của cả kho.
- **Kiến trúc:** tách luật giữ/nhả (module thuần) và việc nạp (hook); `SearchPage` chỉ nối dây. Đã bác: viết thẳng vào `SearchPage` (luật lẫn trong component, khó test); singleton cấp module (lặp đúng bẫy "sống tới hết phiên").
- **Vá "Dựng lại chỉ mục"** nằm trong beat này.

## 4. Thiết kế

### 4.1 Luật giữ hay nhả: `src/search/indexHold.ts` (MỚI, thuần)

```ts
export const HOLD_MS = 3 * 60_000;
export interface IndexHold { enter(): void; leave(): void; pause(): void; resume(): void; invalidate(): void; dispose(): void }
export function createIndexHold(actions: { acquire: () => void; release: () => void }, holdMs?: number): IndexHold;
```

Trạng thái: `visible` (màn Tìm đang hiển thị), `held` (đã gọi `acquire` mà chưa `release`), một hẹn giờ. Ban đầu cả hai là `false`.

- `enter()`: `visible = true`, huỷ hẹn; nếu `!held` thì `held = true`, `acquire()`.
- `leave()`: `visible = false`, đặt lại hẹn `holdMs`; tới hạn, nếu `held` thì `held = false`, `release()`.
- `pause()`: huỷ hẹn; nếu `held` thì `held = false`, `release()`. Không đổi `visible`.
- `resume()`: nếu `visible && !held` thì `held = true`, `acquire()`.
- `invalidate()`: huỷ hẹn; nếu `held` thì `held = false`, `release()`; rồi nếu `visible` thì `held = true`, `acquire()`.
- `dispose()`: huỷ hẹn.
- Gọi lặp vô hại: `enter` hai lần chỉ `acquire` một lần, `leave` hai lần chỉ còn một hẹn.

Dùng `setTimeout`/`clearTimeout` toàn cục (test bằng `vi.useFakeTimers`).

### 4.2 Nạp chỉ mục: `src/search/useSearchIndex.ts` (MỚI, hook)

Chuyển effect nạp đang nằm trong `SearchPage` sang đây; đường đi giữ nguyên: `loadIndex()`; có thì gắn chỉ mục rồi `refreshIndex(stamps)` ngầm; không có thì dựng có tiến độ (`refreshIndex(undefined, onProgress)`).

```ts
export type Phase = 'loading' | 'building' | 'ready';
export function useSearchIndex(onNames: (names: Map<string, string>) => void): {
  ix: SearchIndex | null; phase: Phase; progress: { done: number; total: number }; refreshing: boolean;
  acquire: () => void; release: () => void;     // stable identities
};
```

- **Một lượt nạp mỗi lúc.** Mỗi lượt mang số `gen` lấy lúc bắt đầu. `release()` tăng `gen` và đặt `ix = null`; mọi `setIx`, `stamps`, `onNames`, `phase`, `refreshing` của một lượt chỉ chạy khi `gen` của nó còn là `gen` hiện tại. Tiến độ dựng (`progress`) thì luôn cập nhật, để màn dựng không đứng hình khi Gú quay lại giữa lượt dựng.
- **`acquire()` khi lượt trước còn chạy** thì xếp hàng sau lượt đó (nối vào promise của nó), không chạy song song: hai bản chỉ mục không bao giờ cùng được dựng.
- **Lần đầu và lần sau.** Lượt đầu tiên của hook: `phase = 'loading'` tới khi nạp xong, như hiện nay. Lượt sau một lần `release`: không đổi `phase` (thường đang là `ready`, nên danh sách cũ còn hiện), đặt `refreshing = true` ngay từ đầu, qua cả nạp lẫn làm mới, tới khi xong. Nạp được từ IndexedDB thì `phase = 'ready'`; IndexedDB trống thì `phase = 'building'` như lần đầu.
- **`stamps`** (ref) không bị xoá khi `release`; lượt nạp sau lấy dấu vân tay mới nhất từ `loadIndex`.
- Lỗi giữ như cũ: `refreshIndex` lỗi thì giữ chỉ mục đang có; dựng lỗi thì `phase = 'ready'` với `ix = null`.

### 4.3 Tín hiệu "đã xoá chỉ mục": `src/search/store.ts`

`clearIndex()` phát một sự kiện cửa sổ (theo mẫu `src/lib/khoEvents.ts`) sau khi xoá, kể cả khi xoá IndexedDB lỗi. Thêm `onIndexCleared(cb: () => void): () => void`.

### 4.4 `src/pages/SearchPage.tsx`

- Dùng `useSearchIndex(setNames)` thay effect nạp cũ; `useDisplayNames` giữ nguyên.
- Tạo một `IndexHold` cho cả đời trang (`useState(() => createIndexHold(...))`, gọi `acquire`/`release` của hook).
- Nối: mount gọi `enter()`, unmount gọi `dispose()`; `useIonViewWillEnter` gọi `enter()`; `useIonViewDidLeave` gọi `leave()`; `App.addListener('pause')` gọi `pause()`, `'resume'` gọi `resume()` (gỡ listener khi unmount); `onIndexCleared` gọi `invalidate()`.
- `result` thành `{ q: string; r: DocSearchResult }` (câu tra đã sinh ra nó). Danh sách hiển thị là `result.r` khi `ix` đang giữ (giữ hành vi 130 ms như cũ) hoặc khi `result.q === q`; còn lại là rỗng. Tra lại chỉ khi có `ix`, như cũ.
- `DocResultList` vẫn có `key={q}`: quay lại với câu không đổi thì danh sách không mount lại, giữ chỗ cuộn.
- Phần hiển thị còn lại (dòng trạng thái, "Không tìm thấy", màn dựng) không đổi; "đang cập nhật chỉ mục…" hiện theo `refreshing`.

## 5. Lỗi và trường hợp biên

- Nhả giữa lượt nạp hay làm mới: lượt đó chạy nốt (IndexedDB vẫn được ghi nếu kho đổi), kết quả bị bỏ.
- Vào nền giữa lượt dựng lần đầu (khoảng 14 s): lượt dựng chạy nốt và ghi IndexedDB; quay lại thì chờ nó xong rồi nạp từ IndexedDB.
- `pause` rồi `resume` khi đang ở màn Tìm: nạp lại (nửa giây đến một giây), danh sách cũ vẫn hiện.
- Bấm "Dựng lại" khi màn Tìm đang giữ chỉ mục: nhả ngay; vào màn Tìm thì dựng có tiến độ.
- V8 có thể chưa thu hồi ngay khi bỏ tham chiếu; đo trên máy (mục 7).
- `pause` có kịp chạy JS trước khi WebView bị đóng băng hay không: chỉ kiểm được trên máy.

## 6. Kiểm thử

TDD, test đỏ trước.

- `src/search/indexHold.test.ts` (`vi.useFakeTimers`): rời quá `HOLD_MS` thì `release` một lần; quay lại trước hạn thì không `release`, không `acquire` lại; `pause` nhả ngay kể cả khi đang hiển thị; `resume` chỉ `acquire` khi đang hiển thị và chưa giữ; `invalidate` nhả rồi `acquire` lại nếu đang hiển thị, chỉ nhả nếu không; gọi lặp vô hại; `dispose` huỷ hẹn.
- `src/search/useSearchIndex.test.ts` (`renderHook`, giả `./store` bằng promise tự giải): lần đầu `loading` rồi `ready`; `release` đặt `ix = null`; lượt về muộn sau `release` không gắn; `acquire` lúc lượt cũ còn chạy thì `loadIndex` không được gọi lần hai cho tới khi lượt cũ xong; lần sau `refreshing` ngay, không về `loading`; IndexedDB trống thì `building` và tiến độ; làm mới lỗi giữ chỉ mục.
- `src/search/store.test.ts`: `clearIndex` gọi listener của `onIndexCleared`, kể cả khi IndexedDB lỗi; hàm gỡ listener có tác dụng.
- `src/pages/SearchPage.test.tsx` (MỚI): render qua `IonApp` + `IonReactMemoryRouter`; mock `useIonViewWillEnter`/`useIonViewDidLeave` của `@ionic/react` để test tự bắn (đã thử: trong jsdom `useIonViewDidLeave` không bắn khi đẩy trang mới, chỉ bắn muộn khi back); mock `@capacitor/app` để bắt `pause`/`resume`; giả `../search/store`. Ca: rời rồi qua 3 phút, quay lại thì nạp lại và danh sách cũ vẫn hiện kèm "đang cập nhật chỉ mục…"; quay lại trước hạn thì không nạp lại; `pause` rồi `resume` trên màn Tìm thì nạp lại; gõ câu mới trong lúc nạp thì ẩn danh sách cũ, nạp xong hiện kết quả mới; tín hiệu xoá chỉ mục thì lần vào sau dựng có tiến độ.
- `npm test`, `npx tsc -b`, `npm run lint` (0 lỗi, đúng 10 cảnh báo) xanh.

## 7. Cần kiểm trên máy (local)

- Các mục đo trong brief: PSS (tiến trình chính cộng renderer đúng UID) ở Trang chủ, khi màn Tìm có chỉ mục, và sau khi rời quá 3 phút, trước (1.43.0) và sau, trên UBS1 và dGen1; ghi cách ép thu hồi (`am send-trim-memory ... RUNNING_CRITICAL` hay chờ). Thời gian quay lại tới lúc tra được. "Dựng lại" rồi vào màn Tìm. e2e 8/8.
- `useIonViewDidLeave` bắn khi mở Viewer từ kết quả và khi chuyển tab; `useIonViewWillEnter` bắn khi back và khi chuyển tab về.
- `pause` kịp nhả trước khi WebView bị đóng băng (đo PSS sau khi đưa app vào nền).
- Quay lại sau khi đã nhả: danh sách cũ giữ đúng chỗ cuộn, chạm được ngay.

## 8. Ngoài phạm vi

Chỉ mục một tài liệu của Viewer (`docIndex`), `DocSearchSheet`, Mục lục Điều; thu nhỏ định dạng chỉ mục; nghe `onTrimMemory` của Android (cần plugin native); bump version, ghi chú phát hành, CHANGELOG, ops doc.
