import { useCallback, useEffect, useRef, useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonIcon, IonContent,
  IonList, IonItem, IonLabel, IonBadge, IonFooter, useIonRouter,
  IonItemSliding, IonItemOptions, IonItemOption,
} from '@ionic/react';
import {
  folderOutline, chevronForward, hourglassOutline, add,
  printOutline, trashOutline, swapHorizontalOutline, close,
} from 'ionicons/icons';
import { useParams, useHistory } from 'react-router-dom';
import { listFolder, createSubfolder, getRootUri } from '../storage/repo';
import { setDisplayName, moveDocument, deleteDocument } from '../storage/docRepo';
import { setPrintFlag, clearPrintFlag } from '../print/printRepo';
import { removeReading, moveReading } from '../reading/store';
import { relPathFromUris } from '../reading/paths';
import { getKhoSnapshot, folderByPath } from '../storage/khoSnapshot';
import HeaderBreadcrumb, { type Crumb } from '../components/HeaderBreadcrumb';
import { encodeUriParam, decodeUriParam } from '../storage/uriParam';
import type { FolderListing, Document } from '../storage/types';
import CreateFolderModal from '../components/CreateFolderModal';
import RenameModal from '../components/RenameModal';
import DeleteFolderConfirm, { type DeleteTarget } from '../components/DeleteFolderConfirm';
import { renameFolder } from '../storage/folderRepo';
import DocActionsSheet from '../components/DocActionsSheet';
import FolderDocRow from '../components/FolderDocRow';
import ConfirmDialog from '../components/ConfirmDialog';
import ChooseMonSheet from '../import/ChooseMonSheet';
import SadPandaState from '../components/SadPandaState';
import { coalesceKhoChanged } from '../lib/khoEvents';
import { useGuToast } from '../lib/useGuToast';
import { perfStart, perfEnd, afterPaint } from '../perf/perf';

export default function FolderPage() {
  const { uri } = useParams<{ uri: string }>();
  const decoded = decodeUriParam(uri);
  const history = useHistory();
  const ionRouter = useIonRouter();
  const [listing, setListing] = useState<FolderListing | null>(null);
  const [error, setError] = useState<string>('');
  // Header bấm-nhảy-tầng (v1.20.0): crumbs = mọi tầng (môn→hiện tại) kèm URI để nhảy lên. Giữ rule
  // rút gọn folderHeaderTitle v1.15.0 (render trong HeaderBreadcrumb). URI tầng cha resolve qua
  // khoSnapshot (folderByPath); tầng cuối = decoded (chắc chắn đúng).
  const [crumbs, setCrumbs] = useState<Crumb[]>([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      const root = await getRootUri();
      const rel = root ? relPathFromUris(root, decoded) : null;
      const segs = rel ? rel.split('/').filter(Boolean) : [];
      if (segs.length === 0) { if (alive) setCrumbs([]); return; }
      let snap = null;
      try { snap = await getKhoSnapshot(); } catch { snap = null; }
      const built: Crumb[] = segs.map((name, i) =>
        i === segs.length - 1
          ? { name, uri: decoded }
          : { name, uri: (snap && folderByPath(snap, segs.slice(0, i + 1))?.uri) || '' });
      if (alive) setCrumbs(built);
    })();
    return () => { alive = false; };
  }, [decoded]);
  // Nhảy LÊN tầng cha: direction 'back' → Ionic unwind stack tới view đã có (như bấm back nhiều
  // lần) nên back từ tầng vừa nhảy tới về đúng CHA của nó, không quay lại tầng sâu vừa rời.
  const jumpTo = (targetUri: string) => {
    if (!targetUri || targetUri === decoded) return;
    ionRouter.push(`/folder/${encodeUriParam(targetUri)}`, 'back');
  };
  const [createOpen, setCreateOpen] = useState(false);
  const [renameSub, setRenameSub] = useState<{ uri: string; name: string } | null>(null);
  const [deleteSub, setDeleteSub] = useState<DeleteTarget | null>(null);
  const [actionsDoc, setActionsDoc] = useState<Document | null>(null); // ⋯ sheet (đơn)
  const [moveDoc, setMoveDoc] = useState<Document | null>(null);       // Chuyển đơn
  // Chế độ chọn nhiều
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());   // pdfUri
  const [batchMove, setBatchMove] = useState(false);
  const [busy, setBusy] = useState(false);
  // Dialog xác nhận xóa (chống lỡ tay) — chèn TRƯỚC luồng xóa (toast loading→success).
  const [confirmDel, setConfirmDel] = useState<{ open: boolean; title: string; message: string; run: () => void }>(
    { open: false, title: '', message: '', run: () => {} },
  );
  const closeConfirm = () => setConfirmDel((c) => ({ ...c, open: false }));
  const RECOVER = 'Vẫn khôi phục được từ bản sao đồng bộ (~30 ngày).'; // KHÔNG dọa "không hoàn tác"

  // Toast 3 trạng thái (hook dùng chung v1.25.0) — thao tác ĐƠN lẫn LÔ đều bắn qua đây.
  const { toastLoading, toastResult, node: toastNode } = useGuToast();

  const load = useCallback((spinner: boolean) => {
    if (spinner) setListing(null);
    setError('');
    listFolder(decoded)
      .then(setListing)
      .catch((e) => setError(String(e?.message ?? e)));
  }, [decoded]);
  const loadListing = useCallback(() => load(true), [load]);

  // openMon: đo từ khi vào màn thư mục (mount/đổi folder) → danh sách vẽ xong.
  useEffect(() => { perfStart('openMon'); loadListing(); }, [loadListing]);
  useEffect(() => { if (listing) afterPaint(() => perfEnd('openMon')); }, [listing]);
  // enterSelect: chốt khi UI chọn-nhiều đã hiện (start neo lúc long-press bắn ở FolderDocRow).
  useEffect(() => { if (selectMode) afterPaint(() => perfEnd('enterSelect')); }, [selectMode]);

  const baseOf = (d: Document) => d.fileBase ?? d.name;

  // --- chế độ chọn nhiều ---
  const selectModeRef = useRef(false);
  useEffect(() => { selectModeRef.current = selectMode; }, [selectMode]);
  const exitMode = () => { setSelectMode(false); setSelected(new Set()); };
  const enterModeWith = (d: Document) => { setSelectMode(true); setSelected(new Set([d.pdfUri])); };
  const toggleSel = (d: Document) => setSelected((s) => {
    const n = new Set(s); if (n.has(d.pdfUri)) n.delete(d.pdfUri); else n.add(d.pdfUri); return n;
  });
  const selectedDocs = () => (listing?.documents ?? []).filter((d) => selected.has(d.pdfUri));

  // Phản ánh NGAY một tài liệu vào danh sách đang hiển thị (ảnh RAM của thư mục) khi op của nó
  // xong ở tầng file — không đợi hết lô. Filesystem vẫn là nguồn sự thật (khoChanged cuối lô
  // reload Home/snapshot); đây là phản-ánh-kết-quả-đã-biết, không phải optimistic đoán trước.
  const removeDocLocal = (pdfUri: string) =>
    setListing((l) => (l ? { ...l, documents: l.documents.filter((d) => d.pdfUri !== pdfUri) } : l));
  const flagDocLocal = (pdfUri: string, flag: boolean) =>
    setListing((l) => (l ? { ...l, documents: l.documents.map((d) => (d.pdfUri === pdfUri ? { ...d, printFlagged: flag } : d)) } : l));

  // Back cứng: trong mode → thoát mode (nuốt); ngoài mode → nhường handler điều hướng (priority 50).
  useEffect(() => {
    const onBack = (ev: Event) => {
      (ev as CustomEvent<{ register: (p: number, h: (next: () => void) => void) => void }>).detail
        .register(60, (next) => { if (selectModeRef.current) exitMode(); else next(); });
    };
    document.addEventListener('ionBackButton', onBack);
    return () => document.removeEventListener('ionBackButton', onBack);
  }, []);

  // --- thao tác ĐƠN (v1.5.0) --- phản ánh ngay (per-item), khoChanged reload Home, KHÔNG re-read cả folder.
  const togglePrint = async (d: Document) => {
    if (d.printFlagged) await clearPrintFlag(d.pdfUri); else await setPrintFlag(d.pdfUri);
    flagDocLocal(d.pdfUri, !d.printFlagged);
    toastResult(d.printFlagged ? 'Đã bỏ đánh dấu in gòi nha!' : 'Đã đánh dấu cần in gòi nha!', true);
  };
  const runDelete = async (d: Document) => {
    const root = await getRootUri();
    const rel = root ? relPathFromUris(root, d.pdfUri) : null;
    await deleteDocument(decoded, baseOf(d));
    if (rel) await removeReading(rel);
    removeDocLocal(d.pdfUri);
    toastResult('Đã xóa tài liệu gòi nha!', true);
  };
  const confirmDelete = (d: Document) => {
    setConfirmDel({
      open: true,
      title: 'Xóa tài liệu này?',
      message: `“${d.name}” sẽ bị xóa khỏi kho (đồng bộ mọi máy). ${RECOVER}`,
      run: () => runDelete(d),
    });
  };
  const doRename = async (d: Document, newName: string) => {
    await setDisplayName(decoded, baseOf(d), newName);
    setActionsDoc(null);
    const shown = newName.trim() || (d.fileBase ?? d.name); // rỗng = về tên file
    setListing((l) => (l ? { ...l, documents: l.documents.map((x) => (x.pdfUri === d.pdfUri ? { ...x, name: shown } : x)) } : l));
    toastResult('Đã đổi tên gòi nha!', true);
  };
  const doMove = async (_path: string[], destUri: string) => {
    const d = moveDoc; setMoveDoc(null);
    if (!d || !destUri) return;
    const root = await getRootUri(); if (!root) return;
    const oldRel = relPathFromUris(root, d.pdfUri);
    const newBase = await moveDocument(decoded, baseOf(d), destUri);
    const destRel = relPathFromUris(root, destUri);
    if (oldRel && destRel != null) await moveReading(oldRel, `${destRel}/${newBase}.pdf`, d.name);
    removeDocLocal(d.pdfUri);
    toastResult('Đã chuyển tài liệu gòi nha!', true);
  };

  // --- thao tác LÔ (cưỡi lên hàm đơn) ---
  // Lô gom MỘT khoChanged ở cuối (coalesce) + phản ánh TỪNG tài liệu ngay khi xong (không đợi hết lô).
  const batchPrint = async () => {
    const docs = selectedDocs(); if (!docs.length) return;
    setBusy(true);
    let ok = 0;
    await coalesceKhoChanged(async () => {
      for (const d of docs) {
        try { await setPrintFlag(d.pdfUri); flagDocLocal(d.pdfUri, true); ok += 1; } catch { /* skip */ } // idempotent, KHÔNG toggle
      }
    });
    setBusy(false); exitMode();
    // In lô nhanh → chỉ success (không loading).
    toastResult(`Đã đánh dấu ${ok} tài liệu cần in gòi nha!`, true);
  };
  const runBatchDelete = async (docs: Document[]) => {
    const n = docs.length;
    toastLoading(`Đang xóa ${n} tài liệu…`);
    setBusy(true);
    const root = await getRootUri();
    let ok = 0, fail = 0;
    await coalesceKhoChanged(async () => {
      for (const d of docs) {
        try {
          const rel = root ? relPathFromUris(root, d.pdfUri) : null;
          await deleteDocument(decoded, baseOf(d));
          if (rel) await removeReading(rel);
          removeDocLocal(d.pdfUri); // biến ngay khi xong
          ok += 1;
        } catch { fail += 1; }
      }
    });
    setBusy(false); exitMode();
    if (fail) toastResult(`Đã xóa ${ok}/${n} · ${fail} lỗi`, false);
    else toastResult(`Đã xóa ${ok} tài liệu gòi nha!`, true);
  };
  const batchDelete = () => {
    const docs = selectedDocs(); if (!docs.length) return;
    setConfirmDel({
      open: true,
      title: `Xóa ${docs.length} tài liệu?`,
      message: `${docs.length} tài liệu sẽ bị xóa khỏi kho (đồng bộ mọi máy). ${RECOVER}`,
      run: () => runBatchDelete(docs),
    });
  };
  const batchMoveDo = async (_path: string[], destUri: string) => {
    const docs = selectedDocs(); setBatchMove(false);
    if (!docs.length || !destUri) { exitMode(); return; }
    const n = docs.length;
    toastLoading(`Đang chuyển ${n} tài liệu…`);
    setBusy(true);
    const root = await getRootUri();
    let ok = 0, fail = 0;
    await coalesceKhoChanged(async () => {
      for (const d of docs) {
        try {
          const oldRel = root ? relPathFromUris(root, d.pdfUri) : null;
          const newBase = await moveDocument(decoded, baseOf(d), destUri);
          const destRel = root ? relPathFromUris(root, destUri) : null;
          if (oldRel && destRel != null) await moveReading(oldRel, `${destRel}/${newBase}.pdf`, d.name);
          removeDocLocal(d.pdfUri); // nguồn vơi dần ngay
          ok += 1;
        } catch { fail += 1; }
      }
    });
    setBusy(false); exitMode();
    if (fail) toastResult(`Đã chuyển ${ok}/${n} · ${fail} lỗi`, false);
    else toastResult(`Đã chuyển ${ok} tài liệu gòi nha!`, true);
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          {selectMode ? (
            <>
              <IonButtons slot="start">
                <IonButton onClick={exitMode} aria-label="Thoát chọn"><IonIcon slot="icon-only" icon={close} /></IonButton>
              </IonButtons>
              <IonTitle className="gu-title">Đã chọn {selected.size}</IonTitle>
            </>
          ) : (
            <>
              <IonButtons slot="start"><IonBackButton defaultHref="/home" /></IonButtons>
              <IonTitle className="gu-title"><HeaderBreadcrumb crumbs={crumbs} onJump={jumpTo} /></IonTitle>
              <IonButtons slot="end">
                <IonButton fill="clear" onClick={() => setCreateOpen(true)} aria-label="Tạo thư mục mới">
                  <IonIcon icon={add} />
                </IonButton>
              </IonButtons>
            </>
          )}
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {!listing && !error && <p>Đang tải…</p>}
        {/* Thư mục bị xóa từ máy khác (Syncthing rải về) trong lúc đang đứng bên trong → listFolder
            ném FileNotFound. Thay dòng lỗi trần bằng empty-state panda thân thiện + nút về Home. */}
        {error && (
          <SadPandaState message="Thư mục đã bị xóa gòi dợ iu! Nếu là xóa nhầm thì liên hệ chùn để khôi phục." />
        )}
        {listing && listing.folders.length === 0 && listing.documents.length === 0 && listing.pending.length === 0 && (
          <p style={{ color: 'var(--gu-grey)' }}>Thư mục trống.</p>
        )}
        {listing && (
          <IonList>
            {/* Folder con: không tick/long-press (v1.6.0); VUỐT TRÁI → "Đổi tên" (v1.22.0). */}
            {listing.folders.map((f) => (
              <IonItemSliding key={f.uri} disabled={selectMode}>
                <IonItem button detail={false} onClick={() => history.push(`/folder/${encodeUriParam(f.uri)}`)}>
                  <IonIcon icon={folderOutline} slot="start" />
                  <IonLabel className="gu-serif">{f.name}</IonLabel>
                  <IonIcon icon={chevronForward} slot="end" />
                </IonItem>
                <IonItemOptions side="end">
                  {/* Đóng slide TRƯỚC khi mở dialog → Hủy xong không treo menu ở vị trí mở (v1.6.0). */}
                  <IonItemOption onClick={(e) => { (e.currentTarget.closest('ion-item-sliding') as HTMLIonItemSlidingElement | null)?.close(); setRenameSub({ uri: f.uri, name: f.name }); }} aria-label="Đổi tên">Đổi tên</IonItemOption>
                  <IonItemOption color="danger" onClick={(e) => { (e.currentTarget.closest('ion-item-sliding') as HTMLIonItemSlidingElement | null)?.close(); setDeleteSub({ uri: f.uri, name: f.name, noun: 'thư mục' }); }} aria-label="Xóa">Xóa</IonItemOption>
                </IonItemOptions>
              </IonItemSliding>
            ))}
            {/* Tài liệu */}
            {listing.documents.map((d) => (
              <FolderDocRow
                key={d.pdfUri}
                doc={d}
                selectMode={selectMode}
                selected={selected.has(d.pdfUri)}
                onOpen={() => history.push(`/viewer/${encodeUriParam(d.pdfUri)}`)}
                onToggleSelect={() => toggleSel(d)}
                onLongPress={() => enterModeWith(d)}
                onTogglePrint={() => togglePrint(d)}
                onDelete={() => confirmDelete(d)}
                onActions={() => setActionsDoc(d)}
              />
            ))}
            {/* Chờ xử lý (⏳ lẻ): không action, không lọt lô */}
            {listing.pending.map((p) => (
              <IonItem key={p.sourceUri} disabled>
                <IonLabel color="medium">{p.name}</IonLabel>
                <IonBadge slot="end" style={{ background: 'var(--gu-pending)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <IonIcon icon={hourglassOutline} style={{ fontSize: 13 }} />
                  chờ xử lý
                </IonBadge>
              </IonItem>
            ))}
          </IonList>
        )}
      </IonContent>

      {/* Thanh action lô */}
      {selectMode && (
        <IonFooter>
          <IonToolbar>
            <div style={{ display: 'flex', gap: 8, padding: '4px 8px' }}>
              <IonButton fill="clear" disabled={selected.size === 0 || busy} onClick={batchPrint} style={{ flex: 1 }}>
                <IonIcon slot="start" icon={printOutline} /> In lô
              </IonButton>
              <IonButton fill="clear" disabled={selected.size === 0 || busy} onClick={() => setBatchMove(true)} style={{ flex: 1 }}>
                <IonIcon slot="start" icon={swapHorizontalOutline} /> Chuyển
              </IonButton>
              <IonButton fill="clear" color="danger" disabled={selected.size === 0 || busy} onClick={batchDelete} style={{ flex: 1 }}>
                <IonIcon slot="start" icon={trashOutline} /> Xóa
              </IonButton>
            </div>
          </IonToolbar>
        </IonFooter>
      )}

      <CreateFolderModal
        isOpen={createOpen}
        title="Thư mục mới"
        noun="thư mục"
        withColor={false}
        existingNames={listing?.folders.map((f) => f.name) ?? []}
        onCreate={async (name) => { await createSubfolder(decoded, name); loadListing(); }}
        onClose={() => setCreateOpen(false)}
      />

      <RenameModal
        isOpen={!!renameSub}
        noun="thư mục"
        currentName={renameSub?.name ?? ''}
        onSave={async (newName) => {
          if (!renameSub) return null;
          const siblings = (listing?.folders ?? []).filter((f) => f.uri !== renameSub.uri).map((f) => f.name);
          const r = await renameFolder(renameSub.uri, siblings, newName, 'thư mục');
          if (r.ok) { loadListing(); toastResult('Đã đổi tên gòi nha!', true); } // rename thư mục con → refresh listing màn hiện tại
          return r.ok ? null : r.error;
        }}
        onClose={() => setRenameSub(null)}
      />

      <DeleteFolderConfirm
        target={deleteSub}
        onClose={() => setDeleteSub(null)}
        onDeleted={() => { loadListing(); toastResult('Đã xóa thư mục gòi nha!', true); }}
      />

      <DocActionsSheet
        isOpen={!!actionsDoc}
        doc={actionsDoc ? { name: actionsDoc.name, printFlagged: actionsDoc.printFlagged } : null}
        onRename={(n) => { if (actionsDoc) doRename(actionsDoc, n); }}
        onMove={() => { const d = actionsDoc; setActionsDoc(null); setMoveDoc(d); }}
        onTogglePrint={() => { const d = actionsDoc; setActionsDoc(null); if (d) togglePrint(d); }}
        onDelete={() => { const d = actionsDoc; setActionsDoc(null); if (d) confirmDelete(d); }}
        onClose={() => setActionsDoc(null)}
      />

      {/* Chuyển đơn */}
      <ChooseMonSheet
        isOpen={!!moveDoc}
        note={moveDoc ? `Chuyển: ${moveDoc.name}` : null}
        onPick={doMove}
        onCancel={() => setMoveDoc(null)}
      />
      {/* Chuyển lô */}
      <ChooseMonSheet
        isOpen={batchMove}
        note={`Chuyển ${selected.size} tài liệu`}
        onPick={batchMoveDo}
        onCancel={() => setBatchMove(false)}
      />

      {/* Xác nhận xóa (lẻ + lô) — chèn trước luồng xóa */}
      <ConfirmDialog
        isOpen={confirmDel.open}
        title={confirmDel.title}
        message={confirmDel.message}
        onConfirm={() => { confirmDel.run(); closeConfirm(); }}
        onCancel={closeConfirm}
      />

      {/* Toast 3 trạng thái (đơn + lô) — hook dùng chung */}
      {toastNode}
    </IonPage>
  );
}
