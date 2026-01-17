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
      .select("id, status, document_type")
      .eq("id", invoiceId)
      .single();

    if (fetchError || !invoice) {
      return NextResponse.json(
        { success: false, error: "Invoice not found" },
        { status: 404 }
      );
    }

    // לא ניתן למחוק מסמכים ששולמו
    if (invoice.status === "paid") {
      return NextResponse.json(
        { success: false, error: "לא ניתן למחוק חשבוניות ששולמו" },
        { status: 400 }
      );
    }

    // אם זו חשבונית שנוצרה מהצעת מחיר - נעדכן את הצעת המחיר המקורית
    if (invoice.document_type === 'invoice') {
      // חיפוש הצעת מחיר שמצביעה לחשבונית זו
      const { data: originalQuote } = await supabase
        .from("invoices")
        .select("id")
        .eq("converted_to_invoice_id", invoiceId)
        .single();

      if (originalQuote) {
        // עדכון הצעת המחיר - הסרת הקישור והחזרת הסטטוס ל-quote_sent
        await supabase
          .from("invoices")
          .update({
            converted_to_invoice_id: null,
            status: "quote_sent",
            approved_at: null,
          })
          .eq("id", originalQuote.id);
      }
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
