import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

// GET - Fetch all settings
export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: settings, error } = await supabase
      .from("system_settings")
      .select("*")
      .order("category", { ascending: true });

    if (error) {
      console.error("Error fetching settings:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    // Transform settings into a more usable format
    const settingsMap: Record<string, any> = {};
    settings?.forEach((setting) => {
      let value = setting.setting_value;
      
      // Convert to proper type
      if (setting.setting_type === 'boolean') {
        value = value === 'true';
      } else if (setting.setting_type === 'number') {
        value = parseInt(value, 10);
      } else if (setting.setting_type === 'json') {
        try {
          value = JSON.parse(value);
        } catch (e) {
          console.error(`Failed to parse JSON for ${setting.setting_key}:`, e);
        }
      }
      
      settingsMap[setting.setting_key] = value;
    });

    return NextResponse.json({
      success: true,
      settings: settingsMap,
      rawSettings: settings
    });
  } catch (error: any) {
    console.error("Error in GET /api/admin/settings:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update settings
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json(
        { success: false, error: "Invalid settings format" },
        { status: 400 }
      );
    }

    // Update each setting
    const updates = Object.entries(settings).map(async ([key, value]) => {
      // Determine the type
      let settingType = 'string';
      let settingValue = String(value);

      if (typeof value === 'boolean') {
        settingType = 'boolean';
        settingValue = value ? 'true' : 'false';
      } else if (typeof value === 'number') {
        settingType = 'number';
        settingValue = String(value);
      } else if (typeof value === 'object') {
        settingType = 'json';
        settingValue = JSON.stringify(value);
      }

      return supabase
        .from("system_settings")
        .update({
          setting_value: settingValue,
          setting_type: settingType,
          updated_at: new Date().toISOString(),
        })
        .eq("setting_key", key);
    });

    const results = await Promise.all(updates);
    
    // Check for errors
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      console.error("Errors updating settings:", errors);
      return NextResponse.json(
        { success: false, error: "Some settings failed to update", errors },
        { status: 500 }
      );
    }

    // Fetch updated settings
    const { data: updatedSettings } = await supabase
      .from("system_settings")
      .select("*");

    return NextResponse.json({
      success: true,
      message: "Settings updated successfully",
      settings: updatedSettings
    });
  } catch (error: any) {
    console.error("Error in PUT /api/admin/settings:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
