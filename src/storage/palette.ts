// Bảng màu môn cho picker (CreateFolderModal + ColorPickerSheet). THAY TRỌN bộ 6 màu cũ
// (nâu/be na ná nhau) bằng 8 màu "sách luật" đa dạng hue hơn — mỗi môn một sắc dễ phân biệt
// nhưng vẫn trầm, độ bão hòa thấp, hợp tông thư viện cổ điển.
// LƯU Ý: gáy sách phủ overlay vân + sheen (tối mép ~50%) → màu LÊN GÁY trầm hơn hex ở đây;
// avatar (MonSwatch) là ô màu THUẦN nên đúng hex. Đổi bảng này KHÔNG đụng môn Gú đã gán màu
// (meta.color explicit thắng) — chỉ áp cho lần chọn màu mới.
export const MON_PALETTE = [
  '#5C1F28', // đỏ rượu
  '#2F4A33', // xanh rêu
  '#2E4864', // navy
  '#6A3A2A', // nâu đỏ
  '#353335', // xám than
  '#5E365A', // tím
  '#34585A', // teal
  '#4D2E1E', // nâu đậm
];
