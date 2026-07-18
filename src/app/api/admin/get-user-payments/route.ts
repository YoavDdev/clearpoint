import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = 'force-dynamic';

/**
 * API לקבלת תשלומים של משתמש
 * GET /api/admin/get-user-payments?userId=xxx
 */
export async function GET(req: NextRequest) {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Missing userId parameter" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // קבלת כל התשלומים של המשתמש
    const { data: payments, error } = await supabase
      .from("payments")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to fetch payments:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch payments" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      payments: payments || [],
    });
  } catch (error) {
    console.error("Get user payments error:", error);
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
