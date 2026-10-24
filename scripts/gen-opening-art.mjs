#!/usr/bin/env node
// Generate source art for the opening doors through OpenRouter (spec 2026-10-24-mo-cua-tu-sach §6).
//
// One-off tool, run by hand when the art changes. No dependencies: Node 18+ fetch.
//
//   node scripts/gen-opening-art.mjs --model google/gemini-nano-banana-2.1 \
//     --prompt scripts/opening-art/door.txt --name door --n 2 --aspect 9:16 \
//     --out ~/Dev/art/gu-library/opening [--ref resources/source-1024.png]
//
// Writes <out>/<name>-<model-slug>-<k>.png and keeps a running total in <out>/spend.json; refuses
// to start once that total reaches SPEND_CAP_USD. The key comes only from OPENROUTER_API_KEY and is
// never printed. Source images stay outside the repo (public): only the cut WebP files are committed.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';

const SPEND_CAP_USD = 3;
const ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

function args(argv) {
  const out = { n: 1 };
  for (let i = 0; i < argv.length; i += 2) {
    const k = argv[i].replace(/^--/, '');
    out[k] = argv[i + 1];
  }
  out.n = Number(out.n);
  for (const k of ['model', 'prompt', 'name', 'out']) {
    if (!out[k]) throw new Error(`missing --${k}`);
  }
  out.out = resolve(out.out.replace(/^~(?=\/)/, homedir()));
  return out;
}

async function readSpend(file) {
  if (!existsSync(file)) return { total: 0, calls: [] };
  return JSON.parse(await readFile(file, 'utf8'));
}

async function main() {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error('OPENROUTER_API_KEY is not set');
  const a = args(process.argv.slice(2));
  await mkdir(a.out, { recursive: true });
  const spendFile = join(a.out, 'spend.json');
  const spend = await readSpend(spendFile);

  const prompt = (await readFile(a.prompt, 'utf8')).trim();
  const content = [{ type: 'text', text: prompt }];
  if (a.ref) {
    const b64 = (await readFile(a.ref)).toString('base64');
    content.push({ type: 'image_url', image_url: { url: `data:image/png;base64,${b64}` } });
  }
  const slug = a.model.replace(/[^a-z0-9.]+/gi, '-');

  for (let k = 1; k <= a.n; k++) {
    if (spend.total >= SPEND_CAP_USD) {
      throw new Error(`spend cap reached: ${spend.total.toFixed(4)} USD of ${SPEND_CAP_USD}`);
    }
    const body = {
      model: a.model,
      messages: [{ role: 'user', content }],
      modalities: ['image', 'text'],
      usage: { include: true },
      ...(a.aspect ? { image_config: { aspect_ratio: a.aspect } } : {}),
    };
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${JSON.stringify(json.error ?? json).slice(0, 400)}`);

    const cost = Number(json.usage?.cost ?? 0);
    spend.total += cost;
    spend.calls.push({ at: new Date().toISOString(), model: a.model, name: a.name, cost });
    await writeFile(spendFile, JSON.stringify(spend, null, 2));

    const images = json.choices?.[0]?.message?.images ?? [];
    if (images.length === 0) {
      const text = json.choices?.[0]?.message?.content ?? '';
      console.log(`#${k}: no image returned (${String(text).slice(0, 200)}), cost ${cost.toFixed(4)} USD`);
      continue;
    }
    for (const [j, img] of images.entries()) {
      const url = img.image_url?.url ?? '';
      const m = /^data:image\/(\w+);base64,(.+)$/.exec(url);
      if (!m) { console.log(`#${k}.${j}: unexpected image payload`); continue; }
      const file = join(a.out, `${a.name}-${slug}-${k}${images.length > 1 ? `-${j}` : ''}.${m[1] === 'jpeg' ? 'jpg' : m[1]}`);
      await writeFile(file, Buffer.from(m[2], 'base64'));
      console.log(`#${k}: ${file}`);
    }
    console.log(`#${k}: cost ${cost.toFixed(4)} USD, total ${spend.total.toFixed(4)} USD`);
  }
}

main().catch((err) => { console.error(String(err.message ?? err)); process.exit(1); });
