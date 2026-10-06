# Đo 06/10/2026 — màn Tìm toàn kho lệch theo thứ tự kho

**Câu hỏi:** trần `CANDIDATE_CAP` (600) / `SCAN_CAP` (2500) trong `search()` cắt ứng viên theo
THỨ TỰ KHO trước khi xếp hạng — ghi ở v1.40.1 là "chờ khi gặp". Có thật làm hụt kết quả không, và
hụt tới đâu?

**Kết luận:** CÓ, nặng. 17/30 câu tra thử chạm trần, 12 câu lệch nặng (≤16/50 dòng trùng với kết
quả khi không có trần). Từ phổ biến chỉ ra môn đứng đầu A→Z. → mở v1.41.0 (gom theo tài liệu),
spec `Docs/superpowers/specs/2026-10-06-v1.41.0-search-group-by-doc-design.md`.

## Cách đo

- Kho QA trên **UBS1** (`/sdcard/Download/kho`), app **v1.40.1**. Kéo về Mac CHỈ file `.json`
  (183 sidecar + `_mon.json`), danh sách PDF lấy bằng `find` để ghép cặp như `classify`. Không ghi
  gì lên máy.
- Harness vitest TẠM (đã gỡ, không commit) gọi đúng `indexDoc` + `mergeShards` + `search` của app,
  dựng kho theo đúng thứ tự `refreshIndex`: môn sort `sortMons` (không môn nào có `order` → A→Z
  `localeCompare 'vi'`, "Chưa phân loại" cuối), trong mỗi thư mục tài liệu trước (A→Z) rồi thư mục
  con (A→Z). Đối chứng = bản sao `invertedIndex.ts` với hai trần = `Infinity`.
- **Khớp máy thật:** gõ "hop dong" trên UBS1 → 5 dòng đầu đúng y harness (HT Hình sự & TTHS tr.420
  → HT Xu hướng TPH tr.120 → tr.415 → HT Phòng ngừa bạo lực trẻ em tr.203 → HT Chứng cứ tr.154).
- 30 câu tra: các câu Gú từng dùng (dat dai, dac xa, an treo, la cong dan, nguyen tac phap che,
  35, 35%) + từ luật phổ biến. Không có lịch sử tra thật của Gú (app không lưu).

## Kho

180 tài liệu · **165.115 đoạn** · 1 tài liệu ảnh. Thứ tự môn: Hình sự chung → Kimh doanh → Logic →
Luật Công Chứng → Luật Đất Đai → Luật hành chính → Luật Lao Động → PLCTKD → Sở hữu trí tuệ → Tố tụng
Hình sự → Chưa phân loại.

**"Hình sự chung" đứng đầu và chiếm 104.213 đoạn = 63% cả kho**, phần lớn từ bộ tài liệu tham khảo
"HT …" (6 tập lớn nhất ≈ 70,5 nghìn đoạn). OCR (v0.20.1) góp 10.667 đoạn vào môn này — có góp nhưng
KHÔNG phải nguyên nhân chính (đệ từng nói ngược, đã sửa).

## Kết quả — trần cắt theo thứ tự kho

| Câu tra | Đoạn khớp thật | Tài liệu có khớp | Tài liệu quét tới | 50 dòng đang hiện |
|---|---|---|---|---|
| hop dong | 1.489 | 76 | 15 | 50/50 Hình sự chung; môn Luật hành chính 324 đoạn (riêng BLDS 2015: 287), Kinh doanh 241 (cả file "Hop_dong_Chuong_1_2_4") không có dòng nào |
| dieu tra | 2.930 | 65 | 10 | 50/50 Hình sự chung; BLTTHS (887 đoạn) không tới |
| doanh nghiep | 2.931 | 85 | 29 | slide PLCTKD + Luật DN 2020 trong môn PLCTKD không tới |
| vi pham hanh chinh | 1.328 | 71 | 42 | Luật XLVPHC không hiện |
| trach nhiem hinh su | 2.645 | 69 | 12 | 50/50 Hình sự chung; Tố tụng HS 129 đoạn không tới |
| nha nuoc | 4.924 | 130 | 13 | 50/50 Hình sự chung |
| quy dinh | 21.549 | 151 | 2 | 1/50 trùng kết quả không trần |

Không lệch (dưới trần → đủ): dat dai 529, dac xa 93, an treo 479, la cong dan 68, cong chung 480,
quyen su dung dat 476, nguoi lao dong 345, thua ke 341, 35% 28.

`SCAN_CAP` cũng cắn: "hop dong" chỉ gom được **117** ứng viên (không chạm 600) vì 2.500 đoạn có đủ
"hop" + "dong*" nhưng phần lớn KHÔNG liền nhau ("phù hợp … cộng đồng").

**Bỏ trần thô thì chưa đủ:** (1) chậm — "quy dinh" 20 ms → 573 ms trên Mac; (2) xếp theo
(vị trí khớp, độ dài đoạn) để MỘT tài liệu chiếm cả danh sách — "hop dong" không trần thì 8 dòng đầu
cùng một file.

## Kết quả — giá kiểm cụm liền nhau (Mac, Intel, 17 câu)

| Cách kiểm | Câu nặng nhất | Ghi chú |
|---|---|---|
| `phraseAt` (tách từ từng đoạn — hiện tại) | 519 ms ("quy dinh", 21.931 ứng viên) | |
| regex trên `fold(text)` | 302 ms | |
| **`n.includes(" a b")` trên chuỗi token đã bỏ dấu lưu sẵn** | **10 ms** ("toi pham", 19.201 ứng viên) | ra ĐÚNG Y `phraseAt` ở cả 17 câu |

Chuỗi `n` cả kho = **21,76 triệu ký tự** (≈ +22 MB nếu lưu trong chỉ mục). Dựng `n` lúc NẠP cả kho
mất 1,7 s trên Mac → phải sinh lúc dựng chỉ mục (đã tách từ sẵn ở đó), không sinh lúc nạp.

## Kết quả — ba cách xếp tài liệu

Số trong ngoặc = [đoạn khớp / tổng đoạn của tài liệu].

| Câu tra | Đếm thô | Mật độ (BM25 k1=1,2 b=0,75) | Mật độ + ưu tiên tên |
|---|---|---|---|
| hop dong | BLDS 2015 (91/2015/QH13) [287/2176] | Hop_dong_Chuong_1_2_4 [200/751] | Hop_dong…, rồi Trach_nhiem_BTTH_ngoai_hop_dong |
| dieu tra | BLTTHS [441/1911] | BLTTHS | HT Xu hướng TPH và Điều tra, rồi BLTTHS |
| toi pham | HT Hình sự & TTHS [1477/21779] | HT Xu hướng TPH [529/1000], Giáo trình HSPC | slide "III. Tội phạm" [24/27] |
| trach nhiem hinh su | HT Miễn giảm TNHS [708/8533] | NQ hướng dẫn Đ51–52 [41/74], Giáo trình HSPC | = mật độ |
| vi pham hanh chinh | Luật XLVPHC [291/585] | Luật XLVPHC | = mật độ |
| dat dai | Luật Đất đai 2024 (3 phần) | Luật Đất đai 2024 (3 phần) | Bài giảng Luật Đất đai 2024 [5/13] lên đầu |

Đếm thô luôn đẩy tập tham khảo dày lên đầu. Ưu tiên tên thắng ở "toi pham" nhưng kéo thứ lạc đề lên
ở "dieu tra"/"hop dong". **Huynh chốt: theo mật độ.**

## Giới hạn

- Kho QA, KHÔNG phải kho Prod của Gú (136 tài liệu). Cơ chế nằm trong code nên chắc chắn có ở Prod;
  mức độ tùy môn đứng đầu A→Z lớn cỡ nào. Chưa đo máy Gú.
- Thời gian đo trên Mac (Node/vitest), KHÔNG phải trên T616 — ngưỡng trên máy đo lại khi làm v1.41.0.
- Kho QA có vài tài liệu trùng ở hai môn (vd "11. HT Hình sự và TTHS" ở cả Hình sự chung lẫn Luật
  Lao Động) — dữ liệu test, không ảnh hưởng kết luận.

## Kết quả v1.41.0 (cùng ngày)

**Harness trên cùng sidecar (Mac), code v1.41.0:** tài liệu đầu đúng cột "Mật độ" ở mọi câu kiểm
("hop dong" → Hop_dong_Chuong_1_2_4 · "dieu tra" → BLTTHS VBHN 104 · "vi pham hanh chinh" → Luật
XLVPHC · "trach nhiem hinh su" → NQ hướng dẫn Đ51–52). Bất biến "số trên thẻ = số dòng sheet, đoạn
thẻ = dòng đầu sheet": 0 lệch, trừ câu 1 chữ cái (trần 400 tiền tố).

| Câu | trước tối ưu gom (Mac) | v1.41.0 (Mac) | v1.41.0 (UBS1) |
|---|---|---|---|
| hop dong | 19,7 ms | 11 ms | 16 ms |
| toi pham | 28,6 ms | 17 ms | 27–29 ms |
| quy dinh | 47,4 ms | 16 ms | — (gõ không được) |
| th (gõ dở) | 414 ms | 49 ms | 132–144 ms |
| d (gõ dở) | 251 ms | 29 ms | 77 ms |

"Trước tối ưu gom" = bản đầu của v1.41.0 (sắp xếp toàn bộ kết quả). Bản phát hành gom một lượt,
không sắp toàn bộ.

**UBS1, so 1.40.1 cùng máy:** dựng lại chỉ mục 21,6 / 22,6 s (trước 18,8) · bộ nhớ màn Tìm
"toi pham" 263 → 304 MB đã lắng (+41; đỉnh tạm 410 MB ~20 s sau khi nạp) · cuộn thẻ 1.221 khung,
giật 0,41 %, p95 11 ms.
