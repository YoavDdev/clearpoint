import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/admin-auth";

import { apiHandler } from "@/lib/api-handler";

export const dynamic = 'force-dynamic';

export const DELETE = apiHandler(async () => {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;
  try {
    const supabase = getSupabaseAdmin();

    // Delete all alerts
    const { error } = await supabase
      .from("system_alerts")
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all (dummy condition)

    if (error) {
      console.error("Error deleting all alerts:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log("✅ All alerts deleted successfully");

    return NextResponse.json({
      success: true,
      message: "All alerts deleted successfully"
    });

  } catch (error: any) {
    console.error("Error in delete-all route:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
});
