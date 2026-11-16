import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';
import { root } from './source.mjs';

const args = process.argv.slice(2);
const at = args.indexOf('--port');
const requested = Number(at < 0 ? process.env.PORT || 4173 : args[at + 1]);
if (!Number.isInteger(requested) || requested < 1024 || requested > 65535) throw new Error('Port must be an integer between 1024 and 65535.');
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
const base = await realpath(root);

const server = createServer(async (req, res) => {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405, { Allow: 'GET, HEAD' }).end(); return; }
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replaceAll('\\', '/');
    if (pathname.endsWith('/')) pathname += 'index.html';
    const name = pathname.slice(1);
    if (!(name === 'index.html' || name === 'reference/original.html' || /^(src|data|assets|dist)\//.test(name))) { res.writeHead(404).end('Not found'); return; }
    const file = resolve(join(base, name));
    const within = path => { const rel = relative(base, path); return rel !== '..' && !rel.startsWith(`..${sep}`) && !rel.includes(':'); };
    if (!within(file) || !within(await realpath(file))) { res.writeHead(403).end('Forbidden'); return; }
    const info = await stat(file);
    if (!info.isFile() || !mime[extname(file)]) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': mime[extname(file)], 'Content-Length': info.size, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    if (req.method === 'HEAD') res.end();
    else { const stream = createReadStream(file); stream.on('error', () => res.destroy()); stream.pipe(res); }
  } catch { res.writeHead(404).end('Not found'); }
});

let port = requested;
server.on('error', error => {
  if (error.code === 'EADDRINUSE' && at < 0 && port < Math.min(requested + 10, 65535)) { server.listen(++port, '127.0.0.1'); return; }
  console.error(error.message); process.exitCode = 1;
});
server.on('listening', () => {
  console.log(`holo local: http://127.0.0.1:${port}/`);
  console.log(`Offline build: http://127.0.0.1:${port}/dist/`);
  console.log('Press Ctrl+C to stop.');
});
server.listen(port, '127.0.0.1');
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close());
