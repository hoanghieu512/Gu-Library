import { useRef, useState } from 'react';
import { useHistory } from 'react-router-dom';
import type { SharedFile } from '../plugins/shareTarget';
import ChooseMonSheet from './ChooseMonSheet';
import ImportProgressModal from './ImportProgressModal';
import { importBatch } from './inboxRepo';
import { perfStart, perfEnd } from '../perf/perf';

// Sheet chọn đích + copy cả lô (dùng chung ShareReceiver + AddPage). batch>0 = mở sheet.
// v1.12.0: modal tiến trình (vòng % + Hủy) → modal success (Xem kho). CHỈ một điểm kết (không toast lặp).
export default function ImportDestinationFlow({ batch, onClear, onAddMore }: { batch: SharedFile[]; onClear: () => void; onAddMore?: () => void }) {
  const history = useHistory();
  const [modal, setModal] = useState<{ open: boolean; phase: 'importing' | 'done'; done: number; total: number; ok: number }>(
    { open: false, phase: 'importing', done: 0, total: 0, ok: 0 },
  );
  const cancelRef = useRef(false);
  // "Thêm tiếp": đóng modal trước, chờ dismiss animation xong (onDidDismiss) mới mở picker —
  // né picker bị nuốt sự kiện trên Capacitor nếu bật khi modal chưa đóng hẳn (v1.18.0).
  const pendingAddMore = useRef(false);

  const pick = async (path: string[]) => { // import chỉ cần path (prefix); bỏ qua destUri
    const files = batch;
    onClear();
    if (files.length === 0) return;
    cancelRef.current = false;
    setModal({ open: true, phase: 'importing', done: 0, total: files.length, ok: 0 });
    perfStart('importBatch'); // đo copy cả lô vào _inbox (⏳ xuất hiện khi copy xong)
    const { ok } = await importBatch(
      files, path,
      (done) => setModal((m) => ({ ...m, done })),   // % + "Đang nhập i/tổng…"
      () => cancelRef.current,                        // Hủy → dừng ở ranh giới file
    );
    perfEnd('importBatch');
    setModal((m) => ({ ...m, phase: 'done', ok }));   // điểm kết duy nhất
  };

  const note = batch.length === 0 ? null : batch.length === 1 ? batch[0].name : `${batch.length} file`;

  return (
    <>
      <ChooseMonSheet isOpen={batch.length > 0} note={note} onPick={pick} onCancel={onClear} />
      <ImportProgressModal
        open={modal.open}
        phase={modal.phase}
        done={modal.done}
        total={modal.total}
        ok={modal.ok}
        onCancel={() => { cancelRef.current = true; }}
        onViewKho={() => { setModal((m) => ({ ...m, open: false })); history.push('/home'); }}
        onAddMore={onAddMore ? () => { pendingAddMore.current = true; setModal((m) => ({ ...m, open: false })); } : undefined}
        onDidDismiss={() => { if (pendingAddMore.current) { pendingAddMore.current = false; onAddMore?.(); } }}
      />
    </>
  );
}
