import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

/**
 * אישור הצעת מחיר על ידי לקוח
 * מעדכן את הסטטוס ומחזיר לינק לתשלום
 */
export async function POST(req: NextRequest) {
  try {
    const { quoteId, userId } = await req.json();

    if (!quoteId || !userId) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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

    // קריאה ל-API המרה לחשבונית
    const convertResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/admin/convert-quote-to-invoice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quoteId }),
    });

    const convertData = await convertResponse.json();

    if (!convertData.success) {
      return NextResponse.json(
        { success: false, error: convertData.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Quote approved and converted to invoice",
      invoice: convertData.invoice,
      payment: convertData.payment,
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
}
