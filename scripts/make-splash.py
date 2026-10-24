#!/usr/bin/env python3
"""Draw the cream splash with the panda badge (spec 2026-10-24-mo-cua-tu-sach §5.6).

One-off asset generator: run only when the icon changes. Needs Pillow (NOT a repo dep; use a
throwaway venv, as for make-press-sprites.py).

    python3 scripts/make-splash.py

Why not `npx @capacitor/assets generate`: it also rewrites the launcher icons and
mipmap-anydpi-v26/ic_launcher.xml, which is hand-tuned (no extra inset on a pre-padded
foreground). This script touches only the splash files.

Writes WebP (lossy, alpha where needed) to keep the APK small; minSdk 24 reads it:
  res/drawable-nodpi/splash_icon.webp  864 x 864 (288 dp at xxhdpi), transparent, the badge inside
                                       the inner two-thirds circle Android 12+ keeps (192 dp
                                       visible). Used by windowSplashScreenAnimatedIcon.
  res/drawable*/splash.webp            one per drawable*/splash.* already there (same size),
                                       cream #E9E5CD with the badge centred at 30% of the short
                                       side (pre-Android 12). An old splash.png is replaced.
  public/splash-badge.webp             480 x 480 badge, transparent corners. On a cold start the
                                       system splash ends at the activity's first (cream) frame
                                       while the WebView still boots for about 0.8 s (UBS1), so
                                       index.html and the doors' cover draw this badge instead.
The badge is the white square of assets/icon-foreground.png (the app icon) cut to a circle.
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
RES = ROOT / 'android/app/src/main/res'
CREAM = (233, 229, 205, 255)
SQUARE = (164, 164, 860, 860)  # opaque white square of icon-foreground.png (measured: alpha > 250)


def badge(size: int) -> Image.Image:
    art = Image.open(ROOT / 'assets/icon-foreground.png').convert('RGBA').crop(SQUARE)
    art = art.resize((size, size), Image.LANCZOS)
    mask = Image.new('L', (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
    art.putalpha(mask.resize((size, size), Image.LANCZOS))
    return art


def main() -> None:
    icon = Image.new('RGBA', (864, 864), (0, 0, 0, 0))
    icon.alpha_composite(badge(576), ((864 - 576) // 2, (864 - 576) // 2))
    out = RES / 'drawable-nodpi/splash_icon.webp'
    out.parent.mkdir(exist_ok=True)
    icon.save(out, quality=88, method=6)
    print(out.relative_to(ROOT), icon.size, out.stat().st_size)

    web = ROOT / 'public/splash-badge.webp'
    badge(480).save(web, quality=88, method=6)
    print(web.relative_to(ROOT), (480, 480), web.stat().st_size)

    for f in sorted(RES.glob('drawable*/splash.*')):
        w, h = Image.open(f).size
        d = round(min(w, h) * 0.30)
        img = Image.new('RGBA', (w, h), CREAM)
        img.alpha_composite(badge(d), ((w - d) // 2, (h - d) // 2))
        webp = f.with_suffix('.webp')
        img.convert('RGB').save(webp, quality=85, method=6)
        if f != webp:
            f.unlink()
        print(webp.relative_to(ROOT), (w, h), webp.stat().st_size)


if __name__ == '__main__':
    main()
