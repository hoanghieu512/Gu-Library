# Mở app bằng video panda mở cửa thư viện

*Spec 25/10/2026, phiên local. Hai phần thiết kế đã chốt cùng huynh ngày 25/10. Thay phần lớp cửa vẽ bằng CSS của spec `2026-10-24-mo-cua-tu-sach-design.md`; phần splash kem, công tắc trong Cài đặt và việc chờ hiệu ứng xong của spec đó vẫn giữ.*

## 1. Vì sao đổi

Bản cửa tủ CSS (hướng C, nhánh `feat/opening-doors` tới `efbc9ae`) chạy đúng trên UBS1 nhưng có hai vấn đề:

- Huynh và Gú thấy panda đứng trước cửa không làm gì, rời rạc, không hợp ngữ cảnh.
- Cửa CSS chạy trong WebView, mà ngay sau khi Trang chủ vẽ xong WebView đứng hình 1,2 đến 1,9 s. Cửa phải chờ qua hai lần đứng đó mới mở được, nên Trang chủ hiện trễ hơn 1.43.1 khoảng 1,9 s (trung vị 6,35 s so với 4,45 s, `Docs/perf/2026-10-24-opening-doors.md`).

Hướng mới là hướng A của buổi thảo luận 24/10: video dựng sẵn, panda là nhân vật chính (đi tới, đẩy cửa, bước vào thư viện, quay lại vẫy), phát bằng một lớp Android nằm trên WebView nên không bị WebView kéo theo.

## 2. Mục tiêu và tiêu chí đạt

1. Mở lạnh app, Pé thấy panda thẩm phán đi tới hai cánh cửa gỗ, đẩy cửa, bước vào thư viện và quay lại vẫy, rồi Trang chủ hiện ra.
2. Video không khựng, không có khung đen ở đầu.
3. Từ lúc chạm icon tới lúc Trang chủ hiện, chậm hơn 1.43.1 không quá khoảng 0,5 s (đo trên UBS1 như cách đo ở perf doc). Đo ngày 25/10: chậm hơn 0,69 s (trung vị 5,14 s so với 4,45 s), vì thời gian giờ do độ dài clip quyết định chứ không còn do Trang chủ; huynh chốt giữ nguyên nhịp 4,2 s và lần mờ 300 ms, chấp nhận mức này.
4. Chạm vào đâu hoặc bấm back thì bỏ qua ngay, không thoát app.
5. Không phát khi: công tắc "Hiệu ứng mở cửa" tắt, máy bật "Xoá hiệu ứng động", mở qua "Chia sẻ" file, mở lại sau sự cố renderer, quay lại từ nền.
6. Bảng "Có gì mới" và thông báo sự cố hiện sau khi video xong.
7. Không thêm thư viện nào (Gradle lẫn npm).

## 3. Quyết định đã chốt (với huynh, 25/10)

- **Clip:** clip dọc huynh làm bằng Higgsfield Genjutsu (chuyển động lấy từ một clip tham chiếu huynh quay, ảnh tham chiếu là panda P1, cặp cửa C4 và ảnh thư viện T1 hoặc T2, prompt ở §6), Gú đã duyệt. 696 × 1320, 24 hình/giây, 5,96 s, không có tiếng.
- **Nhịp 4,2 s:** đoạn đi vào tua 1,7 lần, đoạn đẩy cửa và bước vào tua 1,4 lần, đoạn quay lại vẫy 1,1 lần (bản `mo-cua-video-4s.mp4` huynh đã xem).
- **Phát bằng Android, không phát trong WebView:** `SurfaceView` và `MediaPlayer` có sẵn của Android, không dùng ExoPlayer. (Bản đầu dùng `TextureView`: đo trên UBS1 ngày 25/10, video đứng 1,3 s giữa clip vì WebView chặn luồng giao diện của app lúc Trang chủ vẽ lần đầu; `SurfaceView` nhận khung thẳng từ bộ giải mã nên không bị.) Đã bác: thẻ `<video>` trong WebView (khựng đúng lúc Trang chủ đứng hình, dễ lộ khung đen); giữ cửa CSS và cho panda cử động bằng sprite (cũng đứng hình theo WebView, không có cú máy đi vào thư viện).
- **Quyết định phát hay không nằm ở native**, đọc thẳng `CapacitorStorage`: công tắc `opening_doors` và cờ `viewer_crash` đều ở đó. Native đọc được `ANIMATOR_DURATION_SCALE`, nên rủi ro "WebView không nhận Xoá hiệu ứng động" của spec cũ không còn.
- **Giữ từ bản cửa CSS:** splash và nền cửa sổ màu kem, huy hiệu panda ở `index.html` (thấy khi công tắc tắt), công tắc trong Cài đặt, các chỗ chờ `whenOpeningDone()`, helper e2e chờ nút "Bỏ qua hiệu ứng mở cửa" biến mất.
- **Bỏ:** lớp cửa CSS (`OpeningDoors.tsx`, `opening.css`, `art.ts`), máy trạng thái JS (`openingMachine.ts`), bộ chờ khung mượt (`smoothFrames.ts`), hai ảnh cửa và panda, `scripts/make-opening-assets.py`, `skipOpening` (native tự biết share và sự cố).

## 4. Pé thấy gì

1. Chạm icon: splash hệ thống nền kem (đã có từ `ea2114b`).
2. Ngay khung đầu của Activity: ảnh khung đầu của video (hai cánh cửa đóng) phủ màn, rồi video chạy tiếp từ khung đó khi bộ giải mã sẵn sàng. Không có khung đen.
3. Video 4,2 s chạy, Trang chủ nạp kho phía sau.
4. Video hết thì dừng ở khung panda vẫy. Trang chủ đã báo sẵn sàng thì lớp video mờ dần 300 ms để lộ Trang chủ; chưa thì giữ khung cuối tới khi Trang chủ báo, tối đa 2 s.
5. Bảng "Có gì mới" hiện sau đó nếu bản mới có ghi chú.

Chạm hoặc back lúc đang hiện: mờ 200 ms rồi vào Trang chủ (có thể đang nạp). Đo trên UBS1 (25/10): Trang chủ hiện ở trung vị 5,14 s sau khi chạm, 1.43.1 là 4,45 s (`Docs/perf/2026-10-24-opening-doors.md`).

## 5. Thiết kế kỹ thuật

### 5.1 `OpeningGate.java` (MỚI, thuần Java)

```java
static boolean shouldPlay(boolean coldStart, String intentAction, String switchValue,
                          String crashFlag, float animatorScale)
```

Trả `true` khi và chỉ khi: `coldStart` (Activity tạo mới, `savedInstanceState == null`), `intentAction` không phải `ACTION_SEND` hay `ACTION_SEND_MULTIPLE`, `switchValue` khác `"off"`, `crashFlag` khác `"1"`, `animatorScale` khác 0. `MainActivity.recreate()` sau sự cố có `savedInstanceState` khác null và có cờ, nên bị chặn hai lần.

### 5.2 `OpeningFlow.java` (MỚI, thuần Java)

Trạng thái: `POSTER` (ảnh khung đầu), `PLAYING`, `HOLDING` (giữ khung cuối), `FADING` (kèm cờ nhanh 200 ms hay thường 300 ms), `DONE`. Cờ `homeReady` nhớ lại dù tới lúc nào.

- `POSTER` + video vẽ khung đầu thì `PLAYING`.
- `PLAYING` + video hết thì `FADING` thường nếu Trang chủ đã sẵn sàng, không thì `HOLDING`.
- `HOLDING` + Trang chủ sẵn sàng, hoặc hết hạn giữ (`HOLD_MAX_MS = 2000`), thì `FADING` thường.
- `POSTER`, `PLAYING`, `HOLDING` + bỏ qua (chạm, back, share tới lúc đang hiện) thì `FADING` nhanh.
- Bất kỳ trạng thái nào trước `DONE` + lỗi video thì `DONE` ngay; + app vào nền (`onPause`) thì `DONE` ngay; + hết hạn tổng (độ dài video + 3000 ms) thì `FADING` thường.
- `FADING` + mờ xong thì `DONE`. `DONE` bỏ qua mọi sự kiện.

### 5.3 `OpeningOverlay.java` (MỚI)

- Tạo trong `MainActivity.onCreate` sau `super.onCreate` (khi đó WebView đã có), gắn bằng `addContentView` nên nằm trên WebView, chỉ khi `OpeningGate.shouldPlay` đúng.
- Gồm `SurfaceView` phát `res/raw/opening.mp4` bằng `MediaPlayer` (`prepareAsync`, không tiếng), kích thước đặt để phủ kín lớp và căn giữa (`scale = max(rộng lớp / rộng video, cao lớp / cao video)`); trên nó hai ảnh tĩnh `centerCrop`: khung đầu (ẩn khi `MediaPlayer` báo `MEDIA_INFO_VIDEO_RENDERING_START`) và khung cuối (hiện khi video hết, thay cho mặt video lúc giữ và lúc mờ, vì mặt video không mờ được như nhau trên mọi đời Android). Bỏ qua giữa clip thì ẩn mặt video và mờ phần còn lại.
- Gốc của lớp nhận chạm (bỏ qua), có `contentDescription` "Bỏ qua hiệu ứng mở cửa" và được báo cho trợ năng là nút (để e2e tìm bằng role button).
- Nút back: một `OnBackPressedCallback` đăng ký sau `super.onCreate` (nên được gọi trước callback của plugin App), chỉ bật khi lớp còn hiện, gọi bỏ qua.
- `onNewIntent` có `SEND` lúc lớp còn hiện: bỏ qua. `onPause`: `DONE`.
- `DONE`: gỡ lớp khỏi cây view, giải phóng `MediaPlayer`, tắt callback back, trả mọi lời gọi `whenDone` đang chờ.
- Lớp nằm trong vùng nội dung (thanh trạng thái giữ nguyên như hiện nay).

### 5.4 `OpeningPlugin.java` (MỚI) và `src/plugins/opening.ts` (MỚI)

- `homeReady()`: báo cho `OpeningFlow`. `whenDone()`: trả ngay nếu không phát hoặc đã xong, không thì giữ tham chiếu tới lời gọi và trả một lần khi `DONE` (không cần `setKeepAlive`, chỉ dành cho lời gọi trả nhiều lần). Khi `DONE`, `MainActivity` bỏ tham chiếu tới lớp video và lớp thả hai ảnh tĩnh (khoảng 7 MB bitmap), nên các lời gọi sau đó trả ngay.
- `opening.ts`: `registerPlugin('Opening', { web })` với bản web trả ngay cả hai hàm, nên trình duyệt, jsdom và test không treo.
- Đăng ký trong `MainActivity` cùng các plugin khác (trước `super.onCreate`).

### 5.5 Sửa ở JS

- `src/opening/homeReady.ts`: `markHomeReady()` gọi `Opening.homeReady()` (một lần, nuốt lỗi); `whenOpeningDone()` trả promise của `Opening.whenDone()` (nhớ trong lần nạp, lỗi thì coi như xong); giữ `resetOpeningForTest()`. Bỏ `skipOpening`, `subscribeOpening`, `finishOpening`.
- `ShareReceiver.tsx`, `CrashNotice.tsx`: bỏ lời gọi `skipOpening`. `CrashNotice` và `WhatsNewNotice` vẫn chờ `whenOpeningDone()`.
- `App.tsx`: bỏ `<OpeningDoors />`; `App.test.tsx` giữ nguyên cách kiểm tiêu đề.
- `HomePage.tsx`, `SettingsPage.tsx`, `openingPref.ts`: giữ nguyên.

### 5.6 e2e

Helper `toTab` giữ nguyên ý: chờ cây trợ năng nạp xong rồi chờ nút "Bỏ qua hiệu ứng mở cửa" biến mất (giờ là view Android, tối đa khoảng 4,2 + 2 + 0,3 s). Sửa lại chú thích và `e2e/README.md` cho đúng thời lượng.

## 6. Asset

- `scripts/make-opening-video.sh <clip gốc>` (ffmpeg, cwebp): cắt 0,15 đến 1,6 s tua 1,7 lần, 1,6 đến 4,6 s tua 1,4 lần, 4,6 s tới hết tua 1,1 lần; 30 hình/giây; H.264 main, CRF 23, `+faststart`, không tiếng; ghi `android/app/src/main/res/raw/opening.mp4` (khoảng 1,1 MB), khung đầu `opening_first.webp` và khung cuối `opening_last.webp` trong `android/app/src/main/res/drawable-nodpi/`.
- Clip gốc không commit. Ops doc §8 ghi: model (Higgsfield Genjutsu, style mặc định, 720p lượt free), ảnh tham chiếu (P1, C4, thư viện), prompt, clip tham chiếu do huynh quay (không công bố), ngày tạo.
- Prompt đã dùng: như bản đệ gửi huynh ngày 25/10 (panda từ @image1, cửa @image2, thư viện @image3, đi vào từ trái, cúi chào, đẩy hai cánh cửa, máy đi theo vào thư viện, quay lại vẫy, không chữ).
- APK đo được: 6 640 325 B, hơn 1.43.1 khoảng 1,3 MB (video 1,1 MB, hai ảnh tĩnh khoảng 160 KB, bộ splash kem).

## 7. Lỗi và trường hợp biên

- Video lỗi hoặc không chuẩn bị được: `DONE` ngay, Trang chủ như khi tắt công tắc.
- Trang chủ không bao giờ báo sẵn sàng (kho lỗi): giữ khung cuối tối đa 2 s rồi mờ; hạn tổng chặn mọi trường hợp kẹt khác.
- Pé bấm Home lúc video đang chạy: `DONE`; quay lại là Trang chủ, không phát lại.
- Share tới lúc video đang chạy: bỏ qua video, sheet chọn đích hiện.
- Màn vuông (dGen1): cắt giữa; khung đầu và khung cuối vẫn thấy cửa và mặt panda.
- Lúc lớp video mờ đi, WebView có thể đang đứng hình: Pé thấy Trang chủ đã vẽ (kệ, thẻ đọc dở), chạm được ngay khi WebView chạy lại, như ở 1.43.1.

## 8. Kiểm thử tự động

- JUnit (`./gradlew testReleaseUnitTest`): `OpeningGateTest` (mỗi điều kiện chặn một lần, đủ điều kiện thì phát), `OpeningFlowTest` (bảng chuyển trạng thái ở §5.2, kể cả `DONE` bỏ qua mọi sự kiện và cờ `homeReady` tới sớm).
- vitest: `opening.ts` bản web trả ngay; `homeReady.test.ts` viết lại theo plugin giả (gọi `homeReady` một lần, `whenOpeningDone` chờ đúng plugin, lỗi plugin thì coi như xong); test của `CrashNotice`, `WhatsNewNotice`, `ShareReceiver`, `HomePage` sửa theo API mới.
- Cổng: `npm test`, `npx tsc -b`, `npm run lint` (0 lỗi, đúng 10 cảnh báo), `npm run build`, `./gradlew testReleaseUnitTest`.

## 9. Kiểm và đo trên máy (local)

- UBS1, mở bằng chạm icon, 3 lượt: thời gian tới lúc Trang chủ hiện (cách đo của perf doc), so với 1.43.1 (4,45 s); không có khung đen, video không khựng.
- Chạm và back ở đầu, giữa, khung giữ cuối; về nền giữa chừng rồi quay lại; share lúc app tắt và lúc video đang chạy; công tắc tắt; "Xoá hiệu ứng động" (cần huynh cho đổi thang hiệu ứng hệ thống, trả lại sau khi kiểm).
- dGen1 màn vuông, mở lạnh lần đầu sau khi cài (không force-stop).
- e2e 10/10. PSS sau khi lớp video đã gỡ, so với 1.43.1. Cỡ APK.

## 10. Phát hành

- Bản 1.44.0 theo quy trình trong `CLAUDE.md`. Ghi chú cho Pé (huynh duyệt câu chữ) kể panda mở cửa thư viện, chạm để bỏ qua, chỗ tắt trong Cài đặt, và splash không còn chớp trắng.
- `CHANGELOG.md`, ops doc §8.1 và §8 (asset video), `Docs/claude/lessons.md` (WebView đứng hình sau khi Trang chủ vẽ và cách đo, model ảnh không giữ bộ, Genjutsu cần clip tham chiếu và cho ra khổ theo clip đó, splash hệ thống tắt trước khi WebView kịp vẽ).

## 11. Rủi ro còn mở

- `MediaPlayer` mất bao lâu từ `prepareAsync` tới khung đầu trên máy yếu: ảnh khung đầu che khoảng đó. Trên UBS1 và dGen1 không thấy khung đen hay đoạn bị mất; chưa có số đo trên máy của Gú.
- Mặt video của `SurfaceView` không mờ như nhau trên các đời Android cũ: đã tránh bằng ảnh khung cuối (lúc giữ và lúc mờ chỉ có ảnh tĩnh); bỏ qua giữa clip thì ẩn mặt video ngay.
- Máy của Gú (chưa rõ đời Android) có thể nạp Trang chủ chậm hơn: hạn giữ 2 s chặn trường hợp này.

## 12. Ngoài phạm vi

Âm thanh, nhiều clip ngẫu nhiên, video riêng cho màn vuông hay màn ngang, edge-to-edge, panda xuất hiện ở chỗ khác của app.
