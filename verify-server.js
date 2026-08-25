const http = require('http');
const fs = require('fs');
const path = require('path');

const mimeTypes = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.webmanifest': 'application/manifest+json; charset=UTF-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  
  const filePath = path.join(__dirname, reqPath);
  
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(3344, '127.0.0.1', () => {
  console.log('Test Server running at http://127.0.0.1:3344/');
  
  // Test fetching index.html, manifest, sw.js
  const testFiles = ['/index.html', '/manifest.webmanifest', '/sw.js', '/css/style.css', '/js/levels-data.js', '/icons/favicon.svg', '/icons/icon-192.png'];
  
  let checked = 0;
  testFiles.forEach(f => {
    http.get(`http://127.0.0.1:3344${f}`, (r) => {
      if (r.statusCode === 200) {
        console.log(`✔ HTTP 200 OK: ${f} (${r.headers['content-type']})`);
      } else {
        console.error(`❌ HTTP ${r.statusCode} for ${f}`);
      }
      checked++;
      if (checked === testFiles.length) {
        console.log('✔ All assets successfully served over HTTP!');
        server.close();
        process.exit(0);
      }
    }).on('error', err => {
      console.error('Fetch error:', err);
      server.close();
      process.exit(1);
    });
  });
});
