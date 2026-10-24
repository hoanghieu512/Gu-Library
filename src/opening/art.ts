// Art for the opening doors: one generated door (the right door is the same image mirrored) and
// the panda judge. Made with scripts/gen-opening-art.mjs, cut by scripts/make-opening-assets.py.
import door from '../assets/opening-door.webp';
import panda from '../assets/opening-panda.webp';

/** One door; the right door is the same image mirrored. null = CSS placeholder door. */
export const DOOR_SRC: string | null = door;
export const PANDA_SRC: string = panda;
