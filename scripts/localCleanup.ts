import fs from 'fs';
import path from 'path';

const RECORDINGS_PATH = '/path/to/local/recordings'; // adjust per device
const RETENTION_DAYS = 7; // or 14, set per device plan

function deleteOldFiles(dir: string, retentionDays: number) {
  if (!fs.existsSync(dir)) return;

  const now = Date.now();
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);
    const ageInDays = (now - stats.mtimeMs) / (1000 * 60 * 60 * 24);

    if (ageInDays > retentionDays) {
      try {
        fs.unlinkSync(filePath);
        console.log(`🧹 Deleted local file: ${filePath}`);
      } catch (error) {
        console.error(`❌ Failed to delete ${filePath}:`, error);
      }
    }
  });
}

deleteOldFiles(RECORDINGS_PATH, RETENTION_DAYS);
