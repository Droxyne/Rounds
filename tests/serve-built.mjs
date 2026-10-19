import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root = path.resolve('dist'), prefix = '/Rounds/';
const mime = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2' };
http.createServer(async (request, response) => {
  const url = new URL(request.url, 'http://localhost');
  if (!url.pathname.startsWith(prefix)) { response.writeHead(404); response.end('Not found'); return; }
  const relative = decodeURIComponent(url.pathname.slice(prefix.length)) || 'index.html';
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep)) { response.writeHead(403); response.end(); return; }
  try { const body = await fs.readFile(file); response.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }); response.end(body); }
  catch { response.writeHead(404); response.end('Missing production asset'); }
}).listen(4173, '0.0.0.0', () => console.log('Production subdirectory test: http://0.0.0.0:4173/Rounds/'));
