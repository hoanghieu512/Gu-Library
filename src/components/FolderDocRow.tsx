import { useRef } from 'react';
import type { CSSProperties } from 'react';
import {
  IonItem, IonItemSliding, IonItemOptions, IonItemOption, IonLabel, IonIcon, IonCheckbox,
} from '@ionic/react';
import { documentTextOutline, print, printOutline, trash, ellipsisHorizontal } from 'ionicons/icons';
import type { Document } from '../storage/types';

interface Props {
  doc: Document;
  selectMode: boolean;
  selected: boolean;
  onOpen: () => void;
  onToggleSelect: () => void;
  onLongPress: () => void;
  onTogglePrint: () => void;
  onDelete: () => void;
  onActions: () => void;
}

const olive: CSSProperties = { '--background': '#4A5D3A', '--color': '#fff' } as CSSProperties;

// Hàng tài liệu: ngoài mode = vuốt (In/Xóa/⋯) + nhấn-giữ vào mode; trong mode = checkbox, tap toggle.
export default function FolderDocRow({
  doc, selectMode, selected, onOpen, onToggleSelect, onLongPress,
  onTogglePrint, onDelete, onActions,
}: Props) {
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);
  const clear = () => { if (timer.current) { clearTimeout(timer.current); timer.current = undefined; } };

  // Long-press CHỈ ngoài mode. Huỷ khi ngón di >10px (vuốt/cuộn) hoặc nhấc sớm (tap).
  const onTouchStart = (e: React.TouchEvent) => {
    if (selectMode) return;
    fired.current = false;
    startRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    clear();
    timer.current = setTimeout(() => { fired.current = true; onLongPress(); }, 450);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!startRef.current) return;
    if (Math.abs(e.touches[0].clientX - startRef.current.x) > 10 ||
        Math.abs(e.touches[0].clientY - startRef.current.y) > 10) clear();
  };

  const handleClick = () => {
    if (fired.current) { fired.current = false; return; } // nuốt click phát sinh sau long-press
    if (selectMode) onToggleSelect(); else onOpen();
  };

  if (selectMode) {
    return (
      <IonItem button detail={false} onClick={handleClick}>
        <IonCheckbox slot="start" checked={selected} onIonChange={onToggleSelect} aria-label="Chọn" />
        <IonLabel className="gu-serif">{doc.name}</IonLabel>
        {doc.printFlagged && <IonIcon slot="end" icon={print} style={{ color: 'var(--gu-brown)', fontSize: 18 }} />}
      </IonItem>
    );
  }
  return (
    <IonItemSliding>
      <IonItem button detail={false} onClick={handleClick}
        onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={clear}>
        <IonIcon icon={documentTextOutline} slot="start" />
        <IonLabel className="gu-serif">{doc.name}</IonLabel>
        {doc.printFlagged && <IonIcon slot="end" icon={print} style={{ color: 'var(--gu-brown)', fontSize: 18 }} aria-label="Đã chọn đi in" />}
      </IonItem>
      <IonItemOptions side="end">
        <IonItemOption onClick={onTogglePrint} aria-label="Cần in"><IonIcon slot="icon-only" icon={doc.printFlagged ? print : printOutline} /></IonItemOption>
        <IonItemOption color="danger" onClick={onDelete} aria-label="Xóa"><IonIcon slot="icon-only" icon={trash} /></IonItemOption>
        <IonItemOption onClick={onActions} aria-label="Thêm" style={olive}><IonIcon slot="icon-only" icon={ellipsisHorizontal} /></IonItemOption>
      </IonItemOptions>
    </IonItemSliding>
  );
}
