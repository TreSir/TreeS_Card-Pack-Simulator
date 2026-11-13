import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { root, sha256, loadOriginal, mapStrings } from './source.mjs';

// Rebuild the editable project from the preserved response, without network access.
const { bytes, html, style, artBlock, art, app } = await loadOriginal();
await mkdir(join(root, 'src'), { recursive: true });
await mkdir(join(root, 'assets', 'characters'), { recursive: true });
const images = new Map();
const localArt = mapStrings(art, (value, trail) => {
  const match = value.match(/^data:image\/(webp|png);base64,([A-Za-z\d+/=]+)$/);
  if (!match) return value;
  const buffer = Buffer.from(match[2], 'base64');
  const hash = sha256(buffer);
  if (!images.has(hash)) {
    const role = trail.slice(1).filter((part, i, parts) => !(part === 3 && i === parts.length - 1)).join('-');
    images.set(hash, { path: `assets/characters/${trail[0]}-${role}.${match[1]}`, buffer });
  }
  return images.get(hash).path;
});
for (const image of images.values()) await writeFile(join(root, image.path), image.buffer);

const analytics = /<script\b[^>]*\bsrc="https:\/\/static\.cloudflareinsights\.com\/[^>]*><\/script>\s*/g;
const index = html
  .replace(`<style>${style}</style>`, '<link rel="stylesheet" href="src/styles.css">')
  .replace(`<script id="art">${artBlock}</script>`, '<script defer src="src/art.js"></script>')
  .replace(`<script>${app}</script>`, '<script defer src="src/app.js"></script>')
  .replace(analytics, '');
await writeFile(join(root, 'index.html'), index);
await writeFile(join(root, 'src', 'styles.css'), style);
await writeFile(join(root, 'src', 'app.js'), app);
await writeFile(join(root, 'src', 'art.js'), `/* Original character art and rig coordinates recovered from https://holo.yashb.xyz/. */\nconst ART = ${JSON.stringify(localArt, null, 2)};\n`);

const capturePath = join(root, 'reference', 'capture.json');
let capturedAt;
try { capturedAt = JSON.parse(await readFile(capturePath, 'utf8')).captured_at; } catch {}
await writeFile(capturePath, JSON.stringify({
  source_url: 'https://holo.yashb.xyz/',
  captured_at: capturedAt || new Date().toISOString(),
  response_bytes: bytes.length,
  sha256: sha256(bytes),
  characters: Object.keys(art),
  extracted_images: images.size,
  image_bytes: [...images.values()].reduce((total, image) => total + image.buffer.length, 0),
  transformations: [
    'Preserve original response in reference/original.html',
    'Extract inline CSS and application JavaScript without changing their contents',
    'Decode embedded character artwork into byte-identical local images',
    'Remove the Cloudflare analytics beacon from the runnable copy'
  ]
}, null, 2) + '\n');
console.log(`Recovered ${Object.keys(art).length} character rigs and ${images.size} unique images.`);
console.log(`Original response: ${bytes.length} bytes; SHA-256 ${sha256(bytes)}`);
