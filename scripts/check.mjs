import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { Script } from 'node:vm';
import { root, loadOriginal, parseArt, mapStrings, sha256 } from './source.mjs';

const original = await loadOriginal();
const index = await readFile(join(root, 'index.html'), 'utf8');
const css = await readFile(join(root, 'src', 'styles.css'), 'utf8');
const js = await readFile(join(root, 'src', 'app.js'), 'utf8');
const localArt = parseArt(await readFile(join(root, 'src', 'art.js'), 'utf8'));
const capture = JSON.parse(await readFile(join(root, 'reference', 'capture.json'), 'utf8'));
assert.equal(sha256(original.bytes), capture.sha256, 'Captured source checksum changed');
assert.equal(css, original.style, 'CSS differs from original');
assert.equal(js, original.app, 'Application logic differs from original');
console.log('PASS original checksum, CSS and runtime preserved');

const assets = new Map();
mapStrings(localArt, value => { if (value.startsWith('assets/characters/')) assets.set(value, null); return value; });
for (const path of assets.keys()) {
  const data = await readFile(join(root, path));
  assert.equal(data.toString('ascii', 0, 4), 'RIFF', `Invalid WebP: ${path}`);
  assert.equal(data.toString('ascii', 8, 12), 'WEBP', `Invalid WebP header: ${path}`);
  assets.set(path, `data:image/webp;base64,${data.toString('base64')}`);
}
const restored = mapStrings(localArt, value => assets.get(value) || value);
assert.deepEqual(restored, original.art, 'Extracted images or rig coordinates differ from source');
console.log(`PASS ${assets.size} image files and all rig coordinates round-trip exactly`);

for (const path of ['src/app.js', 'src/art.js', 'scripts/source.mjs', 'scripts/recover.mjs', 'scripts/build.mjs', 'scripts/serve.mjs', 'scripts/check.mjs']) {
  const result = spawnSync(process.execPath, ['--check', join(root, path)], { encoding: 'utf8' });
  assert.equal(result.status, 0, `${path}: ${result.stderr}`);
}
console.log('PASS JavaScript syntax');

const body = html => html.match(/<body>([\s\S]*?)<script/)?.[1].trim();
assert.equal(body(index), body(original.html), 'Visible markup changed');
assert.doesNotMatch(index, /cloudflareinsights|data-cf-beacon/);
assert.equal([...index.matchAll(/<script\b/g)].length, 2);
console.log('PASS original page markup retained; analytics removed');

const bundle = await readFile(join(root, 'dist', 'index.html'), 'utf8');
const inline = [...bundle.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
assert.equal(inline.length, 2);
for (const script of inline) new Script(script);
assert.deepEqual(parseArt(inline[0]), original.art, 'Standalone artwork differs');
assert.equal(inline[1], js, 'Standalone application differs');
assert.ok(bundle.includes(`<style>${css}</style>`), 'Standalone CSS differs');
assert.doesNotMatch(bundle, /<(?:script|link)\b[^>]+(?:src|href)=/);
assert.doesNotMatch(bundle, /cloudflareinsights|data-cf-beacon/);
assert.equal(body(bundle), body(original.html));
console.log('PASS standalone HTML contains exact artwork, runtime and CSS, with no external scripts/styles');
