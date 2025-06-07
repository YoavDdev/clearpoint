const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 8080;

// === Find user ID directory under /mnt/ram-ts ===
const baseDir = '/mnt/ram-ts';
const userDirs = fs.readdirSync(baseDir).filter((name) =>
  fs.statSync(path.join(baseDir, name)).isDirectory()
);

if (userDirs.length === 0) {
  console.error('❌ ERROR: No user folder found in /mnt/ram-ts');
  process.exit(1);
}

const USER_ID = userDirs[0];
const LIVE_DIR = path.join(baseDir, USER_ID, 'live');

// === CORS + No Cache Headers ===
app.use(cors());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

app.use(express.static(LIVE_DIR));

app.listen(PORT, () => {
  console.log(`🚀 Live stream server running at http://localhost:${PORT}`);
  console.log(`📂 Serving from ${LIVE_DIR}`);
});
