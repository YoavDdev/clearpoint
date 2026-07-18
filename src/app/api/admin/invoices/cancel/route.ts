import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { requireAdmin } from "@/lib/admin-auth";

import { apiHandler } from "@/lib/api-handler";

export const dynamic = 'force-dynamic';

export const POST = apiHandler(async (req: NextRequest) => {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;
  try {
    const { invoiceId } = await req.json();

    if (!invoiceId) {
      return NextResponse.json(
        { success: false, error: "Invoice ID is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: invoice, error: fetchError } = await supabase
      .from("invoices")
      .select("id, status, document_type")
      .eq("id", invoiceId)
      .single();

    if (fetchError || !invoice) {
      return NextResponse.json(
        { success: false, error: "Invoice not found" },
        { status: 404 }
      );
    }

    if (invoice.status === "paid") {
      return NextResponse.json(
        { success: false, error: "לא ניתן לבטל מסמך ששולם" },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabase
      .from("invoices")
      .update({
        status: "cancelled",
      })
      .eq("id", invoiceId)
      .neq("status", "paid");

    if (updateError) {
      console.error("Error cancelling invoice:", updateError);
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "המסמך בוטל בהצלחה",
    });
  } catch (error: any) {
    console.error("Error in cancel-invoice API:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
});
