"use client";

import { useEffect, useState } from 'react';

// Global flag to prevent multiple initializations across page navigations
let monitoringInitialized = false;

export default function AutoMonitoringInit() {
  const [monitoringStatus, setMonitoringStatus] = useState<{
    initialized: boolean;
    running: boolean;
    error?: string;
  }>({ initialized: false, running: false });

  useEffect(() => {
    // Skip if already initialized
    if (monitoringInitialized) {
      console.log('⏭️ Monitoring already initialized, skipping...');
      return;
    }

    // Initialize automatic monitoring when component mounts
    const initializeMonitoring = async () => {
      // Double-check in case of race condition
      if (monitoringInitialized) {
        return;
      }

      try {
        console.log('🚀 Initializing automatic monitoring system...');
        monitoringInitialized = true; // Set flag immediately to prevent duplicates
        
        const response = await fetch('/api/admin/diagnostics/init-monitoring', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        
        const result = await response.json();
        
        if (result.success) {
          console.log('✅ Automatic monitoring system initialized successfully');
          setMonitoringStatus({
            initialized: true,
            running: result.status.isRunning
          });
        } else {
          console.error('❌ Failed to initialize monitoring system:', result.error);
          monitoringInitialized = false; // Reset on failure so it can retry
          setMonitoringStatus({
            initialized: false,
            running: false,
            error: result.error
          });
        }
        
      } catch (error) {
        console.error('❌ Error initializing monitoring system:', error);
        monitoringInitialized = false; // Reset on error so it can retry
        setMonitoringStatus({
          initialized: false,
          running: false,
          error: 'Network error'
        });
      }
    };

    // Initialize monitoring after a short delay to ensure server is ready
    const timer = setTimeout(initializeMonitoring, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  // This component doesn't render anything visible
  // It just initializes the monitoring system
  return null;
}
