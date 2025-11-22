const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = 8080;
const APK_PATH = path.join(__dirname, '../android/app/build/outputs/apk/debug/app-debug.apk');

// Get local IP address
function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const server = http.createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);

  if (req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`
<!DOCTYPE html>
<html>
<head>
    <title>Download Snowball APK</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: system-ui, -apple-system, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f0f2f5; color: #333; }
        .card { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 10px 25px rgba(0,0,0,0.1); text-align: center; max-width: 90%; width: 400px; }
        .btn { display: block; background: #2196f3; color: white; padding: 1.2rem; text-decoration: none; border-radius: 0.75rem; font-weight: 600; font-size: 1.1rem; margin-top: 1.5rem; transition: transform 0.1s, background 0.2s; }
        .btn:active { transform: scale(0.98); }
        .btn:hover { background: #1976d2; }
        h1 { margin: 0 0 0.5rem 0; font-size: 1.5rem; }
        p { margin: 0; color: #666; }
        .icon { font-size: 3rem; margin-bottom: 1rem; display: block; }
    </style>
</head>
<body>
    <div class="card">
        <span class="icon">📱</span>
        <h1>Snowball Task Manager</h1>
        <p>Latest Android Debug Build</p>
        <a href="/app-debug.apk" class="btn">Download APK</a>
    </div>
</body>
</html>
    `);
  } else if (req.url === '/app-debug.apk') {
    if (fs.existsSync(APK_PATH)) {
      const stat = fs.statSync(APK_PATH);
      res.writeHead(200, {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Length': stat.size,
        'Content-Disposition': 'attachment; filename=snowball-debug.apk'
      });
      const readStream = fs.createReadStream(APK_PATH);
      readStream.pipe(res);
    } else {
      res.writeHead(404);
      res.end('APK file not found. Please run "npm run android:build" first.');
    }
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

server.listen(PORT, () => {
  const ip = getLocalIp();
  console.log('\n🚀 APK Download Server Running!');
  console.log(`\n📲 Open this URL on your Android device:\n   http://${ip}:${PORT}\n`);
  console.log(`Local: http://localhost:${PORT}`);
});
