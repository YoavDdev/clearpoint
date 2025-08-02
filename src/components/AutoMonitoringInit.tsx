"use client";

import { useEffect, useState } from 'react';

export default function AutoMonitoringInit() {
  const [monitoringStatus, setMonitoringStatus] = useState<{
    initialized: boolean;
    running: boolean;
    error?: string;
  }>({ initialized: false, running: false });

  useEffect(() => {
    // Initialize automatic monitoring when component mounts
    const initializeMonitoring = async () => {
      try {
        console.log('🚀 Initializing automatic monitoring system...');
        
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
          setMonitoringStatus({
            initialized: false,
            running: false,
            error: result.error
          });
        }
        
      } catch (error) {
        console.error('❌ Error initializing monitoring system:', error);
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
