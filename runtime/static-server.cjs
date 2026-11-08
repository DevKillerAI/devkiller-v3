const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = '/app/public';
// Enforce the time limit even if the control panel is closed unexpectedly.
setTimeout(() => process.exit(0), 30 * 60 * 1000).unref();
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.svg':'image/svg+xml','.txt':'text/plain; charset=utf-8'};
http.createServer(async (req, res) => {
  try {
    if (!['GET','HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
    const url = new URL(req.url, 'http://localhost');
    const name = decodeURIComponent(url.pathname) === '/' ? '/index.html' : decodeURIComponent(url.pathname);
    const file = path.resolve(root, '.' + name);
    if (!file.startsWith(root + '/')) { res.writeHead(403).end(); return; }
    if(name.split('/').includes('backend')){res.writeHead(404).end();return;}
    let actual=file;try{if((await fs.stat(actual)).isDirectory())actual=path.join(actual,'index.html');}catch{if(!path.extname(name))actual=path.join(root,'index.html');}
    const body = await fs.readFile(actual);
    res.writeHead(200, {'Content-Type': types[path.extname(actual)] || 'application/octet-stream', 'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(404).end('Arquivo não encontrado'); }
}).listen(8080, '0.0.0.0');
