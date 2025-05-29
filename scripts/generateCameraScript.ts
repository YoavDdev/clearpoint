import fs from 'fs';
import path from 'path';

// Get args from command line
const [USER_ID, CAMERA_ID, RTSP_URL] = process.argv.slice(2);

if (!USER_ID || !CAMERA_ID || !RTSP_URL) {
  console.error("❌ Usage: ts-node generateCameraScript.ts <USER_ID> <CAMERA_ID> <RTSP_URL>");
  process.exit(1);
}

const BASE_DIR = `~/clearpoint-recordings/${USER_ID}`;
const FOOTAGE_DIR = `${BASE_DIR}/footage/${CAMERA_ID}`;
const LIVE_DIR = `${BASE_DIR}/live/${CAMERA_ID}`;

const scriptContent = `#!/bin/bash

# ==== Camera Info ====
USER_ID="${USER_ID}"
CAMERA_ID="${CAMERA_ID}"
RTSP_URL="${RTSP_URL}"

# ==== Folder Paths ====
BASE_DIR=~/clearpoint-recordings/\${USER_ID}
FOOTAGE_DIR=\${BASE_DIR}/footage/\${CAMERA_ID}
LIVE_DIR=\${BASE_DIR}/live/\${CAMERA_ID}

mkdir -p "\${FOOTAGE_DIR}"
mkdir -p "\${LIVE_DIR}"

echo "📂 Folders created:"
echo "  - \${FOOTAGE_DIR}"
echo "  - \${LIVE_DIR}"

# ==== VOD Recording ====
echo "🎥 Starting VOD recording..."
ffmpeg -rtsp_transport tcp -i "\${RTSP_URL}" \\
  -c:v copy -c:a aac -f segment -segment_time 900 -reset_timestamps 1 -strftime 1 \\
  "\${FOOTAGE_DIR}/%Y-%m-%d_%H-%M-%S.mp4" > /dev/null 2>&1 &

# ==== Live Streaming ====
echo "🔴 Starting live stream..."
ffmpeg -rtsp_transport tcp -i "\${RTSP_URL}" \\
  -c copy -f hls -hls_time 2 -hls_list_size 5 -hls_flags delete_segments+append_list \\
  -hls_segment_filename "\${LIVE_DIR}/stream-%03d.ts" \\
  "\${LIVE_DIR}/stream.m3u8" > /dev/null 2>&1 &

echo "✅ FFmpeg processes running in background."
`;

const outputPath = path.resolve(`./camera_scripts/${CAMERA_ID}.sh`);
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, scriptContent, { mode: 0o755 });

console.log(`✅ Script created at: ${outputPath}`);
