import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('🧹 Starting duplicate alert cleanup...');
    
    // Get all unresolved alerts grouped by camera and type
    const { data: allAlerts, error: fetchError } = await supabase
      .from("system_alerts")
      .select("*")
      .eq("resolved", false)
      .order("created_at", { ascending: false });
    
    if (fetchError) {
      console.error('Error fetching alerts:', fetchError);
      return NextResponse.json({ success: false, error: fetchError.message });
    }
    
    console.log(`📊 Found ${allAlerts?.length || 0} unresolved alerts`);
    
    // Group alerts by camera_id and type
    const groupedAlerts = new Map<string, any[]>();
    
    allAlerts?.forEach(alert => {
      const key = `${alert.camera_id || alert.mini_pc_id}_${alert.type}`;
      if (!groupedAlerts.has(key)) {
        groupedAlerts.set(key, []);
      }
      groupedAlerts.get(key)?.push(alert);
    });
    
    // Find duplicates (groups with more than 1 alert)
    const duplicatesToDelete: string[] = [];
    let duplicateCount = 0;
    
    groupedAlerts.forEach((alerts, key) => {
      if (alerts.length > 1) {
        // Keep the most recent alert (first in array since we sorted DESC)
        const [keep, ...remove] = alerts;
        console.log(`🔍 Found ${alerts.length} duplicates for ${key}, keeping most recent (${keep.id})`);
        
        remove.forEach(alert => {
          duplicatesToDelete.push(alert.id);
          duplicateCount++;
        });
      }
    });
    
    console.log(`🗑️ Deleting ${duplicateCount} duplicate alerts...`);
    
    // Delete duplicates in batches
    if (duplicatesToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from("system_alerts")
        .delete()
        .in("id", duplicatesToDelete);
      
      if (deleteError) {
        console.error('Error deleting duplicates:', deleteError);
        return NextResponse.json({ success: false, error: deleteError.message });
      }
    }
    
    // Get final counts
    const { data: finalAlerts } = await supabase
      .from("system_alerts")
      .select("type")
      .eq("resolved", false);
    
    const alertsByType = finalAlerts?.reduce((acc: any, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {});
    
    console.log('✅ Cleanup complete!');
    console.log('📊 Final alert counts:', alertsByType);
    
    return NextResponse.json({
      success: true,
      deleted: duplicateCount,
      remaining: finalAlerts?.length || 0,
      alertsByType
    });
    
  } catch (error) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
