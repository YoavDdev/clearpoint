import { exec } from 'child_process';
import fs from 'fs';

const LOG_FILE = './upload-log.txt';
let isRunning = false;

function timestamp() {
  return new Date().toISOString();
}

function log(message: string) {
  const full = `[${timestamp()}] ${message}`;
  console.log(full);
  fs.appendFileSync(LOG_FILE, full + '\n');
}

function runUploader() {
  if (isRunning) {
    log('⚠️ Previous run still active. Skipping this cycle.');
    return;
  }

  isRunning = true;
  log('🚀 Running uploadSegmentedMp4.ts');

  exec('npx tsx scripts/uploadSegmentedMp4.ts', (error, stdout, stderr) => {
    if (error) {
      log(`❌ Upload script error: ${error.message}`);
    }
    if (stderr) {
      log(`⚠️ STDERR: ${stderr}`);
    }
    if (stdout) {
      log(`✅ STDOUT:\n${stdout}`);
    }
    isRunning = false;
  });
}

// Run once on startup
runUploader();

// Then every 2 minutes
setInterval(runUploader, 2 * 60 * 1000);
