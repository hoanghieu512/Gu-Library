import type { CSSProperties, ReactNode } from 'react';
import { IonIcon } from '@ionic/react';
import { chevronForward } from 'ionicons/icons';

// One Settings item as a paper card (B3.1): icon in a tinted box + serif title + value + hint, with a
// chevron (tappable) or a status on the right. Shared by SettingsPage and "Có gì mới" (v1.42.1).
const CARD: CSSProperties = {
  background: 'var(--gu-paper-2)', borderRadius: 14, padding: 14, marginBottom: 12,
};

function IconBox({ icon, tint = 'rgba(117,66,14,0.10)', color = 'var(--gu-brown)' }: {
  icon: string; tint?: string; color?: string;
}) {
  return (
    <div style={{
      width: 42, height: 42, borderRadius: 11, background: tint, flex: '0 0 auto',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <IonIcon icon={icon} style={{ fontSize: 21, color }} />
    </div>
  );
}

export function Chevron() {
  return <IonIcon icon={chevronForward} style={{ color: 'var(--gu-grey)', fontSize: 18 }} />;
}

export default function SettingsRow({ icon, tint, iconColor, title, value, hint, trailing, onClick, ariaLabel, children }: {
  icon: string; tint?: string; iconColor?: string;
  title: string; value?: ReactNode; hint?: string; trailing?: ReactNode;
  onClick?: () => void; ariaLabel?: string; children?: ReactNode;
}) {
  return (
    <div
      style={{ ...CARD, cursor: onClick ? 'pointer' : undefined }} onClick={onClick}
      role={onClick ? 'button' : undefined} aria-label={ariaLabel}
    >
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <IconBox icon={icon} tint={tint} color={iconColor} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--gu-serif)', fontWeight: 700, fontSize: 15.5, color: 'var(--gu-brown-deep)' }}>
            {title}
          </div>
          {value !== undefined && (
            <div style={{ fontSize: 13.5, color: 'var(--gu-brown)', marginTop: 2, wordBreak: 'break-all' }}>{value}</div>
          )}
          {hint && <div style={{ fontSize: 12, color: 'var(--gu-grey)', marginTop: 2 }}>{hint}</div>}
        </div>
        {trailing && <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center' }}>{trailing}</div>}
      </div>
      {children}
    </div>
  );
}
