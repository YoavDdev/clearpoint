import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { convertQuoteToInvoice } from "@/lib/convert-quote";

import { apiHandler } from "@/lib/api-handler";

export const dynamic = 'force-dynamic';

/**
 * המרת הצעת מחיר לחשבונית עם לינק תשלום (אדמין)
 */
export const POST = apiHandler(async (req: NextRequest) => {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;
  try {
    const { quoteId } = await req.json();

    if (!quoteId) {
      return NextResponse.json(
        { success: false, error: "Missing quoteId" },
        { status: 400 }
      );
    }

    const result = await convertQuoteToInvoice(quoteId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: result.status || 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error in convert-quote-to-invoice:", error);
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
