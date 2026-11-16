import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const sha256 = value => createHash('sha256').update(value).digest('hex');

export function parseOriginal(html) {
  const style = html.match(/<style>([\s\S]*?)<\/style>/)?.[1];
  const artBlock = html.match(/<script id="art">([\s\S]*?)<\/script>/)?.[1];
  const app = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)][0]?.[1];
  if (!style || !artBlock || !app) throw new Error('Unexpected upstream structure; no files changed.');
  const art = Object.fromEntries([...artBlock.matchAll(/^\s*(\w+): (\{.*\}),?\s*$/gm)].map(([, name, json]) => [name, JSON.parse(json)]));
  if (Object.keys(art).length !== 6) throw new Error('Expected six character rigs in the captured source.');
  return { style, artBlock, art, app };
}

export function parseArt(js) {
  const literal = js.match(/const ART = ([\s\S]*?);\s*$/)?.[1];
  if (!literal) throw new Error('src/art.js must end with a JSON-compatible const ART declaration.');
  return JSON.parse(literal);
}

export function parseCatalog(js) {
  const literal = js.match(/const CATALOG = ([\s\S]*?);\s*$/)?.[1];
  if (!literal) throw new Error('src/catalog.js must end with a JSON-compatible const CATALOG declaration.');
  return JSON.parse(literal);
}

export function mapStrings(value, transform, trail = []) {
  if (typeof value === 'string') return transform(value, trail);
  if (Array.isArray(value)) return value.map((entry, i) => mapStrings(entry, transform, [...trail, i]));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, mapStrings(entry, transform, [...trail, key])]));
  return value;
}

export async function loadOriginal() {
  const bytes = await readFile(new URL('../reference/original.html', import.meta.url));
  return { bytes, html: bytes.toString('utf8'), ...parseOriginal(bytes.toString('utf8')) };
}
