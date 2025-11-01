// Automatic monitoring scheduler for Clearpoint Security
// This loads monitoring interval from settings

import { createClient } from "@supabase/supabase-js";

class MonitoringScheduler {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private currentIntervalMs = 10 * 60 * 1000; // Default: 10 minutes (low resource mode)
  private settingsCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    // DO NOT auto-start to prevent duplicates
    // Scheduler will be started explicitly via init-monitoring endpoint
  }

  private async loadIntervalFromSettings(): Promise<number> {
    try {
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'monitoring_interval_minutes')
        .single();

      if (data?.setting_value) {
        const minutes = parseInt(data.setting_value, 10);
        return minutes * 60 * 1000; // Convert to milliseconds
      }
    } catch (error) {
      console.error('⚠️ [SCHEDULER] Failed to load interval from settings, using default:', error);
    }

    return 10 * 60 * 1000; // Default: 10 minutes
  }

  async start() {
    if (this.isRunning) {
      console.log('🤖 [SCHEDULER] Monitoring scheduler already running');
      return;
    }

    // Load interval from settings
    this.currentIntervalMs = await this.loadIntervalFromSettings();
    const intervalMinutes = this.currentIntervalMs / (60 * 1000);
    
    console.log(`🚀 [SCHEDULER] Starting automatic monitoring scheduler (every ${intervalMinutes} minutes)`);
    
    // Run immediately on start
    this.runMonitoring();
    
    // Then run at configured interval
    this.intervalId = setInterval(() => {
      this.runMonitoring();
    }, this.currentIntervalMs);
    
    // Check for settings changes every 5 minutes
    this.settingsCheckInterval = setInterval(async () => {
      await this.checkAndUpdateInterval();
    }, 5 * 60 * 1000);
    
    this.isRunning = true;
  }

  private async checkAndUpdateInterval() {
    const newIntervalMs = await this.loadIntervalFromSettings();
    
    if (newIntervalMs !== this.currentIntervalMs) {
      console.log(`🔄 [SCHEDULER] Interval changed from ${this.currentIntervalMs / 60000} to ${newIntervalMs / 60000} minutes - restarting scheduler`);
      this.stop();
      await this.start();
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.settingsCheckInterval) {
      clearInterval(this.settingsCheckInterval);
      this.settingsCheckInterval = null;
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
      intervalMinutes: this.currentIntervalMs / (60 * 1000),
      nextRun: this.intervalId ? new Date(Date.now() + this.currentIntervalMs).toISOString() : null
    };
  }
}

// Create singleton instance
const monitoringScheduler = new MonitoringScheduler();

export default monitoringScheduler;
