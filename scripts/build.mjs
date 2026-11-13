import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { root, parseArt, mapStrings } from './source.mjs';

const index = await readFile(join(root, 'index.html'), 'utf8');
const css = await readFile(join(root, 'src', 'styles.css'), 'utf8');
const js = await readFile(join(root, 'src', 'app.js'), 'utf8');
const art = parseArt(await readFile(join(root, 'src', 'art.js'), 'utf8'));
const images = new Map();
mapStrings(art, value => { if (value.startsWith('assets/characters/')) images.set(value, null); return value; });
for (const path of images.keys()) {
  const data = await readFile(join(root, path));
  const mime = path.endsWith('.webp') ? 'image/webp' : 'image/png';
  images.set(path, `data:${mime};base64,${data.toString('base64')}`);
}
const inlineArt = mapStrings(art, value => images.get(value) || value);
const script = source => `<script>${source.replace(/<\/script/gi, '<\\/script')}</script>`;
const output = index
  .replace('<link rel="stylesheet" href="src/styles.css">', () => `<style>${css}</style>`)
  .replace('<script defer src="src/art.js"></script>', () => script(`const ART = ${JSON.stringify(inlineArt)};`))
  .replace('<script defer src="src/app.js"></script>', () => script(js));
if (output === index || /(?:src|href)="(?:src|assets)\//.test(output)) throw new Error('Build still has local file dependencies.');
await mkdir(join(root, 'dist'), { recursive: true });
await writeFile(join(root, 'dist', 'index.html'), output);
console.log(`Built dist/index.html (${Buffer.byteLength(output)} bytes, self-contained and offline-ready).`);
