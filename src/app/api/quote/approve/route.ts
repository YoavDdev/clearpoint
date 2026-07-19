import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { convertQuoteToInvoice } from "@/lib/convert-quote";

import { apiHandler } from "@/lib/api-handler";

export const dynamic = 'force-dynamic';

/**
 * אישור הצעת מחיר על ידי לקוח
 * מעדכן את הסטטוס ומחזיר לינק לתשלום
 */
export const POST = apiHandler(async (req: NextRequest) => {
  try {
    const { quoteId, userId } = await req.json();

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

    // בדיקת תוקף הצעת המחיר
    if (quote.quote_valid_until) {
      const validUntil = new Date(quote.quote_valid_until);
      if (validUntil < new Date()) {
        return NextResponse.json(
          { success: false, error: "Quote has expired" },
          { status: 400 }
        );
      }
    }

    // המרה ישירה לחשבונית (ללא fetch עצמי)
    const result = await convertQuoteToInvoice(quoteId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status || 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Quote approved and converted to invoice",
      invoice: result.invoice,
      payment: result.payment,
    });
  } catch (error) {
    console.error("Error in approve quote:", error);
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
