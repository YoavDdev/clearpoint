// Automatic monitoring scheduler for Clearpoint Security
// This runs background monitoring every 5 minutes

class MonitoringScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private readonly MONITOR_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Auto-start when the module is loaded (server-side)
    if (typeof window === 'undefined') {
      this.start();
    }
  }

  start() {
    if (this.isRunning) {
      console.log('🤖 [SCHEDULER] Monitoring scheduler already running');
      return;
    }

    console.log('🚀 [SCHEDULER] Starting automatic monitoring scheduler (every 5 minutes)');
    
    // Run immediately on start
    this.runMonitoring();
    
    // Then run every 5 minutes
    this.intervalId = setInterval(() => {
      this.runMonitoring();
    }, this.MONITOR_INTERVAL);
    
    this.isRunning = true;
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('⏹️ [SCHEDULER] Monitoring scheduler stopped');
  }

  private async runMonitoring() {
    try {
      console.log(`🔍 [SCHEDULER] Running automatic monitoring at ${new Date().toISOString()}`);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/admin/diagnostics/auto-monitor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('✅ [SCHEDULER] Automatic monitoring completed successfully');
      } else {
        console.error('❌ [SCHEDULER] Automatic monitoring failed:', result.error);
      }
      
    } catch (error) {
      console.error('❌ [SCHEDULER] Error in automatic monitoring:', error);
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalMinutes: this.MONITOR_INTERVAL / (60 * 1000),
      nextRun: this.intervalId ? new Date(Date.now() + this.MONITOR_INTERVAL).toISOString() : null
    };
  }
}

// Create singleton instance
const monitoringScheduler = new MonitoringScheduler();

export default monitoringScheduler;
