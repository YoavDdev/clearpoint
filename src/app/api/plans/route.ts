import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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

    console.log("✅ Plans loaded:", data?.length || 0);
    if (data) {
      console.log("Plans IDs:", data.map(p => p.id));
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
}
