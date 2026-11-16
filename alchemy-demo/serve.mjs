import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, relative, extname, sep } from 'node:path';

const root = await realpath(fileURLToPath(new URL('.', import.meta.url)));
const args = process.argv.slice(2), at = args.indexOf('--port');
const port = Number(at < 0 ? process.env.PORT || 4175 : args[at + 1]);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid port');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.jpg': 'image/jpeg' };
createServer(async (req, res) => {
  try {
    if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405, { Allow: 'GET, HEAD' }).end(); return; }
    const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replaceAll('\\', '/');
    const target = resolve(root, `.${name.endsWith('/') ? `${name}index.html` : name}`);
    const file = await realpath(target), rel = relative(root, file), info = await stat(file);
    if (rel.startsWith(`..${sep}`) || rel === '..' || rel.includes(':') || !info.isFile() || !types[extname(file)]) { res.writeHead(404).end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': types[extname(file)], 'Content-Length': info.size, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    if (req.method === 'HEAD') res.end(); else createReadStream(file).on('error', () => res.destroy()).pipe(res);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Arcana demo: http://127.0.0.1:${port}/`));
