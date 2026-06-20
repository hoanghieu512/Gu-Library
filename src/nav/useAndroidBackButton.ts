import { useEffect, useRef } from 'react';
import { useIonRouter, useIonToast } from '@ionic/react';
import { App } from '@capacitor/app';
import { decideBackAction } from './decideBackAction';

const EXIT_CONFIRM_WINDOW_MS = 2000;

// Ionic back-button priorities: overlays (modal/sheet/alert) = 100, menu = 99,
// IonTabs / IonRouterOutlet default = 0. We MUST register above the tabs/outlet
// default: IonTabs registers at 0 and pops once AND then calls processNextHandler,
// so a handler below it (e.g. -1) pops a SECOND time -> double-pop (folder ->
// grandparent, viewer -> wrong folder). Registering at 50 makes us the sole
// navigator (we never call processNextHandler = we consume the press), while
// staying below 99/100 so overlays/menus still consume the press first when open.
const BACK_BUTTON_PRIORITY = 50;

/** Detail shape of the Ionic `ionBackButton` CustomEvent. */
interface IonBackButtonDetail {
  register: (priority: number, handler: (processNextHandler: () => void) => void) => void;
}

/**
 * Wires the Android hardware/gesture back button to one-step-up navigation.
 * Registers at BACK_BUTTON_PRIORITY (above IonTabs's default, below overlays).
 */
export function useAndroidBackButton(): void {
  const router = useIonRouter();
  const [presentToast] = useIonToast();
  const exitArmedRef = useRef(false);
  const armTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const onIonBackButton = (ev: Event): void => {
      const detail = (ev as CustomEvent<IonBackButtonDetail>).detail;
      detail.register(BACK_BUTTON_PRIORITY, async () => {
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
