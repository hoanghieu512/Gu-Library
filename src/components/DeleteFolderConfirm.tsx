import { useEffect, useRef, useState } from 'react';
import ConfirmDialog from './ConfirmDialog';
import { prepareDelete, deleteFolder } from '../storage/folderRepo';
import { deleteFolderMessage } from '../storage/folderName';

export interface DeleteTarget { uri: string; name: string; noun: string; } // noun = "môn" | "thư mục"

// Luồng Xóa môn/thư mục dùng chung Home + màn duyệt (v1.23.0). Khi có target: đếm đệ quy + kiểm file
// chờ; nếu còn chờ → hộp CHẶN thân thiện (1 nút); nếu không → hộp xác nhận NÊU SỐ LƯỢNG (Hủy/Xóa),
// bấm Xóa → deleteFolder (xóa đệ quy + dọn reading; .stversions Syncthing là lưới lùi ~30 ngày).
export default function DeleteFolderConfirm({
  target, onClose, onDeleted,
}: { target: DeleteTarget | null; onClose: () => void; onDeleted: () => void }) {
  const [view, setView] = useState<{ mode: 'blocked' | 'confirm'; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  useEffect(() => {
    let alive = true;
    if (!target) { setView(null); setBusy(false); busyRef.current = false; return; }
    setView(null);
    (async () => {
      const { pending, docs, folders } = await prepareDelete(target.uri);
      if (!alive) return;
      if (pending > 0) {
        setView({ mode: 'blocked', msg: `Đang có ${pending} file chờ xử lý trong ${target.noun} này. Chờ xíu rồi thử lại nha dợ iu!` });
      } else {
        setView({ mode: 'confirm', msg: deleteFolderMessage(target.name, docs, folders) });
      }
    })();
    return () => { alive = false; };
  }, [target]);

  if (!target || !view) return null;

  if (view.mode === 'blocked') {
    return (
      <ConfirmDialog
        isOpen singleAction title="Khoan đã!" message={view.msg} confirmText="Đã hiểu"
        onConfirm={onClose} onCancel={onClose}
      />
    );
  }

  return (
    <ConfirmDialog
      isOpen
      title={`Xóa ${target.noun}?`}
      message={view.msg}
      confirmText={busy ? 'Đang xóa…' : 'Xóa'}
      onConfirm={async () => {
        if (busyRef.current) return; // chặn double-tap khi cây lớn xóa lâu
        busyRef.current = true; setBusy(true);
        const r = await deleteFolder(target.uri, target.noun); // emitKhoChanged → nơi gọi tự reload
        onClose();
        if (r.ok) onDeleted();
      }}
      onCancel={() => { if (!busyRef.current) onClose(); }}
    />
  );
}
