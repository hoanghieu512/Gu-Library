import { Saf } from '../plugins/saf';
import { getRootUri } from './repo';
import { getKhoSnapshot, foldCounts } from './khoSnapshot';
import { emitKhoChanged } from '../lib/khoEvents';
import { validateFolderName, dupFolderError, isCaseOnlyChange } from './folderName';
import { parseInboxPath } from '../import/prefix';
import { relPathFromUris } from '../reading/paths';
import { renameReadingFolder, removeReadingFolder } from '../reading/store';

export type RenameResult = { ok: true; uri: string } | { ok: false; error: string };
export type DeleteResult = { ok: true } | { ok: false; error: string };

// Đếm file chờ trong `_inbox/` nằm DƯỚI/BẰNG một thư mục (theo đoạn tên). Chặn đổi tên nếu >0:
// tiền tố file chờ trỏ TÊN CŨ, worker mkdir-if-missing sẽ dựng lại thư mục tên cũ → thư mục ma.
// App KHÔNG đụng `_inbox/` — chỉ ĐỌC entry từ snapshot để đếm, không migrate tiền tố (né race worker).
function pendingUnder(snap: Awaited<ReturnType<typeof getKhoSnapshot>>, folderSegs: string[]): number {
  let n = 0;
  for (const e of snap.inboxEntries) {
    if (e.isDirectory) continue;
    const p = parseInboxPath(e.name);
    if (p && p.length >= folderSegs.length && folderSegs.every((s, i) => p[i] === s)) n += 1;
  }
  return n;
}

// Đổi tên THẬT một thư mục (môn hoặc thư mục con) — rename tại chỗ trên đĩa (tên khớp mini PC/Drive).
// `siblingNames` = tên các thư mục anh-em (chặn trùng, KHÔNG tự đẻ (1)). Trả uri MỚI hoặc lỗi (hiện trong sheet).
// Companion `.print.json`/`.display.json` của tài liệu bên trong theo thư mục tự động (rename dir tại chỗ);
// chỉ entry đọc-dở (`_reading-*.json` lưu path theo tên) của MÁY NÀY cần dời — làm sau khi rename.
export async function renameFolder(folderUri: string, siblingNames: string[], rawNewName: string, noun: string): Promise<RenameResult> {
  const root = await getRootUri();
  if (!root) return { ok: false, error: 'Chưa chọn folder kho' };
  const oldRel = relPathFromUris(root, folderUri);
  if (!oldRel) return { ok: false, error: 'Không xác định được thư mục' };
  const oldSegs = oldRel.split('/');
  const curName = oldSegs[oldSegs.length - 1];

  const v = validateFolderName(rawNewName);
  if (!v.ok) return { ok: false, error: v.error };
  if (v.value === curName) return { ok: true, uri: folderUri }; // không đổi gì → coi như xong
  // Trùng KHÔNG PHÂN BIỆT HOA/THƯỜNG: đĩa Samsung case-insensitive, "Slide" và "slide" đụng nhau →
  // provider tự đẻ "slide (1)". Chặn ở đây theo case-insensitive để KHÔNG bao giờ ra "(1)".
  const lower = v.value.toLowerCase();
  if (siblingNames.some((s) => s.toLowerCase() === lower)) {
    return { ok: false, error: dupFolderError(noun) };
  }

  // Chặn khi còn file chờ dưới cây (kể cả thư mục con) — worker sẽ dựng lại tên cũ thành thư mục ma.
  const snap = await getKhoSnapshot();
  const pending = pendingUnder(snap, oldSegs);
  if (pending > 0) {
    return { ok: false, error: `Đang có ${pending} file chờ xử lý ở đây. Chờ xíu rồi thử lại nha dợ iu!` };
  }

  // Đổi tên CHỈ khác hoa/thường của chính nó ("Slide"→"slide") → đĩa Samsung case-insensitive coi
  // tên đích là chính thư mục đang đổi → renameDocument tự đẻ "(1)". Né bằng 2 BƯỚC: đổi qua tên tạm
  // duy nhất trước (không đụng ai) rồi mới đổi sang tên đích (giờ FS thấy tên đích trống). Tên tạm
  // hợp lệ (không đầu '_', không ký tự cấm) + timestamp nên không thể trùng.
  let newUri: string;
  if (isCaseOnlyChange(curName, v.value)) {
    const tmpName = `${v.value}-gu-case-${Date.now()}`;
    const { uri: tmpUri } = await Saf.renameDir({ uri: folderUri, newName: tmpName });
    ({ uri: newUri } = await Saf.renameDir({ uri: tmpUri, newName: v.value }));
  } else {
    ({ uri: newUri } = await Saf.renameDir({ uri: folderUri, newName: v.value }));
  }
  const newRel = [...oldSegs.slice(0, -1), v.value].join('/');
  await renameReadingFolder(oldRel, newRel);
  emitKhoChanged();
  return { ok: true, uri: newUri };
}

// Chuẩn bị hộp xác nhận Xóa: đếm ĐỆ QUY (docs+folders) + đếm file chờ dưới cây (chặn). Một lần snapshot.
export async function prepareDelete(folderUri: string): Promise<{ pending: number; docs: number; folders: number }> {
  const root = await getRootUri();
  const rel = root ? relPathFromUris(root, folderUri) : null;
  const snap = await getKhoSnapshot();
  const f = snap.byUri.get(folderUri);
  const counts = f ? foldCounts(f) : { docs: 0, folders: 0 };
  const pending = rel ? pendingUnder(snap, rel.split('/')) : 0;
  return { pending, ...counts };
}

// Xóa THẬT trọn cây thư mục (môn/thư mục con) — deleteDocument trên dir xóa đệ quy CẢ file bên trong
// (gồm companion .print.json/.display.json → cờ in + tên hiển thị dọn theo; _print/ do worker tự lành).
// Reading của MÁY NÀY dưới cây → tombstone (cưỡi lên removeEntry v1.5.0); máy khác lọc im lặng.
// CHẶN khi còn file chờ _inbox/ dưới cây (worker mkdir-if-missing dựng lại thư mục ma). Không thùng
// rác app — lưới an toàn là .stversions Syncthing ~30 ngày (v1.5.0).
export async function deleteFolder(folderUri: string, noun: string): Promise<DeleteResult> {
  const root = await getRootUri();
  if (!root) return { ok: false, error: 'Chưa chọn folder kho' };
  const rel = relPathFromUris(root, folderUri);
  if (!rel) return { ok: false, error: 'Không xác định được thư mục' };
  const segs = rel.split('/');

  const snap = await getKhoSnapshot();
  const pending = pendingUnder(snap, segs);
  if (pending > 0) {
    const what = noun === 'môn' ? 'môn' : 'thư mục';
    return { ok: false, error: `Đang có ${pending} file chờ xử lý trong ${what} này. Chờ xíu rồi thử lại nha dợ iu!` };
  }

  await Saf.deleteFile({ uri: folderUri }); // deleteDocument trên dir = xóa đệ quy cả cây trên đĩa
  await removeReadingFolder(rel);
  emitKhoChanged();
  return { ok: true };
}
