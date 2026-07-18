import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = 'force-dynamic';

export async function DELETE() {
  try {
    const supabase = getSupabaseAdmin();

    // Delete only resolved alerts
    const { error, count } = await supabase
      .from("system_alerts")
      .delete({ count: 'exact' })
      .eq('resolved', true);

    if (error) {
      console.error("Error deleting resolved alerts:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    console.log(`✅ ${count || 0} resolved alerts deleted successfully`);

    return NextResponse.json({
      success: true,
      message: "All resolved alerts deleted successfully",
      count: count || 0
    });

  } catch (error: any) {
    console.error("Error in delete-resolved route:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
