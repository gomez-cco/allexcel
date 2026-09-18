'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { composeAnswer, manual, guides } = require('./lib/engine');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function sendJSON(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

function serveStatic(req, res, pathname) {
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('No encontrado');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) { req.destroy(); reject(new Error('Payload demasiado grande')); }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  try {
    if (pathname === '/api/ask' && req.method === 'POST') {
      const raw = await readBody(req);
      let message = '';
      try { message = JSON.parse(raw || '{}').message || ''; } catch { message = ''; }
      const answer = composeAnswer(message);
      sendJSON(res, 200, { answer });
      return;
    }

    if (pathname === '/api/categories' && req.method === 'GET') {
      sendJSON(res, 200, {
        categories: manual.categories.map((c) => ({
          num: c.num,
          title: c.title,
          functions: c.functions.map((f) => f.name),
        })),
        guides: guides.map((g) => ({ id: g.id, titulo: g.titulo })),
      });
      return;
    }

    if (pathname.startsWith('/api/')) {
      sendJSON(res, 404, { error: 'Ruta no encontrada' });
      return;
    }

    serveStatic(req, res, pathname);
  } catch (err) {
    sendJSON(res, 500, { error: 'Error interno', detail: String(err && err.message || err) });
  }
});

server.listen(PORT, () => {
  console.log(`ALLEXCEL corriendo en http://localhost:${PORT}`);
});
