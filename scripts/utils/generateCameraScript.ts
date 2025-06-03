import fs from 'fs';
import path from 'path';

export function generateCameraScript(userId: string, cameraId: string, rtspUrl: string) {
  const script = `#!/bin/bash

# ==== Camera Info ====
USER_ID="${userId}"
CAMERA_ID="${cameraId}"
RTSP_URL="${rtspUrl}"

# ==== Folder Paths ====
BASE_DIR=~/clearpoint-recordings/$USER_ID
FOOTAGE_DIR=$BASE_DIR/footage/$CAMERA_ID
LIVE_DIR=$BASE_DIR/live/$CAMERA_ID

mkdir -p "$FOOTAGE_DIR"
mkdir -p "$LIVE_DIR"

# ==== VOD Recording ====
echo "📼 Starting VOD recording..."
ffmpeg -rtsp_transport tcp -i "$RTSP_URL" \\
  -c:v copy -c:a aac \\
  -f segment \\
  -segment_time 900 \\
  -reset_timestamps 1 \\
  -strftime 1 \\
  "$FOOTAGE_DIR/%Y-%m-%d_%H-%M-%S.mp4" > /dev/null 2>&1 &

# ==== Live Streaming (HLS) ====
echo "🔴 Starting live stream..."
ffmpeg -rtsp_transport tcp -i "$RTSP_URL" \\
  -c copy \\
  -f hls \\
  -hls_time 1 \\
  -hls_list_size 3 \\
  -hls_flags delete_segments \\
  -hls_segment_filename "$LIVE_DIR/stream-%03d.ts" \\
  "$LIVE_DIR/stream.m3u8" > /dev/null 2>&1 &

echo "✅ Camera started: $CAMERA_ID"
`;

  const outputDir = path.resolve(process.cwd(), 'camera_scripts');
  const outputPath = path.join(outputDir, `${cameraId}.sh`);

  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, script, { mode: 0o755 });

  return outputPath;
}
