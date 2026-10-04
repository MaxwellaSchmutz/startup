// Minimal static file server for a Vite/React build, run on the production
// server under PM2 (one process per site, e.g. "simon" on 3000 and "startup"
// on 4000). Caddy terminates HTTPS and reverse-proxies to it.
//
// Lives at ~/services/<service>/staticServer.cjs next to the public/ folder
// that deployReact.sh fills. Uses only Node's built-in modules, so nothing has
// to be installed on the server. The Service deliverable will replace it with
// an Express backend that serves public/ the same way.
//
//   pm2 start staticServer.cjs --name startup -- 4000

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const port = Number(process.argv[2] || process.env.PORT || 3000);
const root = path.join(__dirname, 'public');

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wasm': 'application/wasm', // needed for WebAssembly streaming compile (Stockfish)
  '.woff2': 'font/woff2',
};

function sendFile(res, filePath, method) {
  const ext = path.extname(filePath).toLowerCase();
  const headers = { 'Content-Type': contentTypes[ext] || 'application/octet-stream' };
  // Vite puts content-hashed bundles in /assets, so they never change
  headers['Cache-Control'] = filePath.startsWith(path.join(root, 'assets'))
    ? 'public, max-age=31536000, immutable'
    : 'no-cache';

  fs.stat(filePath, (err, stats) => {
    if (err) return sendError(res, 500);
    headers['Content-Length'] = stats.size;
    res.writeHead(200, headers);
    if (method === 'HEAD') return res.end();
    fs.createReadStream(filePath).pipe(res);
  });
}

function sendError(res, status) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(status === 404 ? 'Not found' : 'Error');
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { Allow: 'GET, HEAD' });
    return res.end();
  }

  let urlPath;
  try {
    urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  } catch {
    return sendError(res, 400);
  }

  // Resolve inside public/ only; "/../" tricks fall back to index.html.
  const filePath = path.join(root, path.normalize(urlPath));
  const insideRoot = filePath === root || filePath.startsWith(root + path.sep);

  fs.stat(filePath, (err, stats) => {
    if (insideRoot && !err && stats.isFile()) {
      return sendFile(res, filePath, req.method);
    }
    // A missing file with an extension (e.g. /missing.png) is a real 404.
    // Anything else is a client-side route like /play: serve the SPA.
    if (path.extname(urlPath)) return sendError(res, 404);
    sendFile(res, path.join(root, 'index.html'), req.method);
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Serving ${root} on http://127.0.0.1:${port}`);
});
