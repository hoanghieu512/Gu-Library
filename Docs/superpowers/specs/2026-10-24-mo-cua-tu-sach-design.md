# Hiệu ứng mở cửa tủ sách khi mở app

*Spec 24/10/2026, phiên local. Bốn phần thiết kế đã chốt cùng huynh ngày 24/10. Nguồn ý tưởng: mockup "panda mở cửa thư viện" (storyboard 6 cảnh, 0 đến 3 s) và một prompt viết cho React Native/Expo mà huynh mang tới. Huynh và Gú thích cảm giác của mockup; spec này giữ cái hồn đó nhưng sửa cho khớp app thật.*

## 1. Vấn đề

Mở app hiện nay đi thẳng từ splash native (vẫn là ảnh mặc định của Capacitor, dấu X xanh trên nền trắng) vào Trang chủ, và Trang chủ phải chờ đi kho mới vẽ xong. Không có khoảnh khắc nào mang chất "Gú's Library". Mockup đem lại khoảnh khắc đó nhưng lệch app ở nhiều chỗ:

| | Mockup | App thật |
|---|---|---|
| Mascot | Panda đội mũ tốt nghiệp, toàn thân | Icon app là đầu panda đội tóc giả thẩm phán (`resources/source-1024.png`) |
| Tông màu | Tối, đen nâu, đèn vàng | Trang chủ sáng, nền giấy kem `#E9E5CD`, tủ gỗ nâu |
| Home cuối | Lời chào "Chào bạn, Huynh", tab Thư viện / Đọc dở / Cá nhân | Tab Trang chủ / Tìm / Thêm / Cài đặt; "Chưa phân loại" là máy ép trên kệ; có thẻ Đi in |
| Công nghệ | React Native/Expo, Reanimated, Lottie | Capacitor + Ionic React trong WebView |
| Thời lượng | 2,4 đến 3 s mỗi lần mở | Pé mở app để tra luật, nhiều lần mỗi ngày |
| Khung hình | Dọc 9:16 | dGen1 màn vuông 720 × 720 |

## 2. Mục tiêu và tiêu chí đạt

1. Mở lạnh app, Pé thấy hai cánh cửa tủ gỗ có panda tóc giả đứng chào, cửa mở ra và phía sau là Trang chủ thật.
2. Cửa che khoảng chờ nạp kho chứ không bắt Pé chờ thêm: tính từ lúc Trang chủ sẵn sàng, cửa chỉ tốn thêm khoảng 1 s.
3. Chạm vào đâu cũng bỏ qua được; nút back cứng cũng bỏ qua, không thoát app.
4. Không bao giờ chặn việc khác: quay lại từ nền, mở qua "Chia sẻ" file, mở lại sau sự cố đều không có cửa.
5. Pé tắt được trong Cài đặt; máy bật giảm chuyển động thì không có cửa.
6. Từ splash qua cửa qua Trang chủ không chớp trắng, không nhảy layout.
7. Không có thư viện mới, không đổi router, tab, dữ liệu hay luồng nạp kho của Trang chủ.

## 3. Quyết định đã chốt (với huynh, 24/10)

- **Hướng C: cửa tủ sách mở ra Trang chủ thật.** Trang chủ đã là "Tủ sách luật" có khung tủ gỗ, nên cánh cửa là cửa của chính cái tủ đó. Đã bác: (A) video dựng sẵn bằng model video (bản lề và panda dễ méo, tốn nhiều lượt sinh, khung cố định nên dGen1 bị cắt, khó chỉnh nhịp, video lúc mở lạnh dễ có khung đen); (B) cổng thư viện 2.5D theo lớp như mockup (nội thất và cửa sinh riêng khó khớp ánh sáng, vẫn còn cú chuyển từ cảnh tối sang Trang chủ sáng, nhiều asset). Lớp nội thất của B gắn thêm vào C được nếu sau này muốn đoạn "bay vào thư viện".
- **Mascot: giữ panda tóc giả thẩm phán**, chất 3D bóng như đồ chơi giống icon, không theo chất lông mềm của mockup. Đi một mạch icon, splash, cửa tủ mà không đổi nhân vật. Đã bác: mũ tốt nghiệp (lệch icon, phải đổi icon theo).
- **Tần suất: mỗi lần mở lạnh, có công tắc "Hiệu ứng mở cửa" trong Cài đặt, mặc định bật.** Đã bác: chỉ lần mở lạnh đầu tiên mỗi ngày (ít khi thấy, các lần sau lại lộ khoảng chờ); không có công tắc (thấy phiền thì phải đợi bản sau).
- **Không chạy khi:** quay lại từ nền, mở qua "Chia sẻ" file, mở lại sau sự cố renderer, máy bật giảm chuyển động, công tắc tắt, không đọc được công tắc.
- **Asset: sinh 2 ảnh tĩnh bằng OpenRouter** (một cánh cửa, một panda toàn thân); mọi thứ khác vẽ bằng CSS. Đã bác: Higgsfield lúc này (tài khoản 0 credit; để dành AutoSprite cho bản sau nếu muốn panda cử động thật).
- **Không âm thanh. Trang chủ không tự diễn thêm hiệu ứng nào** (không stagger các khối).

## 4. Kịch bản (Pé thấy gì)

**0. Bấm icon.** Splash native nền kem, giữa màn là đầu panda tóc giả.

**1. Cửa đóng, trong lúc Trang chủ nạp kho phía sau.** Hai cánh cửa tủ gỗ phủ kín màn, cùng tông nâu với khung tủ ở Trang chủ, tay nắm đồng ở mép trong. Một tấm bảng đồng nhỏ "Gú's Library" (chữ HTML, Merriweather) nằm ngang khe cửa ở khoảng một phần năm chiều cao. Panda toàn thân đứng ở nửa dưới màn, nhún nhẹ. Một vệt sáng vàng mảnh dọc khe giữa hai cánh, sáng dần. Cửa đứng ít nhất 0,4 s và đứng tới khi Trang chủ vẽ xong; quá hạn 2,5 s kể từ khi lớp cửa gắn vào (ngay khi React chạy) thì cửa vẫn mở, Trang chủ tự hiện trạng thái của nó.

**2. Mở cửa, khoảng 0,7 s.** Bảng đồng mờ đi. Panda nghiêng đầu chào rồi lùi xuống, mờ dần. Hai cánh xoay ra ngoài quanh bản lề ở mép màn, có phối cảnh. Vệt sáng ở khe nở thành một mảng ánh vàng.

**3. Vào Trang chủ, khoảng 0,3 s.** Ánh vàng tan vào nền kem, lớp cửa rời khỏi DOM, Trang chủ nhận chạm. Bản mới có ghi chú thì bảng "Có gì mới" hiện lúc này.

**Trường hợp khác:** chạm hoặc back lúc đang diễn thì cửa bật mở nhanh khoảng 0,2 s rồi vào Trang chủ. Công tắc tắt hoặc giảm chuyển động: splash xong vào Trang chủ như hiện nay.

## 5. Thiết kế kỹ thuật

Mọi mảnh mới nằm trong `src/opening/`. Hằng số thời gian:

```ts
export const MIN_SHOWN_MS = 400;   // doors stay at least this long once shown
export const DEADLINE_MS = 2500;   // from mount: open even if Home is not ready
export const OPEN_MS = 1000;       // doors 700 + fade into Home 300
export const FAST_MS = 200;        // skip
export const DOORS_FADE_IN_MS = 150;
```

### 5.1 Máy trạng thái: `src/opening/openingMachine.ts` (MỚI, thuần)

```ts
export type OpeningState = 'cover' | 'closed' | 'opening' | 'fastOpen' | 'done';
export type SkipReason = 'tap' | 'back' | 'share' | 'crash';
export type OpeningEvent =
  | { type: 'start'; play: boolean }   // pref read + reduced motion checked + images decoded
  | { type: 'homeReady' }
  | { type: 'minElapsed' }             // MIN_SHOWN_MS after entering `closed`
  | { type: 'deadline' }               // DEADLINE_MS after mount
  | { type: 'skip'; reason: SkipReason }
  | { type: 'animEnd' };
export interface OpeningModel { state: OpeningState; homeReady: boolean; minElapsed: boolean }
export function initialModel(): OpeningModel;   // { state: 'cover', homeReady: false, minElapsed: false }
export function step(m: OpeningModel, e: OpeningEvent): OpeningModel;
```

Luật của `step`:

- `cover` + `start{play:true}` thành `closed`; `start{play:false}` thành `done`.
- `homeReady` và `minElapsed` chỉ bật cờ; ở `closed`, khi cả hai cờ đều bật thì thành `opening` (cờ bật trước khi vào `closed` vẫn được tính).
- `deadline`: `cover` thành `done` (chưa kịp quyết thì thôi, không hiện cửa muộn); `closed` thành `opening`; trạng thái khác giữ nguyên.
- `skip`: `cover` thành `done`; `closed` và `opening` thành `fastOpen`; trạng thái khác giữ nguyên.
- `animEnd`: `opening` và `fastOpen` thành `done`.
- Ở `done` mọi sự kiện bị bỏ qua: cửa không bao giờ hiện lại trong cùng một lần nạp WebView.

### 5.2 Tín hiệu dùng chung: `src/opening/homeReady.ts` (MỚI)

```ts
export function markHomeReady(): void;              // idempotent
export function skipOpening(reason: SkipReason): void;
export const openingDone: Promise<void>;            // resolves once
export function subscribeOpening(l: (e: OpeningEvent) => void): () => void; // for OpeningDoors
export function finishOpening(): void;              // OpeningDoors calls on `done` and on unmount
export function resetOpeningForTest(): void;
```

Module giữ cờ `homeReady` và lý do bỏ qua đầu tiên, nên kẻ đăng ký muộn vẫn nhận được sự kiện đã xảy ra trước đó. `openingDone` resolve khi `OpeningDoors` tới `done` hoặc bị unmount.

### 5.3 Lớp vẽ: `src/opening/OpeningDoors.tsx` + `opening.css` (MỚI)

- Gắn một lần trong `App.tsx`, trong `IonApp`, cạnh `CrashNotice`. Mỗi lần WebView nạp trang chỉ gắn một lần, nên quay lại từ nền không chạy lại; Activity khai `configChanges` đủ nên xoay màn hay đổi cỡ chữ không nạp lại WebView.
- Lúc mount: hẹn `deadline`; đọc công tắc (5.4) và `matchMedia('(prefers-reduced-motion: reduce)')`; nếu được chạy thì `img.decode()` hai ảnh rồi mới gửi `start{play:true}` (cửa hiện bằng mờ dần `DOORS_FADE_IN_MS`, không lộ ảnh đang giải mã).
- Gốc của lớp là một `<button>` phủ màn, `aria-label="Bỏ qua hiệu ứng mở cửa"`, `position: fixed; inset: 0`, `z-index` cao hơn mọi overlay của Ionic. Ở `cover` nền kem trơn `#E9E5CD`, cùng màu splash.
- Nút back cứng: lúc lớp còn sống, đăng ký handler `ionBackButton` priority 100 (cao hơn 50 và 60 của `useAndroidBackButton`) gửi `skip{back}` và không gọi `processNextHandler`.
- Cấu trúc: `.stage` có `perspective`; `.door-left` rộng 50%, `transform-origin: left center`; `.door-right` rộng 50%, `transform-origin: right center`, ảnh bên trong lật bằng `scaleX(-1)` ở phần tử con (để `rotateY` của phần tử ngoài không bị lật theo); ảnh `object-fit: cover; object-position: center`. `.seam` là gradient vàng (`#e7c56e`, màu `GOLD` của `MonShelf`) rộng vài px ở giữa; `.glow` là gradient vàng sang kem phủ màn; `.plaque` là bảng đồng CSS; `.panda` ở giữa mép dưới, cao `min(36vh, 60vw)`, cách đáy theo `env(safe-area-inset-bottom)`.
- Chuyển động bằng CSS keyframes gắn theo class của trạng thái, chỉ `transform` và `opacity`: panda nhún `translateY` lặp ở `closed`; ở `opening` cửa `rotateY(0 → ∓100deg)` 700 ms, `cubic-bezier(.45,0,.2,1)`, `backface-visibility: hidden`, bóng tối trên cánh là một lớp phủ đổi `opacity`; `.seam` giãn `scaleX` và `.glow` hiện dần trong nửa sau, rồi cả lớp `opacity 1 → 0` trong 300 ms cuối. `fastOpen` chạy rút gọn trong `FAST_MS`. Không dùng blur, không đổi `box-shadow` theo khung, `will-change: transform` chỉ trên cửa và panda.
- Kết thúc: `animationend` của phần tử cuối gửi `animEnd`; kèm một timer dự phòng bằng thời lượng cộng 300 ms phòng khi `animationend` không bắn. Ở `done` component trả về `null` (rời DOM hẳn, không thể chặn chạm) và gọi `finishOpening()`. Mọi timer và listener được dọn khi unmount.
- Không dùng Web Animations API (jsdom không có `element.animate`).

### 5.4 Công tắc: `src/opening/openingPref.ts` (MỚI) + Cài đặt

- Khoá Preferences `opening_doors`: không có giá trị là bật, `'off'` là tắt. `getOpeningEnabled()` lỗi thì ném ra; `OpeningDoors` coi lỗi là không chạy (giống `WhatsNewNotice`: đọc không được thì không làm phiền).
- `SettingsPage`: thêm một `Row` "Hiệu ứng mở cửa", gợi ý "Cửa tủ sách mở ra mỗi lần khởi động app", `trailing` là `IonToggle`. Đổi có tác dụng từ lần mở lạnh sau.

### 5.5 Sửa ở chỗ có sẵn

- `src/pages/HomePage.tsx`: trong `reload`, gọi `markHomeReady()` cùng callback `afterPaint` với `perfColdReady`.
- `src/import/ShareReceiver.tsx`: khi `getSharedFiles` trả về file, gọi `skipOpening('share')` trước `setBatch`. (`getSharedFiles` đọc xong là xoá, nên lớp cửa không tự hỏi được.) Lúc resume máy trạng thái đã ở `done` nên lệnh này vô hại.
- `src/components/CrashNotice.tsx`: thấy cờ `viewer_crash` thì gọi `skipOpening('crash')`, chờ `openingDone`, rồi mới hiện alert.
- `src/components/WhatsNewNotice.tsx`: có ghi chú chưa xem thì chờ `openingDone` rồi mới `setOpen(true)` (vẫn kiểm `alive`).
- `src/App.tsx`: gắn `<OpeningDoors />`.

### 5.6 Splash native và màu nền

- `android/app/src/main/res/values/styles.xml` (và `values-v31` nếu cần): theme khởi động có `windowSplashScreenBackground` `#E9E5CD`, icon là foreground của icon app.
- Thay `drawable*/splash.png` mặc định của Capacitor bằng nền kem có đầu panda (sinh bằng `@capacitor/assets` từ `assets/`, đã có trong devDependencies).
- `capacitor.config.ts`: `backgroundColor: '#E9E5CD'`. `index.html`: `body` nền `#E9E5CD` ngay trong thẻ (trước khi CSS nạp), sửa luôn `<title>` thành "Gú's Library".
- Mục tiêu: splash, nền WebView và trạng thái `cover` cùng một màu, không có khung trắng.

### 5.7 e2e

`app.open()` mở lạnh lại app ở mỗi test nên cửa hiện ở đầu cả 10 test. `toTab` trong `e2e/tests/helpers.ts`, trước bước kiểm "Có gì mới": nếu thấy nút "Bỏ qua hiệu ứng mở cửa" trong khoảng 3 s thì chạm, rồi chờ nó biến mất (tối đa 2 s). Không làm vậy thì cú chạm vào tab rơi trúng lớp cửa và chỉ bỏ qua hiệu ứng.

## 6. Asset

### 6.1 Chỉ sinh 2 ảnh

| File | Thành phẩm | Ghi chú |
|---|---|---|
| `src/assets/opening-door.webp` | Một cánh, khoảng 600 × 1600, không alpha, dưới 120 KB | Cánh phải là ảnh này lật gương, nên hai cánh luôn khớp |
| `src/assets/opening-panda.webp` | Có alpha, cao khoảng 600 px, dưới 80 KB | Ảnh tham chiếu: `resources/source-1024.png` |

Không sinh: vệt sáng và ánh vàng (gradient CSS), bảng đồng (CSS + Merriweather), splash (`assets/icon-foreground.png` có sẵn). Tổng APK nặng thêm mục tiêu dưới 250 KB.

### 6.2 Prompt nháp (tiếng Anh, chỉnh khi sinh)

- **Cửa:** "A single tall cabinet door of a classic law library bookcase, seen perfectly straight-on (orthographic, no perspective, no tilt), filling the whole frame edge to edge. Warm brown wood matching #825731 to #5b3d1c, raised carved panels, soft even lighting, subtle wood grain. A small aged-brass handle near the right edge, brass hinges on the left edge. No text, no nameplate, no background visible."
- **Panda:** dùng icon làm ảnh tham chiếu. "Full-body version of this exact panda character: same face, same white judge's wig with black band, same glossy toy-like 3D material and pink cheeks. Standing upright facing the viewer, holding a small leather-bound book against its chest with both paws, friendly calm expression. Plain flat medium-brown background (#6b4823), no shadow on the background, centered, whole body in frame."

Panda sinh trên nền nâu trơn gần màu cửa: viền sót lại sau khi tách nền hoà vào cánh cửa, không thành quầng trắng.

### 6.3 Công cụ và chi phí

- OpenRouter, key trong biến môi trường `OPENROUTER_API_KEY` (đã có, đang dùng cho e2e). Ngày 24/10 tài khoản còn khoảng 3,4 USD.
- Chọn model ở bước làm asset: chạy cùng prompt một lượt nhỏ trên `google/gemini-nano-banana-2.1` và `google/gemini-3-pro-image`, giữ model cho bản đẹp hơn. Mỗi lượt 3 đến 4 bản để huynh và Gú chọn. Trần chi tiêu cho cả beat: 3 USD.
- Script gọi API `scripts/gen-opening-art.mjs` (Node, không thêm dependency, dùng `fetch`): nhận prompt, model, ảnh tham chiếu và thư mục ra; ghi ảnh gốc ra ngoài repo. Không bao giờ in hay ghi key.

### 6.4 Xử lý ảnh: `scripts/make-opening-assets.py` (MỚI, chạy một lần)

Theo tiền lệ `scripts/make-press-sprites.py`: Pillow + numpy trong venv tạm, không thành dependency của repo.

- Cửa: cắt sát mép cánh, loại bản không chính diện (không nắn phối cảnh bằng code), cắt phủ về 600 × 1600, xuất WebP chất lượng khoảng 82.
- Panda: tách nền theo khoảng cách màu tới màu nền lấy mẫu ở bốn góc, gọt viền 1 px, làm mềm mép, cắt sát theo alpha, thu về cao khoảng 600 px, xuất WebP có alpha. Nếu viền vẫn xấu thì dùng `rembg` trong cùng venv tạm.
- Ảnh gốc không commit (repo public, ảnh nặng). Prompt, model và ngày sinh ghi vào ops doc §8 dưới bản phát hành, như máy ép.

### 6.5 Tạm thời khi chưa có ảnh

Code không chờ asset: cửa tạm là gradient CSS theo màu khung tủ, panda tạm là đầu panda thu nhỏ từ icon. Thay ảnh thật không phải sửa animation. Bản phát hành bắt buộc dùng ảnh thật.

## 7. Lỗi và trường hợp biên

- Kho chậm hoặc lỗi, Trang chủ không bao giờ gọi `markHomeReady`: hạn 2,5 s mở cửa, Trang chủ hiện trạng thái của nó (chưa chọn kho, kho bị giấu, danh sách rỗng).
- Đọc công tắc treo: tới hạn mà còn ở `cover` thì vào `done`, không hiện cửa muộn.
- Ảnh không giải mã được: coi như không chạy (`start{play:false}`).
- Lần cài đầu chưa chọn kho: Trang chủ vẫn gọi `markHomeReady`, cửa mở ra màn "Chưa chọn folder kho".
- `animationend` không bắn: timer dự phòng gửi `animEnd`.
- `OpeningDoors` lỗi khi render: không có cửa, nhưng `openingDone` có thể không resolve và bảng "Có gì mới" không hiện ở lần đó; chấp nhận, lần mở sau hiện lại.
- Mở qua share lúc app đang tắt: `skipOpening('share')` tới trong vài chục ms, lớp ở `cover` thì biến luôn, ở `closed` thì bật mở nhanh.

## 8. Kiểm thử tự động

TDD: test đỏ trước rồi mới viết code.

- `openingMachine.test.ts`: bảng chuyển trạng thái ở 5.1, gồm: không chạy (công tắc tắt, giảm chuyển động, lỗi đọc) vào `done`; Trang chủ sẵn sàng trước 0,4 s vẫn chờ đủ; hạn 2,5 s; bỏ qua ở từng trạng thái; sự kiện tới sau `done` bị bỏ qua.
- `homeReady.test.ts`: cờ và lý do bỏ qua tới trước khi đăng ký vẫn được giao; `openingDone` resolve đúng một lần.
- `OpeningDoors.test.tsx` (jsdom, timer giả, giả `img.decode` và `matchMedia`): rời DOM khi `done`; chạm nút bỏ qua vào `done` sau `FAST_MS`; back cứng bỏ qua; unmount giữa chừng không để sót timer (`vi.getTimerCount()`) và không setState sau unmount.
- `WhatsNewNotice`, `CrashNotice`, `ShareReceiver`: hiện sau `openingDone`, gọi `skipOpening` đúng lúc.
- `openingPref` và hàng công tắc ở `SettingsPage`: mặc định bật, ghi và đọc đúng khoá.
- Cổng: `npm test`, `npx tsc -b`, `npm run lint` (0 lỗi), `npm run build`.

## 9. Cần kiểm và đo trên máy (local)

**Đo nền trước khi code, trên bản 1.43.1 (UBS1):** thời gian từ lúc chạm icon tới lúc Trang chủ vẽ xong, và có khoảng trắng giữa splash và Trang chủ không (`adb shell screenrecord` + `ffprobe -show_entries frame=pts_time`).

**Danh sách kiểm, UBS1 và dGen1:**

- Cửa đóng, mở, vào Trang chủ đúng nhịp; panda và cửa không méo trên màn dọc và màn vuông; không có khung trắng.
- Chạm bỏ qua ở từng giai đoạn; back cứng bỏ qua, không thoát app.
- Về nền rồi quay lại: không có cửa.
- Share một file từ app khác lúc app đang tắt: không có cửa, sheet chọn đích hiện.
- Tắt công tắc: không có cửa. Bật "Xoá hiệu ứng động" (Trợ năng): không có cửa; ghi lại WebView có phản ánh qua `prefers-reduced-motion` không.
- Bảng "Có gì mới" hiện sau khi cửa mở xong.
- Mở lạnh: UBS1 force-stop thoải mái. dGen1 không force-stop (bẫy WebView đen); chỉ kiểm mở lạnh ở lần mở đầu sau khi cài, bằng `monkey`.

**Đo A/B so với 1.43.1, mỗi bản 3 lượt, UBS1:** khung giật lúc mở lạnh (`dumpsys gfxinfo` reset rồi mở), PSS Trang chủ sau khi lớp cửa đã rời DOM, cỡ APK. Không tuyên bố đạt 60 FPS nếu chưa đo ra.

**e2e:** 10/10 với helper bỏ qua cửa.

## 10. Phát hành

- Bản **1.44.0** (tính năng mới), theo quy trình phát hành trong `CLAUDE.md`.
- Ghi chú "Có gì mới" cho Pé: kể cửa tủ và chỉ chỗ tắt trong Cài đặt; huynh duyệt câu chữ trước khi merge.
- `CHANGELOG.md`, ops doc §8.1 (kết quả kiểm, prompt và model của 2 ảnh).
- `Docs/claude/lessons.md`: quyết định cửa tủ, panda tóc giả, asset qua OpenRouter, và mọi bẫy gặp trên máy (splash, giảm chuyển động).

## 11. Rủi ro còn mở

- WebView có phản ánh "Xoá hiệu ứng động" của Android qua `prefers-reduced-motion` không. Nếu không: thêm một phương thức native nhỏ đọc `Settings.Global.ANIMATOR_DURATION_SCALE` (bằng 0 là giảm chuyển động).
- Thuộc tính splash trong theme có ăn không khi `BridgeActivity` của Capacitor không gọi `installSplashScreen()`. Nếu không: gọi `installSplashScreen()` trong `MainActivity.onCreate` trước `super.onCreate`.
- Model ảnh có thể ra cửa không thẳng hoặc không chính diện, hoặc panda lệch khuôn mặt icon: sinh thêm lượt trong trần 3 USD; vượt trần thì hỏi huynh.
- Máy của Gú có thể mở lạnh chậm hơn UBS1: hạn 2,5 s chặn trường hợp này; nếu đo thấy Trang chủ thường quá 2,5 s thì xem lại hạn.

## 12. Ngoài phạm vi

Đoạn camera bay vào thư viện (hướng B), video, âm thanh, panda cử động thật (AutoSprite), stagger các khối Trang chủ, theme tối, đổi icon app, đưa panda vào chỗ khác của Trang chủ.
