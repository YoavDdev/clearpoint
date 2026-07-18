import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/admin-auth";

import { apiHandler } from "@/lib/api-handler";

export const dynamic = 'force-dynamic';

/**
 * עדכון מחיר חודשי של משתמש
 * POST /api/admin/update-monthly-price
 */
export const POST = apiHandler(async (req: NextRequest) => {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;
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

    const supabase = getSupabaseAdmin();

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
});
