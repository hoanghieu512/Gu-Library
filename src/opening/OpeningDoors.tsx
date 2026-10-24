import { useEffect, useReducer } from 'react';
import './opening.css';
import { DOOR_SRC, PANDA_SRC } from './art';
import {
  DEADLINE_MS, FALLBACK_SLACK_MS, FAST_MS, MIN_SHOWN_MS, OPEN_MS, initialModel, step,
} from './openingMachine';
import { finishOpening, subscribeOpening } from './homeReady';
import { getOpeningEnabled } from './openingPref';
import { afterSmoothFrames } from './smoothFrames';

// The bookcase doors over Home on a cold start (spec 2026-10-24-mo-cua-tu-sach §5.3). Mounted once
// in App, so a resume never replays it. The rules live in openingMachine; this file owns the
// timers, the inputs and the markup. At `done` it leaves the DOM and can no longer take a touch.

// Above useAndroidBackButton (50/60) and above Ionic's own overlays (100): while the doors are up,
// back only skips them and never reaches navigation or app exit.
const BACK_PRIORITY = 110;

interface IonBackButtonDetail {
  register: (priority: number, handler: (processNextHandler: () => void) => void) => void;
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  } catch {
    return false;
  }
}

async function decodeArt(): Promise<void> {
  const srcs = DOOR_SRC ? [DOOR_SRC, PANDA_SRC] : [PANDA_SRC];
  await Promise.all(srcs.map((src) => {
    const img = new Image();
    img.src = src;
    return img.decode?.();
  }));
}

/** Any doubt (switch unreadable, image broken) means no doors: Home must never wait on them. */
async function shouldPlay(): Promise<boolean> {
  if (prefersReducedMotion()) return false;
  try {
    if (!(await getOpeningEnabled())) return false;
    await decodeArt();
    return true;
  } catch {
    return false;
  }
}

export default function OpeningDoors() {
  const [{ state }, dispatch] = useReducer(step, undefined, initialModel);
  const live = state !== 'done';

  useEffect(() => {
    let alive = true;
    const deadline = setTimeout(() => dispatch({ type: 'deadline' }), DEADLINE_MS);
    // Home being ready is passed on only once the WebView paints smoothly again (smoothFrames.ts):
    // opened during Home's busy spell, the doors would swing without a single frame on screen.
    let cancelSmooth = () => {};
    const off = subscribeOpening((e) => {
      if (e.type !== 'homeReady') { dispatch(e); return; }
      // Home did get ready: the deadline is for a Home that never does. The smooth wait has its own cap.
      clearTimeout(deadline);
      cancelSmooth();
      cancelSmooth = afterSmoothFrames(() => dispatch(e));
    });
    shouldPlay().then((play) => { if (alive) dispatch({ type: 'start', play }); });
    return () => {
      alive = false;
      clearTimeout(deadline);
      cancelSmooth();
      off();
      finishOpening();
    };
  }, []);

  useEffect(() => {
    if (state === 'done') { finishOpening(); return; }
    const timer =
      state === 'closed' ? setTimeout(() => dispatch({ type: 'minElapsed' }), MIN_SHOWN_MS)
      : state === 'opening' ? setTimeout(() => dispatch({ type: 'animEnd' }), OPEN_MS + FALLBACK_SLACK_MS)
      : state === 'fastOpen' ? setTimeout(() => dispatch({ type: 'animEnd' }), FAST_MS + FALLBACK_SLACK_MS)
      : undefined;
    return () => clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    if (!live) return;
    const onBack = (ev: Event) => {
      (ev as CustomEvent<IonBackButtonDetail>).detail.register(
        BACK_PRIORITY, () => dispatch({ type: 'skip', reason: 'back' }),
      );
    };
    document.addEventListener('ionBackButton', onBack);
    return () => document.removeEventListener('ionBackButton', onBack);
  }, [live]);

  if (!live) return null;
  const doorsUp = state !== 'cover';
  return (
    <button
      type="button"
      className={`gu-opening gu-opening--${state}`}
      aria-label="Bỏ qua hiệu ứng mở cửa"
      onClick={() => dispatch({ type: 'skip', reason: 'tap' })}
      onAnimationEnd={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.animationName === 'gu-opening-out' || e.animationName === 'gu-opening-fast') dispatch({ type: 'animEnd' });
      }}
    >
      <div className="gu-opening__cover" aria-hidden />
      {doorsUp && (
        <div className="gu-opening__stage" aria-hidden>
          <div className="gu-opening__glow" />
          <div className={`gu-opening__door gu-opening__door--left${DOOR_SRC ? '' : ' gu-opening__door--placeholder'}`}>
            {DOOR_SRC && <img src={DOOR_SRC} alt="" draggable={false} />}
          </div>
          <div className={`gu-opening__door gu-opening__door--right${DOOR_SRC ? '' : ' gu-opening__door--placeholder'}`}>
            {DOOR_SRC && <img src={DOOR_SRC} alt="" draggable={false} />}
          </div>
          <div className="gu-opening__seam" />
          <div className="gu-opening__plaque">Gú's Library</div>
          <img className="gu-opening__panda" src={PANDA_SRC} alt="" draggable={false} />
        </div>
      )}
    </button>
  );
}
