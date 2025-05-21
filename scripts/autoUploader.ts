import { exec } from 'child_process';

function runUploader() {
  console.log('🚀 Running uploadSegmentedMp4.ts at', new Date().toLocaleTimeString());
  exec('npx tsx scripts/uploadSegmentedMp4.ts', (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Upload script error:', error.message);
      return;
    }
    if (stderr) console.error(stderr);
    console.log(stdout);
  });
}

// Run every 2 minutes
setInterval(runUploader, 2 * 60 * 1000);

// Run once immediately
runUploader();
