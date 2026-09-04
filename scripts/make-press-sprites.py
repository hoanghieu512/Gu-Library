#!/usr/bin/env python3
"""Cut the Book Press photo into the three sprites BookPress.tsx composites.

One-off asset generator — run only when the source art changes. Needs Pillow +
numpy (NOT repo deps; use a throwaway venv).

    python3 scripts/make-press-sprites.py <source.png>

Why derive the states in code instead of generating one image per state: the
image model does NOT hold a set. The same prompt with one sentence changed came
back as a different press (cast-iron top beam vs wooden one, different posts and
feet). So we generate ONE press and derive every state in code —
the platen slides, the paper stack is drawn by CSS. That also buys a continuous
state instead of the old 0 / 1-4 / >=5 buckets.

Split:
  press-frame.png   beam + handle + posts + base. The platen assembly is cut out
                    and the gap re-filled with a clean posts-only row, so the two
                    posts run unbroken behind where the platen used to be.
  press-rod.png     a plain length of the threaded screw. Stretched vertically to
                    span beam underside -> collar, so the rod GROWS as the platen
                    descends instead of tearing away from the beam.
  press-head.png    brass collar + platen slab, cropped to strictly BETWEEN the
                    posts so it slides behind them. Fixed size; only its y moves.

Source art: Higgsfield (nano-banana), prompt kept in Docs/gu-library-ops-qa-prod.md.
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

# --- Landmarks measured off the source photo (row/column profiles) ------------
BBOX = (184, 367, 1616, 2065)   # x0, y0, x1, y1 — tight around the press SILHOUETTE
                                # (not the drop shadow: the old box carried 130px of it
                                #  on the right, which pushed the press off-centre)
BEAM_BOTTOM = 850               # underside of the cast-iron beam
ROD = (880, 985, 845, 950)      # y0, y1, x0, x1 — exactly 5 thread pitches (21px each)
                                # so the strip tiles seamlessly at any length
HEAD_TOP = 990                  # brass collar starts flaring out here
PLATEN_BOTTOM = 1256            # last row of the platen slab
BASE_TOP = 1705                 # first row of the base plinth
CLEAN_ROW = 1450                # a row holding ONLY the two posts + background
WINDOW_SEED = (1450, 897)       # a background point INSIDE the beam/posts/base window
POST_L = (289, 374)             # left post columns
POST_R = (1421, 1506)           # right post columns
OUT_H = 405                     # 135 CSS px at 3x
MATTE_THRESHOLD = 185           # below the studio drop shadow, above nothing on the press.
                                # 228 kept the shadow as a white slab beside the base; the
                                # check is that the matted base ends up symmetric about the
                                # beam's centre column (897) — at 228 it ran to x1791.


def alpha_from_luma(rgb: np.ndarray, seeds: list[tuple[int, int]] | None = None) -> np.ndarray:
    """Matte the near-white studio background, keeping bright brass highlights.

    A plain luminance threshold punches holes in the brass, so the rough mask is
    flood-filled from the border: anything the background cannot reach is object.

    `seeds` are extra (y, x) background points for regions the border flood cannot
    reach. The press has one: the window enclosed by beam, posts and base. Without
    a seed in there it fills solid and the press renders with a slab across it.
    """
    luma = rgb.mean(axis=2)
    rough = (luma < MATTE_THRESHOLD).astype(np.uint8)

    h, w = rough.shape
    # pad with a ring of background so the seed always has somewhere to start,
    # even when the press touches the edge of the frame
    reach = np.ones((h + 2, w + 2), np.uint8)
    reach[1:-1, 1:-1] = 1 - rough
    # iterative dilation of the background seed, constrained to background pixels
    seed = np.zeros_like(reach)
    seed[0, :] = seed[-1, :] = 1
    seed[:, 0] = seed[:, -1] = 1
    for sy, sx in (seeds or []):
        seed[sy + 1, sx + 1] = 1
    seed &= reach
    while True:
        grown = seed.copy()
        grown[1:, :] |= seed[:-1, :]
        grown[:-1, :] |= seed[1:, :]
        grown[:, 1:] |= seed[:, :-1]
        grown[:, :-1] |= seed[:, 1:]
        grown &= reach
        if np.array_equal(grown, seed):
            break
        seed = grown
    solid = 1 - seed[1:-1, 1:-1]

    a = Image.fromarray((solid * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.1))
    return np.asarray(a).astype(np.float32)


def main(src_path: str) -> None:
    src = np.asarray(Image.open(src_path).convert("RGB")).astype(np.uint8)
    x0, y0, x1, y1 = BBOX
    scale = OUT_H / (y1 - y0)

    # --- frame: erase the platen assembly, re-run the posts through the gap ---
    # Matte the ORIGINAL, then carry the same row substitution into the alpha.
    # Matting afterwards fails: with the platen gone, the space between the two
    # posts is a CLOSED region the background flood cannot reach, so it comes
    # back opaque — a white slab across the middle of the press.
    src_alpha = alpha_from_luma(src, seeds=[WINDOW_SEED])
    frame = src.copy()
    frame[BEAM_BOTTOM:BASE_TOP] = src[CLEAN_ROW]
    frame_alpha = src_alpha.copy()
    frame_alpha[BEAM_BOTTOM:BASE_TOP] = src_alpha[CLEAN_ROW]

    frame_rgba = np.dstack([frame, frame_alpha]).astype(np.uint8)[y0:y1, x0:x1]
    fw = int(round((x1 - x0) * scale))
    frame_img = Image.fromarray(frame_rgba, "RGBA").resize((fw, OUT_H), Image.LANCZOS)
    frame_img.save("src/assets/press-frame.png")

    # --- rod: a plain threaded length, stretched by the component ------------
    ry0, ry1, rx0, rx1 = ROD
    rod = src[ry0:ry1, rx0:rx1]
    rod_rgba = np.dstack([rod, alpha_from_luma(rod)]).astype(np.uint8)
    rw = int(round((rx1 - rx0) * scale))
    Image.fromarray(rod_rgba, "RGBA").resize((rw, int(round((ry1 - ry0) * scale))), Image.LANCZOS) \
        .save("src/assets/press-rod.png")

    # --- head: collar + slab, cropped strictly between the posts -------------
    px0, px1 = POST_L[1] + 6, POST_R[0] - 6
    head = src[HEAD_TOP:PLATEN_BOTTOM, px0:px1]
    head_rgba = np.dstack([head, alpha_from_luma(head)]).astype(np.uint8)
    hw = int(round((px1 - px0) * scale))
    hh = int(round((PLATEN_BOTTOM - HEAD_TOP) * scale))
    Image.fromarray(head_rgba, "RGBA").resize((hw, hh), Image.LANCZOS) \
        .save("src/assets/press-head.png")

    # --- geometry BookPress.tsx needs, in output pixels ----------------------
    print(f"press-frame.png  {fw}x{OUT_H}")
    print(f"press-rod.png    {rw}x{int(round((ry1 - ry0) * scale))}")
    print(f"press-head.png   {hw}x{hh}")
    print()
    print("Constants for BookPress.tsx (output px; the component divides by 3):")
    print(f"  PRESS_W at H 135     {round(135 * fw / OUT_H)}   (frame aspect {fw / OUT_H:.4f})")
    print(f"  BEAM_BOTTOM          {round((BEAM_BOTTOM - y0) * scale)}")
    print(f"  ROD_LEFT             {round((rx0 - x0) * scale)}   ROD_W {rw}")
    print(f"  HEAD_LEFT            {round((px0 - x0) * scale)}   HEAD_W {hw}  HEAD_H {hh}")
    print(f"  HEAD_TOP at rest     {round((HEAD_TOP - y0) * scale)}")
    print(f"  BASE_TOP             {round((BASE_TOP - y0) * scale)}")
    print(f"  travel (slab->base)  {round((BASE_TOP - PLATEN_BOTTOM) * scale)}")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "press-empty.png")
