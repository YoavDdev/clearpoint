import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

// GET /api/admin/invoices - רשימת כל החשבוניות
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    const status = searchParams.get("status");
    const documentType = searchParams.get("document_type");

    let query = supabase
      .from("invoices")
      .select(`
        *,
        user:users (
          id,
          full_name,
          email,
          phone
        ),
        payment:payments!invoices_payment_id_fkey (
          id,
          status,
          amount,
          paid_at,
          provider_transaction_id,
          metadata
        )
      `)
      .order("created_at", { ascending: false });

    // פילטר לפי לקוח
    if (userId) {
      query = query.eq("user_id", userId);
    }

    // פילטר לפי סוג מסמך
    if (documentType && documentType !== "all") {
      query = query.eq("document_type", documentType);
    }

    // פילטר לפי סטטוס
    if (status && status !== "all") {
      query = query.eq("status", status);
    }

    const { data: invoices, error } = await query;

    if (error) {
      console.error("Error fetching invoices:", {
        message: error.message,
        details: (error as any).details,
        hint: (error as any).hint,
        code: (error as any).code,
      });
      return NextResponse.json(
        { success: false, error: "Failed to fetch invoices" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, invoices });
  } catch (error) {
    console.error("Error in admin invoices API:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
