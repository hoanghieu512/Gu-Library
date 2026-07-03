import { useCallback, useEffect, useRef, useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonIcon, IonContent,
  IonList, IonItem, IonLabel, IonBadge, IonFooter, useIonAlert, useIonToast,
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
import { encodeUriParam, decodeUriParam } from '../storage/uriParam';
import type { FolderListing, Document } from '../storage/types';
import CreateFolderModal from '../components/CreateFolderModal';
import DocActionsSheet from '../components/DocActionsSheet';
import FolderDocRow from '../components/FolderDocRow';
import ChooseMonSheet from '../import/ChooseMonSheet';

export default function FolderPage() {
  const { uri } = useParams<{ uri: string }>();
  const decoded = decodeUriParam(uri);
  const history = useHistory();
  const [listing, setListing] = useState<FolderListing | null>(null);
  const [error, setError] = useState<string>('');
  const [createOpen, setCreateOpen] = useState(false);
  const [actionsDoc, setActionsDoc] = useState<Document | null>(null); // ⋯ sheet (đơn)
  const [moveDoc, setMoveDoc] = useState<Document | null>(null);       // Chuyển đơn
  // Chế độ chọn nhiều
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());   // pdfUri
  const [batchMove, setBatchMove] = useState(false);
  const [busy, setBusy] = useState(false);
  const [presentAlert] = useIonAlert();
  const [presentToast] = useIonToast();

  const load = useCallback((spinner: boolean) => {
    if (spinner) setListing(null);
    setError('');
    listFolder(decoded)
      .then(setListing)
      .catch((e) => setError(String(e?.message ?? e)));
  }, [decoded]);
  const loadListing = useCallback(() => load(true), [load]);
  const refresh = useCallback(() => load(false), [load]);

  useEffect(() => { loadListing(); }, [loadListing]);

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

  // Back cứng: trong mode → thoát mode (nuốt); ngoài mode → nhường handler điều hướng (priority 50).
  useEffect(() => {
    const onBack = (ev: Event) => {
      (ev as CustomEvent<{ register: (p: number, h: (next: () => void) => void) => void }>).detail
        .register(60, (next) => { if (selectModeRef.current) exitMode(); else next(); });
    };
    document.addEventListener('ionBackButton', onBack);
    return () => document.removeEventListener('ionBackButton', onBack);
  }, []);

  // --- thao tác ĐƠN (v1.5.0) ---
  const togglePrint = async (d: Document) => {
    if (d.printFlagged) await clearPrintFlag(d.pdfUri); else await setPrintFlag(d.pdfUri);
    refresh();
  };
  const runDelete = async (d: Document) => {
    const root = await getRootUri();
    const rel = root ? relPathFromUris(root, d.pdfUri) : null;
    await deleteDocument(decoded, baseOf(d));
    if (rel) await removeReading(rel);
    refresh();
  };
  const confirmDelete = (d: Document) => {
    presentAlert({
      header: 'Xóa tài liệu?',
      message: `Xóa hẳn “${d.name}” khỏi kho (mọi máy sau khi đồng bộ). Không hoàn tác trong app.`,
      buttons: [
        { text: 'Hủy', role: 'cancel' },
        { text: 'Xóa', role: 'destructive', handler: () => { void runDelete(d); } },
      ],
    });
  };
  const doRename = async (d: Document, newName: string) => {
    await setDisplayName(decoded, baseOf(d), newName);
    setActionsDoc(null);
    refresh();
  };
  const doMove = async (_path: string[], destUri: string) => {
    const d = moveDoc; setMoveDoc(null);
    if (!d || !destUri) return;
    const root = await getRootUri(); if (!root) return;
    const oldRel = relPathFromUris(root, d.pdfUri);
    const newBase = await moveDocument(decoded, baseOf(d), destUri);
    const destRel = relPathFromUris(root, destUri);
    if (oldRel && destRel != null) await moveReading(oldRel, `${destRel}/${newBase}.pdf`, d.name);
    refresh();
  };

  // --- thao tác LÔ (cưỡi lên hàm đơn) ---
  const batchPrint = async () => {
    const docs = selectedDocs(); if (!docs.length) return;
    setBusy(true);
    let ok = 0;
    for (const d of docs) { try { await setPrintFlag(d.pdfUri); ok += 1; } catch { /* skip */ } } // idempotent, KHÔNG toggle
    setBusy(false); exitMode(); refresh();
    await presentToast({ message: `Đã đánh dấu ${ok} tài liệu cần in`, duration: 2000 });
  };
  const runBatchDelete = async (docs: Document[]) => {
    setBusy(true);
    const root = await getRootUri();
    let ok = 0, fail = 0;
    for (const d of docs) {
      try {
        const rel = root ? relPathFromUris(root, d.pdfUri) : null;
        await deleteDocument(decoded, baseOf(d));
        if (rel) await removeReading(rel);
        ok += 1;
      } catch { fail += 1; }
    }
    setBusy(false); exitMode(); refresh();
    await presentToast({ message: fail ? `Xóa ${ok}, lỗi ${fail}` : `Đã xóa ${ok} tài liệu`, duration: 2500, color: fail ? 'danger' : undefined });
  };
  const batchDelete = () => {
    const docs = selectedDocs(); if (!docs.length) return;
    presentAlert({
      header: 'Xóa tài liệu?',
      message: `Xóa hẳn ${docs.length} tài liệu khỏi kho (mọi máy sau khi đồng bộ). Không hoàn tác.`,
      buttons: [
        { text: 'Hủy', role: 'cancel' },
        { text: 'Xóa', role: 'destructive', handler: () => { void runBatchDelete(docs); } },
      ],
    });
  };
  const batchMoveDo = async (_path: string[], destUri: string) => {
    const docs = selectedDocs(); setBatchMove(false);
    if (!docs.length || !destUri) { exitMode(); return; }
    setBusy(true);
    const root = await getRootUri();
    let ok = 0, fail = 0;
    for (const d of docs) {
      try {
        const oldRel = root ? relPathFromUris(root, d.pdfUri) : null;
        const newBase = await moveDocument(decoded, baseOf(d), destUri);
        const destRel = root ? relPathFromUris(root, destUri) : null;
        if (oldRel && destRel != null) await moveReading(oldRel, `${destRel}/${newBase}.pdf`, d.name);
        ok += 1;
      } catch { fail += 1; }
    }
    setBusy(false); exitMode(); refresh();
    await presentToast({ message: fail ? `Chuyển ${ok}, lỗi ${fail}` : `Đã chuyển ${ok} tài liệu`, duration: 2500, color: fail ? 'danger' : undefined });
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
              <IonTitle className="gu-title">Môn / Chương</IonTitle>
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
        {error && <p style={{ color: 'var(--ion-color-danger)' }}>Không đọc được thư mục: {error}</p>}
        {listing && listing.folders.length === 0 && listing.documents.length === 0 && listing.pending.length === 0 && (
          <p style={{ color: 'var(--gu-grey)' }}>Thư mục trống.</p>
        )}
        {listing && (
          <IonList>
            {/* Folder con: không tick, không long-press (M10 folder = beat khác) */}
            {listing.folders.map((f) => (
              <IonItem key={f.uri} button disabled={selectMode} onClick={() => history.push(`/folder/${encodeUriParam(f.uri)}`)}>
                <IonIcon icon={folderOutline} slot="start" />
                <IonLabel className="gu-serif">{f.name}</IonLabel>
                <IonIcon icon={chevronForward} slot="end" />
              </IonItem>
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
        withColor={false}
        existingNames={listing?.folders.map((f) => f.name) ?? []}
        onCreate={async (name) => { await createSubfolder(decoded, name); loadListing(); }}
        onClose={() => setCreateOpen(false)}
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
    </IonPage>
  );
}
