import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User ID is required" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // שליפת מנוי פעיל
    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .select(`
        *,
        plan:plans(*)
      `)
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = לא נמצא (זה OK)
      console.error("Error fetching subscription:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch subscription" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      subscription: subscription || null,
    });
  } catch (error) {
    console.error("Get subscription error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
