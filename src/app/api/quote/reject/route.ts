import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

import { apiHandler } from "@/lib/api-handler";

export const dynamic = 'force-dynamic';

/**
 * דחיית הצעת מחיר על ידי לקוח
 */
export const POST = apiHandler(async (req: NextRequest) => {
  try {
    const { quoteId, userId, reason } = await req.json();

    if (!quoteId || !userId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    // וידוא שהצעת המחיר קיימת ושייכת למשתמש
    const { data: quote, error: quoteError } = await supabase
      .from("invoices")
      .select("*")
      .eq("id", quoteId)
      .eq("user_id", userId)
      .eq("document_type", "quote")
      .single();

    if (quoteError || !quote) {
      return NextResponse.json(
        { success: false, error: "Quote not found" },
        { status: 404 }
      );
    }

    // עדכון סטטוס לדחוי
    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        status: "quote_rejected",
        rejected_at: new Date().toISOString(),
        rejection_reason: reason || null,
      })
      .eq("id", quoteId);

    if (updateError) {
      console.error("Error rejecting quote:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to reject quote" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Quote rejected successfully",
    });
  } catch (error) {
    console.error("Error in reject quote:", error);
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
