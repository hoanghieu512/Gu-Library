import { useCallback, useEffect, useState } from 'react';
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonIcon, IonContent,
  IonList, IonItem, IonItemSliding, IonItemOptions, IonItemOption, IonLabel, IonBadge, useIonAlert,
} from '@ionic/react';
import {
  folderOutline, documentTextOutline, chevronForward, hourglassOutline, add,
  print, printOutline, trash, ellipsisHorizontal,
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
import ChooseMonSheet from '../import/ChooseMonSheet';

export default function FolderPage() {
  const { uri } = useParams<{ uri: string }>();
  const decoded = decodeUriParam(uri);
  const history = useHistory();
  const [listing, setListing] = useState<FolderListing | null>(null);
  const [error, setError] = useState<string>('');
  const [createOpen, setCreateOpen] = useState(false);
  const [actionsDoc, setActionsDoc] = useState<Document | null>(null); // ⋯ sheet
  const [moveDoc, setMoveDoc] = useState<Document | null>(null);       // Chuyển tới… (ChooseMonSheet)
  const [presentAlert] = useIonAlert();

  const loadListing = useCallback(() => {
    setListing(null); setError('');
    listFolder(decoded)
      .then(setListing)
      .catch((e) => setError(String(e?.message ?? e)));
  }, [decoded]);

  useEffect(() => { loadListing(); }, [loadListing]);

  const baseOf = (d: Document) => d.fileBase ?? d.name; // tên FILE cho thao tác

  const togglePrint = async (d: Document) => {
    if (d.printFlagged) await clearPrintFlag(d.pdfUri); else await setPrintFlag(d.pdfUri);
    loadListing();
  };

  const confirmDelete = (d: Document) => {
    presentAlert({
      header: 'Xóa tài liệu?',
      message: `Xóa hẳn “${d.name}” khỏi kho (mọi máy sau khi đồng bộ). Không hoàn tác trong app.`,
      buttons: [
        { text: 'Hủy', role: 'cancel' },
        {
          text: 'Xóa', role: 'destructive', handler: async () => {
            const root = await getRootUri();
            const rel = root ? relPathFromUris(root, d.pdfUri) : null;
            await deleteDocument(decoded, baseOf(d));
            if (rel) await removeReading(rel);
            loadListing();
          },
        },
      ],
    });
  };

  const doRename = async (d: Document, newName: string) => {
    await setDisplayName(decoded, baseOf(d), newName);
    setActionsDoc(null);
    loadListing();
  };

  // Chuyển: dời trọn cụm + reading-state máy mình sang đường dẫn mới.
  const doMove = async (_path: string[], destUri: string) => {
    const d = moveDoc; setMoveDoc(null);
    if (!d || !destUri) return;
    const root = await getRootUri(); if (!root) return;
    const oldRel = relPathFromUris(root, d.pdfUri);
    const newBase = await moveDocument(decoded, baseOf(d), destUri);
    const destRel = relPathFromUris(root, destUri);
    if (oldRel && destRel != null) await moveReading(oldRel, `${destRel}/${newBase}.pdf`, d.name);
    loadListing();
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start"><IonBackButton defaultHref="/home" /></IonButtons>
          <IonTitle className="gu-title">Môn / Chương</IonTitle>
          <IonButtons slot="end">
            <IonButton fill="clear" onClick={() => setCreateOpen(true)} aria-label="Tạo thư mục mới">
              <IonIcon icon={add} />
            </IonButton>
          </IonButtons>
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
            {/* Folder con: chưa có action đợt này (M10 folder = beat khác) */}
            {listing.folders.map((f) => (
              <IonItem key={f.uri} button onClick={() => history.push(`/folder/${encodeUriParam(f.uri)}`)}>
                <IonIcon icon={folderOutline} slot="start" />
                <IonLabel className="gu-serif">{f.name}</IonLabel>
                <IonIcon icon={chevronForward} slot="end" />
              </IonItem>
            ))}
            {/* Tài liệu: vuốt trái → In · Xóa · ⋯ */}
            {listing.documents.map((d) => (
              <IonItemSliding key={d.pdfUri}>
                <IonItem button detail={false} onClick={() => history.push(`/viewer/${encodeUriParam(d.pdfUri)}`)}>
                  <IonIcon icon={documentTextOutline} slot="start" />
                  <IonLabel className="gu-serif">{d.name}</IonLabel>
                </IonItem>
                <IonItemOptions side="end">
                  <IonItemOption onClick={() => togglePrint(d)} aria-label="Cần in">
                    <IonIcon slot="icon-only" icon={d.printFlagged ? print : printOutline} />
                  </IonItemOption>
                  <IonItemOption color="danger" onClick={() => confirmDelete(d)} aria-label="Xóa">
                    <IonIcon slot="icon-only" icon={trash} />
                  </IonItemOption>
                  <IonItemOption onClick={() => setActionsDoc(d)} aria-label="Thêm">
                    <IonIcon slot="icon-only" icon={ellipsisHorizontal} />
                  </IonItemOption>
                </IonItemOptions>
              </IonItemSliding>
            ))}
            {/* Chờ xử lý (file lẻ ⏳): không action */}
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

      <ChooseMonSheet
        isOpen={!!moveDoc}
        note={moveDoc ? `Chuyển: ${moveDoc.name}` : null}
        onPick={doMove}
        onCancel={() => setMoveDoc(null)}
      />
    </IonPage>
  );
}
