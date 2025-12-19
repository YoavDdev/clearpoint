import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  try {
    const { invoiceId } = await req.json();

    if (!invoiceId) {
      return NextResponse.json(
        { success: false, error: "Invoice ID is required" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get invoice details first to check status
    const { data: invoice, error: fetchError } = await supabase
      .from("invoices")
      .select("id, status")
      .eq("id", invoiceId)
      .single();

    if (fetchError || !invoice) {
      return NextResponse.json(
        { success: false, error: "Invoice not found" },
        { status: 404 }
      );
    }

    // Only allow deletion of invoices with 'sent' status (pending payment)
    if (invoice.status !== "sent") {
      return NextResponse.json(
        { success: false, error: "ניתן למחוק רק חשבוניות בסטטוס ממתין" },
        { status: 400 }
      );
    }

    // Delete the invoice
    const { error: deleteError } = await supabase
      .from("invoices")
      .delete()
      .eq("id", invoiceId);

    if (deleteError) {
      console.error("Error deleting invoice:", deleteError);
      return NextResponse.json(
        { success: false, error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "החשבונית נמחקה בהצלחה",
    });
  } catch (error: any) {
    console.error("Error in delete-invoice API:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
