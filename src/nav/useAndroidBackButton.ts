import { useEffect, useRef } from 'react';
import { useIonRouter, useIonToast } from '@ionic/react';
import { App } from '@capacitor/app';
import { decideBackAction } from './decideBackAction';

const EXIT_CONFIRM_WINDOW_MS = 2000;

/** Detail shape of the Ionic `ionBackButton` CustomEvent. */
interface IonBackButtonDetail {
  register: (priority: number, handler: (processNextHandler: () => void) => void) => void;
}

/**
 * Wires the Android hardware/gesture back button to one-step-up navigation.
 * Registers at priority -1 so Ionic's overlay handlers (priority >= 100) run
 * first and consume the press when a modal/action-sheet/alert is open.
 */
export function useAndroidBackButton(): void {
  const router = useIonRouter();
  const [presentToast] = useIonToast();
  const exitArmedRef = useRef(false);
  const armTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const onIonBackButton = (ev: Event): void => {
      const detail = (ev as CustomEvent<IonBackButtonDetail>).detail;
      detail.register(-1, async () => {
        const action = decideBackAction({
          canGoBack: router.canGoBack(),
          exitArmed: exitArmedRef.current,
        });
        if (action === 'go-back') {
          router.goBack();
          return;
        }
        if (action === 'exit') {
          await App.exitApp();
          return;
        }
        // action === 'confirm-exit'
        exitArmedRef.current = true;
        if (armTimerRef.current) clearTimeout(armTimerRef.current);
        armTimerRef.current = setTimeout(() => {
          exitArmedRef.current = false;
        }, EXIT_CONFIRM_WINDOW_MS);
        await presentToast({
          message: 'Nhấn back lần nữa để thoát',
          duration: EXIT_CONFIRM_WINDOW_MS,
        });
      });
    };
    document.addEventListener('ionBackButton', onIonBackButton);
    return () => {
      document.removeEventListener('ionBackButton', onIonBackButton);
      if (armTimerRef.current) clearTimeout(armTimerRef.current);
    };
  }, [router, presentToast]);
}
