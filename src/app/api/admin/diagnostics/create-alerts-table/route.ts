import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Create system_alerts table
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS system_alerts (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          type TEXT NOT NULL CHECK (type IN ('camera_offline', 'disk_full', 'stream_error', 'device_error')),
          camera_id UUID REFERENCES cameras(id) ON DELETE CASCADE,
          camera_name TEXT NOT NULL,
          customer_name TEXT NOT NULL,
          message TEXT NOT NULL,
          severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          resolved BOOLEAN DEFAULT FALSE,
          notification_sent BOOLEAN DEFAULT FALSE,
          resolved_at TIMESTAMP WITH TIME ZONE,
          resolved_by TEXT
        );

        -- Create indexes for better performance
        CREATE INDEX IF NOT EXISTS idx_system_alerts_camera_id ON system_alerts(camera_id);
        CREATE INDEX IF NOT EXISTS idx_system_alerts_resolved ON system_alerts(resolved);
        CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity);
        CREATE INDEX IF NOT EXISTS idx_system_alerts_created_at ON system_alerts(created_at);

        -- Enable RLS
        ALTER TABLE system_alerts ENABLE ROW LEVEL SECURITY;

        -- Create policy for admin access
        CREATE POLICY IF NOT EXISTS "Admin can manage all alerts" ON system_alerts
          FOR ALL USING (true);
      `
    });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      message: "System alerts table created successfully"
    });

  } catch (error) {
    console.error('Create alerts table error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create alerts table' },
      { status: 500 }
    );
  }
}
