import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * עדכון מחיר חודשי של משתמש
 * POST /api/admin/update-monthly-price
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, newPrice } = await req.json();

    if (!userId || newPrice === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    if (newPrice < 0 || isNaN(newPrice)) {
      return NextResponse.json(
        { success: false, error: "Invalid price" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log(`💰 Updating monthly price for user ${userId}: ₪${newPrice}`);

    // עדכון מחיר במשתמש
    const { error: userError } = await supabase
      .from("users")
      .update({ custom_price: newPrice })
      .eq("id", userId);

    if (userError) {
      console.error("Failed to update user price:", userError);
      return NextResponse.json(
        { success: false, error: "Failed to update user price" },
        { status: 500 }
      );
    }

    // עדכון מחיר במנוי הפעיל (אם קיים)
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (subscription) {
      console.log(`🔄 Updating subscription price as well`);
      await supabase
        .from("subscriptions")
        .update({ amount: newPrice })
        .eq("id", subscription.id);
    }

    console.log(`✅ Price updated successfully`);

    return NextResponse.json({
      success: true,
      message: "Price updated successfully",
      newPrice,
    });
  } catch (error) {
    console.error("Update price error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
