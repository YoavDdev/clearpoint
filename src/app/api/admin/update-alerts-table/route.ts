import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // Add missing columns one by one
    const updates = [
      // Add mini_pc_id column
      supabase.rpc('execute_sql', {
        query: 'ALTER TABLE system_alerts ADD COLUMN IF NOT EXISTS mini_pc_id UUID REFERENCES mini_pcs(id) ON DELETE CASCADE'
      }),
      
      // Add mini_pc_hostname column  
      supabase.rpc('execute_sql', {
        query: 'ALTER TABLE system_alerts ADD COLUMN IF NOT EXISTS mini_pc_hostname TEXT'
      }),
      
      // Make camera_name nullable
      supabase.rpc('execute_sql', {
        query: 'ALTER TABLE system_alerts ALTER COLUMN camera_name DROP NOT NULL'
      }),
      
      // Create index
      supabase.rpc('execute_sql', {
        query: 'CREATE INDEX IF NOT EXISTS idx_system_alerts_mini_pc_id ON system_alerts(mini_pc_id)'
      })
    ];

    const results = await Promise.allSettled(updates);
    const errors = results.filter(r => r.status === 'rejected').map(r => (r as PromiseRejectedResult).reason);

    if (errors.length > 0) {
      console.error('Error updating alerts table:', errors);
      return NextResponse.json(
        { success: false, error: errors[0]?.message || 'Failed to update table' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'system_alerts table updated successfully with Mini PC support'
    });

  } catch (error) {
    console.error('Error updating alerts table:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update alerts table' },
      { status: 500 }
    );
  }
}
