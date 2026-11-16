import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { Script } from 'node:vm';
import { root, loadOriginal, parseArt, parseCatalog, mapStrings, sha256 } from './source.mjs';

const { cardsForPack, drawCards, visualPackFor } = createRequire(import.meta.url)('../src/draw.js');
const original = await loadOriginal();
const capture = JSON.parse(await readFile(join(root, 'reference', 'capture.json'), 'utf8'));
assert.equal(sha256(original.bytes), capture.sha256, 'Captured source checksum changed');
console.log('PASS original snapshot checksum');

const index = await readFile(join(root, 'index.html'), 'utf8');
const css = await readFile(join(root, 'src', 'styles.css'), 'utf8');
const js = await readFile(join(root, 'src', 'app.js'), 'utf8');
const draw = await readFile(join(root, 'src', 'draw.js'), 'utf8');
const art = JSON.parse(await readFile(join(root, 'data', 'art.json'), 'utf8'));
const catalog = JSON.parse(await readFile(join(root, 'data', 'catalog.json'), 'utf8'));

for (const [name, items] of Object.entries({ types: catalog.types, packs: catalog.packs, cards: catalog.cards })) {
  assert.ok(items.length, `${name} cannot be empty`);
  assert.equal(new Set(items.map(item => item.id)).size, items.length, `${name} IDs must be unique`);
  assert.ok(items.every(item => typeof item.id === 'string' && item.id.length), `${name} needs IDs`);
}
const typeIds = new Set(catalog.types.map(type => type.id));
for (const card of catalog.cards) {
  assert.ok(typeIds.has(card.type), `${card.id} has an unknown type`);
  assert.ok(card.name && card.number, `${card.id} needs a name and number`);
  assert.equal(typeof card.description, 'string', `${card.id} needs an editable description`);
  assert.ok(card.image || (card.layers?.background && card.layers?.subject) || art[card.art], `Missing card artwork for ${card.id}`);
  if (card.layers) {
    assert.ok(card.layers.background && card.layers.subject, `${card.id} needs a complete background and transparent subject`);
    const background = await readFile(join(root, card.layers.background));
    const subject = await readFile(join(root, card.layers.subject));
    assert.equal(subject[25], 6, `${card.id} subject must be an RGBA PNG`);
    // CSS maps both complete canvases to the same card despite small generated size differences.
    for (const data of [subject, background]) {
      const w = data.readUInt32BE(16), h = data.readUInt32BE(20);
      assert.ok(w >= 1000 && h >= 1400 && Math.abs(w / h - 5 / 7) < .035, `${card.id} layers need high-resolution portrait canvases near 5:7`);
    }
    if (card.layerLayout) {
      const { scale, x, y } = card.layerLayout;
      assert.ok(scale > 0 && scale <= 1 && Number.isFinite(x) && Number.isFinite(y), `${card.id} has an invalid layer layout`);
    }
  }
}
for (const pack of catalog.packs) {
  assert.equal(pack.size, 5, 'The responsive layout currently expects five cards');
  assert.ok(pack.types.length && pack.types.every(type => typeIds.has(type)), `${pack.id} has invalid types`);
  const pool = cardsForPack(catalog, pack);
  assert.ok(pool.length && pool.every(card => pack.types.includes(card.type)), `${pack.id} has an invalid pool`);
  const repeated = drawCards(pool, pack.size, () => 0);
  assert.ok(repeated.every(card => card.id === pool[0].id), 'Independent draws must permit repeated cards');
}
const mixed = catalog.packs.find(pack => pack.types.length > 1);
assert.ok(mixed, 'Expected a mixed pack');
const mixedPool = cardsForPack(catalog, mixed);
for (const type of catalog.types) {
  const card = mixedPool.find(card => card.type === type.id);
  if (card) assert.equal(visualPackFor(catalog, mixed, Array(5).fill(card)).id, type.visualPack, `Mixed pack must use ${type.id} visuals when that type dominates`);
}
const positions = mixed.types.map(type => mixedPool.findIndex(card => card.type === type));
assert.ok(positions.every(position => position >= 0), 'Every mixed pack type needs an eligible card');
const draws = positions.map(position => (position + .5) / mixedPool.length);
assert.deepEqual(drawCards(mixedPool, draws.length, () => draws.shift()).map(card => card.type), mixed.types);
assert.throws(() => drawCards([], 5), /eligible card/);
console.log(`PASS ${catalog.cards.length} cards, pack type filters and independent draws with repeats`);

function jpegSize(data) {
  assert.equal(data.readUInt16BE(0), 0xffd8, 'Invalid JPEG header');
  let pos = 2;
  while (pos + 3 < data.length) {
    assert.equal(data[pos], 0xff, 'Invalid JPEG marker');
    while (data[pos] === 0xff) pos++;
    const marker = data[pos++];
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 1 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    const length = data.readUInt16BE(pos);
    assert.ok(length >= 2 && pos + length <= data.length, 'Invalid JPEG segment');
    if ([0xc0, 0xc1, 0xc2].includes(marker)) return [data.readUInt16BE(pos + 5), data.readUInt16BE(pos + 3)];
    pos += length;
  }
  throw new Error('JPEG frame dimensions not found');
}
const assets = new Map();
const paths = new Set();
const tarotPaths = new Set(catalog.cards.filter(card => card.type === 'tarot').map(card => card.image));
for (const data of [art, catalog]) mapStrings(data, value => { if (value.startsWith('assets/')) paths.add(value); return value; });
for (const path of paths) {
  assert.match(path, /^assets\/(?:[a-z0-9-]+\/)+[a-z0-9-]+\.(?:webp|jpg|png)$/, `Invalid asset path: ${path}`);
  const data = await readFile(join(root, path));
  let size;
  if (path.endsWith('.webp')) {
    assert.equal(data.toString('ascii', 0, 4), 'RIFF', `Invalid WebP: ${path}`);
    assert.equal(data.toString('ascii', 8, 12), 'WEBP', `Invalid WebP: ${path}`);
  } else if (path.endsWith('.png')) {
    assert.equal(data.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `Invalid PNG: ${path}`);
    size = [data.readUInt32BE(16), data.readUInt32BE(20)];
  } else {
    size = jpegSize(data);
  }
  if (tarotPaths.has(path)) assert.ok(size && size[0] * 7 === size[1] * 5, `${path} must be 5:7`);
  const mime = path.endsWith('.webp') ? 'image/webp' : path.endsWith('.png') ? 'image/png' : 'image/jpeg';
  assets.set(path, `data:${mime};base64,${data.toString('base64')}`);
}
console.log('PASS character assets and 5:7 tarot artwork');

for (const path of ['src/app.js', 'src/loader.js', 'src/draw.js', 'scripts/source.mjs', 'scripts/recover.mjs', 'scripts/build.mjs', 'scripts/serve.mjs', 'scripts/check.mjs']) {
  const result = spawnSync(process.execPath, ['--check', join(root, path)], { encoding: 'utf8' });
  assert.equal(result.status, 0, `${path}: ${result.stderr}`);
}
console.log('PASS JavaScript syntax');

assert.doesNotMatch(index, /cloudflareinsights|data-cf-beacon/);
assert.equal([...index.matchAll(/<script\b/g)].length, 2);
const bundle = await readFile(join(root, 'dist', 'index.html'), 'utf8');
const inline = [...bundle.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
assert.equal(inline.length, 4);
for (const script of inline) new Script(script);
assert.equal(inline[0], draw, 'Standalone draw logic differs');
assert.deepEqual(parseArt(inline[1]), mapStrings(art, value => assets.get(value) || value), 'Standalone character art differs');
assert.deepEqual(parseCatalog(inline[2]), mapStrings(catalog, value => assets.get(value) || value), 'Standalone card catalog differs');
assert.equal(inline[3], js, 'Standalone application differs');
assert.ok(bundle.includes(`<style>${css}</style>`), 'Standalone CSS differs');
assert.doesNotMatch(bundle, /<(?:script|link)\b[^>]+(?:src|href)=/);
assert.doesNotMatch(bundle, /cloudflareinsights|data-cf-beacon/);
const body = html => html.match(/<body>([\s\S]*?)<script/)?.[1].trim();
assert.equal(body(bundle), body(index), 'Standalone markup differs');
console.log('PASS standalone HTML matches source and embeds all artwork');
