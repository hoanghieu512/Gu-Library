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
- Commit kế tiếp: câu gợi ý khi không ra kết quả bỏ em dash (huynh duyệt), có test khoá câu chữ.

## Quyết định

- Lúc nhả: rời màn Tìm quá 3 phút, hoặc app vào nền thì nhả ngay. Bỏ "nhả ngay khi rời" (đường "kết quả, đọc, back" lần nào cũng chờ), "chỉ hẹn giờ" (timer của WebView ở nền có thể bị hãm), "chỉ khi vào nền" (đọc cả tiếng trong app vẫn ôm chỉ mục).
- Mở kết quả sang Viewer cũng tính là rời: một luật cho mọi kiểu rời; đọc lâu ở Viewer chính là lúc nên trả RAM.
- Quay lại sau khi đã nhả: giữ danh sách kết quả cũ (chạm được, giữ chỗ cuộn), dòng trạng thái dùng lại câu sẵn có "đang cập nhật chỉ mục…". Gõ câu khác trong lúc nạp thì ẩn danh sách cũ. Không thêm chữ mới trên màn.
- Giữ `result` (mỗi tài liệu khớp một đoạn), bảng tên hiển thị và dấu vân tay khi nhả; bỏ bảng token và danh sách đơn vị.
- Vá lỗ hổng có từ trước: "Dựng lại chỉ mục" ở Cài đặt nay luôn làm màn Tìm bỏ chỉ mục đang giữ; vào màn Tìm thì dựng lại có tiến độ.
- Câu gợi ý khi không ra kết quả: huynh duyệt 21/10 đổi em dash thành dấu hai chấm, nay là "Thử bớt chữ, hoặc gõ không dấu cũng được: “to tung” ra “Tố tụng”." Đây là chữ duy nhất trên màn đổi ở nhánh này.

## Bẫy đã gặp

- React giữ state cũ trên fiber alternate tới lần render kế. `setIx(null)` một lần không giải phóng chỉ mục nếu trang không render lại, mà trang Tìm nằm sau Viewer hay app ở nền thì không render. Reviewer bắt được; đệ kiểm lại bằng probe `WeakRef` + `gc()` dưới React production (`NODE_ENV=production npx vitest run <file> --execArgv=--expose-gc`): trước sửa "còn giữ sau khi nhả = true" cho cả `pause` lẫn hẹn 3 phút, sau sửa "false". Probe là file tạm, không nằm trong nhánh. Bản dev của React giữ closure qua `_debugStack` nên bộ test thường không đo được; test trong nhánh chỉ khoá cơ chế (nhả gây ít nhất hai lần render).
- Vòng đời Ionic trong jsdom: `useIonViewWillEnter`/`DidEnter` bắn lúc mount, nhưng đẩy trang khác lên thì không bắn `leave`; `willLeave`/`didLeave` chỉ bắn muộn khi back. Test trang mock các hook này; việc Ionic bắn thật phải kiểm trên máy.
- Công cụ ghi file của phiên cloud giải mã escape `\u2014` thành em dash thật (đã gặp trong plan, đã sửa lại).

## Kiểm chứng đã chạy

- `npm test`: 66 file, 502 test, tất cả pass (32 test mới: `indexHold` 13, `store` 1, `useSearchIndex` 12, `SearchPage` 6).
- `npx tsc -b`: sạch. `npm run lint`: 0 lỗi, 10 cảnh báo (đúng số cũ).
- Đột biến tạm, đã trả code về: bỏ kiểm số thứ tự sau `loadIndex` (2 test đỏ); bỏ xếp hàng lượt nạp (1 test đỏ); bỏ hook `leave` (3 test đỏ); luôn hiện `result` cũ (1 test đỏ); bỏ nghe `onIndexCleared` (1 test đỏ).
- Review độc lập cả nhánh (một subagent): kết luận "With fixes": 1 Critical đã sửa ở `564f527`, 1 Minor nâng lên và đã sửa, 2 Minor để lại (xem "Còn mở").

## Cần kiểm trên máy (local)

Phiên local 21-22/10 trên UBS1 và dGen1, kết quả chi tiết ở mục "Kết quả kiểm trên máy" ngay dưới.

- [x] Build release (sao lưu APK nghiệm thu trước), cài UBS1 và dGen1 (dGen1 mở bằng `monkey`, không force-stop), e2e 8/8 (bốn test ở `tests/search.e2e.ts` đi qua màn Tìm). Đạt: e2e 8/8 · 3 ph 17 s trên UBS1 với APK nhánh; thêm 2/2 test Mục lục Điều của `main` (`e2e/tests/toc.e2e.ts`, chép tạm vào rồi xoá) · 54 s · 0 token model, tức 10/10 như quy trình hiện nay.
- [x] Ionic bắn thật: mở màn Tìm, chạm kết quả sang Viewer, đọc quá 3 phút KHÔNG điều hướng gì, back: thấy danh sách cũ kèm "đang cập nhật chỉ mục…" rồi về số đoạn. Back trước 3 phút: không có dòng đó. Chuyển tab Trang chủ quá 3 phút rồi về tab Tìm: như trên. Đạt trên cả hai máy (quay màn).
- [x] Đo PSS (tiến trình chính cộng renderer `…:sandboxed_process0` đúng UID, `dumpsys meminfo`), trước (1.43.0) và sau, UBS1 và dGen1: ở Trang chủ; khi màn Tìm có chỉ mục; đứng ở Viewer quá 3 phút không điều hướng; app ở nền (sau `pause`). Ghi cách ép thu hồi (`adb shell am send-trim-memory com.gulibrary.app RUNNING_CRITICAL` hay chờ). Cắt số theo từng lượt. Ở nền: giảm khoảng 90 đến 120 MB; ở tiền cảnh: chỉ giảm khi có áp lực bộ nhớ (xem bảng).
- [x] `pause` kịp nhả trước khi WebView bị đóng băng: đưa app vào nền khi đang ở màn Tìm, đo PSS, rồi mở lại: danh sách cũ vẫn hiện, nạp lại xong tra được. Đạt: mở lại luôn thấy "đang cập nhật chỉ mục…" (đã nhả); bộ nhớ được V8 thu trong 10 s đến 2 phút tuỳ lượt.
- [x] Thời gian quay lại màn Tìm sau khi đã nhả tới lúc tra được (so với 0,49 s của spike 05/09; chỉ mục nay to hơn). Không tách được riêng mốc gắn chỉ mục trên bản release; cận trên khoảng 3,7 s (UBS1), dòng "đang cập nhật" tắt sau 3,3 s (UBS1) và 4,4 s (dGen1). Trong lúc nạp WebView bận khoảng 1 s.
- [x] Bấm "Dựng lại chỉ mục" ở Cài đặt (cả khi vừa ở màn Tìm chưa tới 3 phút) rồi vào màn Tìm: dựng lại có tiến độ bắt đầu từ 0, không hiện chỉ mục cũ. Bấm lần hai trong cùng phiên: thanh không nhảy "178/178" rồi tụt. Đạt trên cả hai máy.
- [x] `resume` khi đang ở màn Tìm: Trang chủ và màn Tìm cùng đi kho một lượt; xem thời gian và có giật không. Tỉ lệ khung giật thấp hơn bản cũ, nhưng khung chậm nhất (p99) dài hơn trên UBS1.
- [x] Gõ một câu không có trong kho: câu gợi ý hiện dấu hai chấm ("…cũng được: “to tung” ra “Tố tụng”."), không còn em dash. Đạt trên cả hai máy.

## Kết quả kiểm trên máy (local 21-22/10)

### Cách làm

- APK nghiệm thu 1.43.0 `d8b7b7d` (đúng bản Gú đang dùng) sao lưu vào `releases/` trước khi build. APK của nhánh build từ `4d85676`, sha1 `4509809`, version vẫn 1.43.0 (chưa bump). `npm test` 502/502, `npx tsc -b` sạch, `npm run lint` 0 lỗi 10 cảnh báo, chạy lại trên Mac trước khi build.
- UBS1 mở lạnh bằng `am force-stop` rồi `monkey`. dGen1 khởi động lại máy trước lượt "trước" để có tiến trình sạch, mở bằng `monkey`, không force-stop lần nào; cài đè APK nhánh lúc app ở nền vẫn mở lại bình thường.
- PSS = `TOTAL PSS` của `dumpsys meminfo` cho tiến trình chính cộng renderer có UID `u0a<appid>i<n>` (lấy từ `dumpsys activity processes`). Mỗi lượt cùng một kịch bản: Trang chủ, màn Tìm gõ "dat" (4.821 đoạn, 120 tài liệu), chạm kết quả đầu sang Viewer rồi đứng yên 3 phút 30 giây, phím Home.
- Ép thu hồi: `am send-trim-memory` chỉ nhận mỗi mức một lần cho một tiến trình (gửi lại cùng mức hay mức thấp hơn thì báo "Unable to set a higher trim level than current level"). Vì vậy mỗi mốc đo ngay và sau 60 s chờ; ép `RUNNING_CRITICAL` ở Viewer lúc 3 phút 30 giây và `COMPLETE` ở nền.
- Thời gian đọc từ `screenrecord` (ảnh ghép mỗi 0,2 s); trạng thái màn đọc bằng `uiautomator dump` (mỗi lần mất khoảng 2 s).

### PSS (MB, tiến trình chính cộng renderer; trong ngoặc là renderer)

| Ca | UBS1 1.43.0 | UBS1 nhánh | dGen1 1.43.0 | dGen1 nhánh |
|---|---|---|---|---|
| Trang chủ, sau 60 s | 157,0 (66) | 157,7 (67) | 244,7 (88) | 243,2 (89) |
| Màn Tìm có chỉ mục, sau 60 s | 271,1 (175) | 271,0 (175) | 372,0 (215) | 371,9 (216) |
| Viewer 3 phút 30 giây, chưa ép | 315,8 (210) | 316,6 (212) | 421,1 (243) | 420,0 (243) |
| Viewer 3 phút 30 giây, ép `RUNNING_CRITICAL` + 10 s | 299,0 (196) | 209,7 (108) | 407,7 (231) | 359,8 (184) |
| Ở nền sau Viewer, 60 s | 296,2 (194) | 208,1 (109) | 362,3 (209) | 268,7 (113) |
| Ở nền sau Viewer, ép `COMPLETE` + 10 s | 288,4 (194) | 184,7 (94) | 357,8 (209) | 265,2 (113) |
| Ở nền từ màn Tìm (vòng sau trong phiên), 10 s | 304,9 (194) | 184,2 (87) | 373,7 (216) | 280,5 (116) |
| Ở nền từ màn Tìm (vòng sau trong phiên), 60 s | 286,6 (188) | 175,5 (81) | 351,5 (206) | 258,0 (110) |

Ca thường gặp nhất (mở app, vào Tìm lần đầu, gõ, rồi chuyển sang app khác), đo trên UBS1 với tiến trình mới, chờ lâu ở nền:

| Ở nền | UBS1 1.43.0 | UBS1 nhánh |
|---|---|---|
| 10 s | 274,6 (181) | 276,8 (182) |
| 1 phút | 267,0 (176) | 272,4 (177) |
| 2 phút | 259,6 (171), renderer swap 124 | 165,4 (74), renderer swap 27 |
| 4 phút | 259,5 (171), renderer swap 122 | 165,8 (74), renderer swap 23 |

dGen1 nhánh, ở nền từ màn Tìm (vòng sau trong phiên), lượt thứ hai: 10 s 379,9; 1 phút 282,3; 2 phút 271,0; 4 phút 271,1.

Đọc số:

- Chỉ mục được nhả đúng lúc (mở lại luôn thấy nạp lại), nhưng V8 chỉ trả bộ nhớ khi tự thu gom. Ở nền thì việc đó xảy ra trong 10 s đến 2 phút, nên app ở nền nhẹ hơn khoảng 90 đến 120 MB so với 1.43.0 (bản cũ không bao giờ trả, còn bị đẩy hơn 100 MB sang zram).
- Ở tiền cảnh mà không có áp lực bộ nhớ thì chưa giảm: Viewer 3 phút 30 giây (chưa ép) ngang bản cũ, Trang chủ 3 phút 20 giây sau khi rời Tìm là 297,1 MB (UBS1) và 335,8 MB (dGen1). Có áp lực (`RUNNING_CRITICAL`) thì giảm ngay (UBS1 -89 MB, dGen1 -48 MB).
- Trên tiến trình mới, lần thử `COMPLETE` 10 s sau khi vào nền chưa làm V8 thu (renderer 177 rồi 173 MB), dù mở lại vẫn thấy nạp lại (đã nhả).

### Quay lại màn Tìm, nạp lại, giật

- Back từ Viewer sau khi đã nhả: màn Tìm hiện ngay với danh sách cũ và "đang cập nhật chỉ mục…"; dòng đó tắt sau khoảng 3,3 s (UBS1) và 4,4 s (dGen1) kể từ phím back, rồi về "4.821 đoạn · 120 tài liệu". Back trong 3 phút: số đoạn hiện ngay, không có dòng đó, gõ được ngay (cả hai máy). Chuyển tab Trang chủ 3 phút 20 giây rồi về tab Tìm: danh sách cũ và "đang cập nhật chỉ mục…" (bản quay bị cắt sau 2,4 s ở UBS1 và 2,8 s ở dGen1); về trong 20 s thì không có dòng đó.
- Trong lúc nạp lại WebView bận khoảng 1 s: chạm ô tìm 0,3 s sau phím back thì bàn phím hiện sau khoảng 1,2 s (UBS1), so với 0,2 s khi chỉ mục còn giữ. Phím do `adb shell input` bắn ngay sau đó bị mất trên cả hai máy (người gõ chờ bàn phím nên ít gặp, nhưng là dấu hiệu bận). Gõ câu mới sau khi bàn phím lên: kết quả ra 0,2 đến 0,4 s sau khi gõ, tức chỉ mục đã gắn lại trong vòng khoảng 3,7 s kể từ phím back. Bản release không có console nên không tách được riêng mốc gắn chỉ mục để so với 0,49 s của spike 05/09.
- Mở lại app khi đang ở màn Tìm (`gfxinfo` 12 s sau `resume`): UBS1 1.43.0 32 khung, giật 6,25%, p90 22 ms, p99 57 ms; nhánh 151 khung (vòng xoay "đang cập nhật" chạy), giật 3,31%, p90 14 ms, p99 77 ms. dGen1 1.43.0 21 khung, giật 14,29%, p90 31 ms, p99 42 ms; nhánh 146 khung, giật 4,11%, p90 20 ms, p99 48 ms. Trên UBS1 "đang cập nhật" thấy ở 2,2 s và "đã đọc 180 tài liệu" ở 6,6 s (độ phân giải dump).

### Còn lại

- "Dựng lại chỉ mục" hai lần liên tiếp (vừa ở màn Tìm chưa tới 3 phút): dGen1 thấy "0 / … tài liệu" rồi 17, 23, 120, 178 / 180, không có thẻ cũ, lần hai cũng từ 0; UBS1 dump đầu ở 4,3 s đã là 17 / 180 cả hai lần, không có thẻ cũ. Dựng xong khoảng 20 s (UBS1) và 28 s (dGen1).
- Câu gợi ý khi gõ "zzqxw": "Thử bớt chữ, hoặc gõ không dấu cũng được: “to tung” ra “Tố tụng”." trên cả hai máy.
- Ngoài phạm vi, thấy khi kiểm: toast ở Cài đặt sau "Dựng lại chỉ mục" còn em dash giữa "Đã xoá chỉ mục" và "mở màn Tìm để dựng lại" (`SettingsPage.tsx`, chữ trên màn, có từ trước).
- Cài lại APK cũ đè lên UBS1 thì Play Protect hỏi gửi app đi kiểm tra; đã chọn "Don't send". Pin UBS1 đứng ở 3% (đang sạc USB) suốt phiên.

## Còn mở, cần huynh quyết

- [ ] Hai Minor của review, chưa sửa: (1) test trang "quay lại trong 3 phút" trả về đồng hồ thật trước khi `enter`, nên không thấy được lỗi "`enter` không huỷ hẹn" (test đơn vị `indexHold` đã bắt lỗi này); (2) chưa có test trang khoá việc giữ danh sách cũ trong 130 ms chờ gõ khi đang giữ chỉ mục.
- [ ] Ghi chú phát hành cho Pé (1.43.1): Pé không thấy tính năng mới; nếu muốn ghi thì là "app nhẹ hơn khi để ở nền, ít bị đóng lại hơn", chỉ nên ghi sau khi đo trên máy thấy PSS giảm thật. CHANGELOG nhớ ghi việc đổi câu gợi ý khi không ra kết quả.
