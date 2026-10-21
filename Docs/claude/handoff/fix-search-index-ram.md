---
branch: fix/search-index-ram
base: c3e5f0e
date: 2026-10-21
status: ready-for-device
---

# Nhả chỉ mục tìm kiếm khỏi RAM sau khi rời màn Tìm

Phiên cloud 21/10. Brief `Docs/claude/briefs/2026-10-21-nha-chi-muc-ram.md`; spec `Docs/superpowers/specs/2026-10-21-nha-chi-muc-ram-design.md`; plan `Docs/superpowers/plans/2026-10-21-nha-chi-muc-ram.md`. Bản sửa hiệu năng, phát hành dự kiến 1.43.1. Không bump version, không sửa `notes.ts`, `CHANGELOG.md`, ops doc.

## Đã làm

- `0d6dcf5`, `319e5d8`: spec và plan (bốn câu của brief và hai phần thiết kế đã chốt với huynh).
- `9b2076b`: `src/search/indexHold.ts`, luật thuần: rời màn Tìm quá 3 phút (`HOLD_MS`) thì nhả, quay lại trước hạn thì giữ; app vào nền (`pause`) thì nhả ngay kể cả khi đang ở màn Tìm; `resume` chỉ nạp lại khi đang ở màn Tìm; `invalidate` sau khi xoá chỉ mục.
- `016b522`: `clearIndex` phát tín hiệu `onIndexCleared` (kể cả khi xoá IndexedDB lỗi).
- `b43e5a4`: `src/search/useSearchIndex.ts`, hook giữ chỉ mục; đường nạp cũ của `SearchPage` chuyển sang nguyên vẹn; mỗi lượt nạp mang một số thứ tự, `release` làm lượt về muộn vô hiệu, `acquire` lúc đang nạp thì xếp hàng (không bao giờ hai bản chỉ mục cùng được dựng).
- `2793fc6`: nối vào `SearchPage`: mount và `useIonViewWillEnter` gọi `enter`, `useIonViewDidLeave` gọi `leave`, `App` `pause`/`resume`, `onIndexCleared`. Kết quả nhớ kèm câu tra: lúc đã nhả, danh sách cũ chỉ hiện khi khớp câu trong ô. Test trang mới `src/pages/SearchPage.test.tsx`.
- `abe5321`: `Docs/claude/lessons.md`.
- `564f527`: sửa theo review độc lập: `release` commit hai lần bằng `flushSync` để React không giữ chỉ mục trên fiber alternate (xem Bẫy); lượt dựng thứ hai trong phiên bắt đầu thanh tiến độ từ 0.

## Quyết định

- Lúc nhả: rời màn Tìm quá 3 phút, hoặc app vào nền thì nhả ngay. Bỏ "nhả ngay khi rời" (đường "kết quả, đọc, back" lần nào cũng chờ), "chỉ hẹn giờ" (timer của WebView ở nền có thể bị hãm), "chỉ khi vào nền" (đọc cả tiếng trong app vẫn ôm chỉ mục).
- Mở kết quả sang Viewer cũng tính là rời: một luật cho mọi kiểu rời; đọc lâu ở Viewer chính là lúc nên trả RAM.
- Quay lại sau khi đã nhả: giữ danh sách kết quả cũ (chạm được, giữ chỗ cuộn), dòng trạng thái dùng lại câu sẵn có "đang cập nhật chỉ mục…". Gõ câu khác trong lúc nạp thì ẩn danh sách cũ. Không thêm chữ mới trên màn.
- Giữ `result` (mỗi tài liệu khớp một đoạn), bảng tên hiển thị và dấu vân tay khi nhả; bỏ bảng token và danh sách đơn vị.
- Vá lỗ hổng có từ trước: "Dựng lại chỉ mục" ở Cài đặt nay luôn làm màn Tìm bỏ chỉ mục đang giữ; vào màn Tìm thì dựng lại có tiến độ.
- Ở `SearchPage` giữ nguyên em dash trong câu "Không tìm thấy đoạn nào" (xem "Còn mở"), vì spec cấm đổi chữ trên màn khi chưa được huynh duyệt.

## Bẫy đã gặp

- React giữ state cũ trên fiber alternate tới lần render kế. `setIx(null)` một lần không giải phóng chỉ mục nếu trang không render lại, mà trang Tìm nằm sau Viewer hay app ở nền thì không render. Reviewer bắt được; đệ kiểm lại bằng probe `WeakRef` + `gc()` dưới React production (`NODE_ENV=production npx vitest run <file> --execArgv=--expose-gc`): trước sửa "còn giữ sau khi nhả = true" cho cả `pause` lẫn hẹn 3 phút, sau sửa "false". Probe là file tạm, không nằm trong nhánh. Bản dev của React giữ closure qua `_debugStack` nên bộ test thường không đo được; test trong nhánh chỉ khoá cơ chế (nhả gây ít nhất hai lần render).
- Vòng đời Ionic trong jsdom: `useIonViewWillEnter`/`DidEnter` bắn lúc mount, nhưng đẩy trang khác lên thì không bắn `leave`; `willLeave`/`didLeave` chỉ bắn muộn khi back. Test trang mock các hook này; việc Ionic bắn thật phải kiểm trên máy.
- Công cụ ghi file của phiên cloud giải mã escape `\u2014` thành em dash thật (đã gặp trong plan, đã sửa lại).

## Kiểm chứng đã chạy

- `npm test`: 66 file, 501 test, tất cả pass (31 test mới: `indexHold` 13, `store` 1, `useSearchIndex` 12, `SearchPage` 5).
- `npx tsc -b`: sạch. `npm run lint`: 0 lỗi, 10 cảnh báo (đúng số cũ).
- Đột biến tạm, đã trả code về: bỏ kiểm số thứ tự sau `loadIndex` (2 test đỏ); bỏ xếp hàng lượt nạp (1 test đỏ); bỏ hook `leave` (3 test đỏ); luôn hiện `result` cũ (1 test đỏ); bỏ nghe `onIndexCleared` (1 test đỏ).
- Review độc lập cả nhánh (một subagent): kết luận "With fixes": 1 Critical đã sửa ở `564f527`, 1 Minor nâng lên và đã sửa, 2 Minor để lại (xem "Còn mở").

## Cần kiểm trên máy (local)

- [ ] Build release (sao lưu APK nghiệm thu trước), cài UBS1 và dGen1 (dGen1 mở bằng `monkey`, không force-stop), e2e 8/8 (bốn test ở `tests/search.e2e.ts` đi qua màn Tìm).
- [ ] Ionic bắn thật: mở màn Tìm, chạm kết quả sang Viewer, đọc quá 3 phút KHÔNG điều hướng gì, back: thấy danh sách cũ kèm "đang cập nhật chỉ mục…" rồi về số đoạn. Back trước 3 phút: không có dòng đó. Chuyển tab Trang chủ quá 3 phút rồi về tab Tìm: như trên.
- [ ] Đo PSS (tiến trình chính cộng renderer `…:sandboxed_process0` đúng UID, `dumpsys meminfo`), trước (1.43.0) và sau, UBS1 và dGen1: ở Trang chủ; khi màn Tìm có chỉ mục; đứng ở Viewer quá 3 phút không điều hướng; app ở nền (sau `pause`). Ghi cách ép thu hồi (`adb shell am send-trim-memory com.gulibrary.app RUNNING_CRITICAL` hay chờ). Cắt số theo từng lượt.
- [ ] `pause` kịp nhả trước khi WebView bị đóng băng: đưa app vào nền khi đang ở màn Tìm, đo PSS, rồi mở lại: danh sách cũ vẫn hiện, nạp lại xong tra được.
- [ ] Thời gian quay lại màn Tìm sau khi đã nhả tới lúc tra được (so với 0,49 s của spike 05/09; chỉ mục nay to hơn).
- [ ] Bấm "Dựng lại chỉ mục" ở Cài đặt (cả khi vừa ở màn Tìm chưa tới 3 phút) rồi vào màn Tìm: dựng lại có tiến độ bắt đầu từ 0, không hiện chỉ mục cũ. Bấm lần hai trong cùng phiên: thanh không nhảy "178/178" rồi tụt.
- [ ] `resume` khi đang ở màn Tìm: Trang chủ và màn Tìm cùng đi kho một lượt; xem thời gian và có giật không.

## Còn mở, cần huynh quyết

- [ ] Câu hiện trên màn Tìm khi không ra kết quả đang có em dash giữa "gõ không dấu cũng được" và "“to tung” ra “Tố tụng”". Đề xuất đổi em dash thành dấu hai chấm: "Thử bớt chữ, hoặc gõ không dấu cũng được: “to tung” ra “Tố tụng”." Huynh duyệt thì sửa ở local cùng lúc phát hành (một dòng trong `src/pages/SearchPage.tsx`).
- [ ] Hai Minor của review, chưa sửa: (1) test trang "quay lại trong 3 phút" trả về đồng hồ thật trước khi `enter`, nên không thấy được lỗi "`enter` không huỷ hẹn" (test đơn vị `indexHold` đã bắt lỗi này); (2) chưa có test trang khoá việc giữ danh sách cũ trong 130 ms chờ gõ khi đang giữ chỉ mục.
- [ ] Ghi chú phát hành cho Pé (1.43.1): Pé không thấy tính năng mới; nếu muốn ghi thì là "app nhẹ hơn khi để ở nền, ít bị đóng lại hơn", chỉ nên ghi sau khi đo trên máy thấy PSS giảm thật.
