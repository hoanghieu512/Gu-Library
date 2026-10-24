#!/usr/bin/env python3
"""Cut the generated door and panda into the two WebP files the opening doors use.

One-off asset generator: run only when the source art changes. Needs Pillow + numpy (NOT repo
deps; use a throwaway venv, as for make-press-sprites.py).

    python3 scripts/make-opening-assets.py --door <door.jpg> --panda <panda.jpg>

Source art: OpenRouter, google/gemini-nano-banana-2.1, made with scripts/gen-opening-art.mjs and
the prompts in scripts/opening-art/. The model does not hold a set (see make-press-sprites.py), so
only ONE door is generated: the right door is the same image mirrored by CSS. Source images stay
outside the repo (it is public); the prompts, model and date go in the ops doc §8.

door   Trim the jamb and outline the model drew round the slab (EDGE_TRIM), then resample to
       DOOR_SIZE. That is a squeeze, not a crop: the generated slab is about 0.56 wide per unit of
       height and a door on screen about 0.45 (half of a 9:20 phone), and cropping to fit would cut
       off the hinges or the handle. CSS draws it with object-fit: fill for the same reason.
panda  The model paints a flat brown backdrop. Remove only the backdrop connected to the image
       border (flood fill), so the brown leather book held against the chest stays opaque; soften
       a thin band at the edge by colour distance, crop to the figure, scale to PANDA_HEIGHT.
"""
import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT_DOOR = ROOT / 'src/assets/opening-door.webp'
OUT_PANDA = ROOT / 'src/assets/opening-panda.webp'

EDGE_TRIM = (9, 6, 2, 4)        # left, top, right, bottom px of the 768 x 1376 source: jamb, outline
DOOR_SIZE = (640, 1440)         # about 0.44, the door on a 9:20 phone
DOOR_MAX_BYTES = 120_000
PANDA_HEIGHT = 600
PANDA_MAX_BYTES = 80_000
BG_NEAR = 38                    # colour distance still counted as backdrop for the flood fill
EDGE_BAND = (14, 60)            # distance range mapped to alpha 0..1 in the band around the figure


def make_door(src: Path) -> None:
    im = Image.open(src).convert('RGB')
    l, t, r, b = EDGE_TRIM
    im = im.crop((l, t, im.width - r, im.height - b)).resize(DOOR_SIZE, Image.LANCZOS)
    im.save(OUT_DOOR, quality=82, method=6)
    size = OUT_DOOR.stat().st_size
    print(f'{OUT_DOOR.relative_to(ROOT)} {DOOR_SIZE} {size} bytes')
    if size > DOOR_MAX_BYTES:
        sys.exit(f'door over budget: {size} > {DOOR_MAX_BYTES}')


def make_panda(src: Path) -> None:
    im = Image.open(src).convert('RGB')
    a = np.asarray(im).astype(np.int32)
    h, w, _ = a.shape
    corners = np.array([a[4, 4], a[4, w - 5], a[h - 5, 4], a[h - 5, w - 5]])
    bg = corners.mean(0)
    dist = np.sqrt(((a - bg) ** 2).sum(-1))

    # Backdrop = near-backdrop pixels connected to the border: grow from the border through
    # near-backdrop pixels until nothing changes (ImageDraw.floodfill left the mask untouched here).
    near = dist < BG_NEAR
    backdrop = np.zeros_like(near)
    backdrop[0, :] = near[0, :]
    backdrop[-1, :] = near[-1, :]
    backdrop[:, 0] = near[:, 0]
    backdrop[:, -1] = near[:, -1]
    while True:
        grown = np.asarray(Image.fromarray(backdrop.astype(np.uint8) * 255, 'L').filter(ImageFilter.MaxFilter(3))) > 0
        grown &= near
        if (grown == backdrop).all():
            break
        backdrop = grown

    # Soft edge: in a thin band next to the backdrop, alpha follows the colour distance.
    band = np.asarray(Image.fromarray(backdrop.astype(np.uint8) * 255, 'L').filter(ImageFilter.MaxFilter(5))) > 0
    lo, hi = EDGE_BAND
    soft = np.clip((dist - lo) / (hi - lo), 0, 1)
    alpha = np.where(backdrop, 0.0, np.where(band, soft, 1.0))
    alpha_img = Image.fromarray((alpha * 255).astype(np.uint8), 'L').filter(ImageFilter.MinFilter(3))
    alpha_img = alpha_img.filter(ImageFilter.GaussianBlur(0.8))

    rgba = im.copy()
    rgba.putalpha(alpha_img)
    rgba = rgba.crop(alpha_img.point(lambda v: 255 if v > 8 else 0).getbbox())
    scale = PANDA_HEIGHT / rgba.height
    rgba = rgba.resize((round(rgba.width * scale), PANDA_HEIGHT), Image.LANCZOS)
    rgba.save(OUT_PANDA, quality=85, method=6)
    size = OUT_PANDA.stat().st_size
    print(f'{OUT_PANDA.relative_to(ROOT)} {rgba.size} {size} bytes')
    if size > PANDA_MAX_BYTES:
        sys.exit(f'panda over budget: {size} > {PANDA_MAX_BYTES}')


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument('--door', type=Path, required=True)
    p.add_argument('--panda', type=Path, required=True)
    args = p.parse_args()
    make_door(args.door)
    make_panda(args.panda)


if __name__ == '__main__':
    main()
