import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

 function normalizeDateParam(param: string, isEnd: boolean) {
   // Supports either ISO timestamps or date-only strings (YYYY-MM-DD).
   // Date-only strings are converted to UTC start/end of day to avoid timezone ambiguity.
   const dateOnlyMatch = /^\d{4}-\d{2}-\d{2}$/.exec(param);
   if (dateOnlyMatch) {
     const [y, m, d] = param.split('-').map((v) => Number(v));
     const date = isEnd
       ? new Date(Date.UTC(y, m - 1, d, 23, 59, 59, 999))
       : new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
     return date.toISOString();
   }

   const parsed = new Date(param);
   if (Number.isNaN(parsed.getTime())) {
     return null;
   }
   return parsed.toISOString();
 }

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
    const subscription = searchParams.get("subscription");
    const dateFromRaw = searchParams.get("date_from");
    const dateToRaw = searchParams.get("date_to");
    const dateFieldRaw = searchParams.get("date_field");

    const dateField = (dateFieldRaw === 'paid_at' || dateFieldRaw === 'created_at')
      ? dateFieldRaw
      : 'paid_at';

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

    // Optional filter: recurring receipts (has_subscription)
    if (subscription === 'true') {
      query = query.eq('has_subscription', true);
    } else if (subscription === 'false') {
      query = query.eq('has_subscription', false);
    }

    // Optional filter: date range
    if (dateFromRaw) {
      const dateFrom = normalizeDateParam(dateFromRaw, false);
      if (!dateFrom) {
        return NextResponse.json(
          { success: false, error: "Invalid date_from" },
          { status: 400 }
        );
      }
      query = query.gte(dateField, dateFrom);
    }

    if (dateToRaw) {
      const dateTo = normalizeDateParam(dateToRaw, true);
      if (!dateTo) {
        return NextResponse.json(
          { success: false, error: "Invalid date_to" },
          { status: 400 }
        );
      }
      query = query.lte(dateField, dateTo);
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
