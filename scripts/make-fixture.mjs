// Sinh kho mẫu nhiều tầng để test M2. KHÔNG dùng kho thật của Gú.
// Chạy: node scripts/make-fixture.mjs ./fixture-kho
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const root = process.argv[2] ?? './fixture-kho';
rmSync(root, { recursive: true, force: true });

const dir = (...p) => { const d = join(root, ...p); mkdirSync(d, { recursive: true }); return d; };
const pdf = (d, base) => writeFileSync(join(d, base + '.pdf'), '%PDF-1.4\n% fixture\n');
const json = (d, base) => writeFileSync(join(d, base + '.json'),
  JSON.stringify({ name: base, pages: [], structure: [] }, null, 2));
const doc = (d, base) => { pdf(d, base); json(d, base); };
const src = (d, file) => writeFileSync(join(d, file), 'fixture source');
const mon = (d, obj) => writeFileSync(join(d, '_mon.json'), JSON.stringify(obj, null, 2));

const m1 = dir('Tố tụng Hình sự');
mon(m1, { color: '#75420E', order: 1 });
doc(m1, 'tong-quan');
const m1c1 = dir('Tố tụng Hình sự', 'Chương 1');
doc(m1c1, 'slide-buoi-1');
const m1c1b = dir('Tố tụng Hình sự', 'Chương 1', 'Buổi 2');
doc(m1c1b, 'slide-buoi-2');
src(m1c1b, 'bai-tap.docx');

const m2 = dir('Luật Công chứng');
mon(m2, { order: 2 });
doc(m2, 'luat-cong-chung-2024');

const m3 = dir('Aa Dân sự');
doc(m3, 'giao-trinh');
src(m3, 'de-cuong.pptx');

dir('_inbox');
dir('_print');

console.log('Fixture created at', root);
