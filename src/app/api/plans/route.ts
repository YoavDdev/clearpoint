import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { NextResponse } from "next/server";

import { apiHandler } from "@/lib/api-handler";

export const dynamic = 'force-dynamic';

export const GET = apiHandler(async () => {
  try {
    const supabase = getSupabaseAdmin();

    console.log("🔍 Fetching plans from Supabase...");

    // פשוט - בלי סינון, בלי is_active
    const { data, error } = await supabase
      .from("plans")
      .select("*")
      .order("monthly_price", { ascending: true });

    if (error) {
      console.error("❌ Supabase error:", error);
      return NextResponse.json(
        { success: false, error: error.message || "Failed to load plans" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      plans: data || [] 
    });
  } catch (err: any) {
    console.error("❌ Exception in plans API:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
});
