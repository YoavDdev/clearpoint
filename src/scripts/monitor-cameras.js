// Simple script to monitor cameras and trigger alerts
// Run this with: node src/scripts/monitor-cameras.js

const https = require('https');
const http = require('http');

// Configuration
const MONITOR_INTERVAL = 60000; // Check every minute
const API_URL = 'http://localhost:3000/api/admin/diagnostics/monitor';

console.log('🔍 Starting camera monitoring service...');
console.log(`📡 Will check cameras every ${MONITOR_INTERVAL/1000} seconds`);

// Function to call the monitoring endpoint
function checkCameras() {
  console.log(`⏱️ Running camera check at ${new Date().toLocaleTimeString()}`);
  
  const req = http.request(API_URL, {
    method: 'POST',
  }, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      try {
        const result = JSON.parse(data);
        console.log(`✅ Check complete: ${result.alertsCreated} alerts created, ${result.notificationsSent} notifications sent`);
      } catch (error) {
        console.error('❌ Error parsing response:', error);
      }
    });
  });
  
  req.on('error', (error) => {
    console.error('❌ Error calling monitoring endpoint:', error);
  });
  
  req.end();
}

// Run immediately on startup
checkCameras();

// Then run on the specified interval
setInterval(checkCameras, MONITOR_INTERVAL);

console.log('🟢 Monitoring service running. Press Ctrl+C to stop.');
