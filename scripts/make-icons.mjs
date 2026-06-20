// Sinh 3 lớp asset cho @capacitor/assets từ ảnh panda 1024 (resources/source-1024.png):
//  - icon-foreground.png: panda 68% (safe-zone adaptive), padding trong suốt
//  - icon-background.png: nền trắng đặc
//  - icon-only.png: panda 72% trên nền trắng (legacy + round không cắt panda)
// Chạy: node scripts/make-icons.mjs
import sharp from 'sharp';

const SRC = 'resources/source-1024.png';
const SIZE = 1024;
const TRANSPARENT = { r: 255, g: 255, b: 255, alpha: 0 };
const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

async function padded(scale, bg, out) {
  const t = Math.round(SIZE * scale);
  const off = Math.round((SIZE - t) / 2);
  const panda = await sharp(SRC)
    .resize(t, t, { fit: 'contain', background: TRANSPARENT })
    .toBuffer();
  await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: bg } })
    .composite([{ input: panda, left: off, top: off }])
    .png()
    .toFile(out);
  console.log('wrote', out, `(panda ${Math.round(scale * 100)}%)`);
}

await padded(0.68, TRANSPARENT, 'assets/icon-foreground.png');
await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: WHITE } })
  .png()
  .toFile('assets/icon-background.png');
console.log('wrote assets/icon-background.png (solid white)');
await padded(0.72, WHITE, 'assets/icon-only.png');
