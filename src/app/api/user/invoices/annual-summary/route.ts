import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

import { apiHandler } from "@/lib/api-handler";

export const dynamic = 'force-dynamic';

// GET /api/user/invoices/annual-summary?year=2026
export const GET = apiHandler(async (req: NextRequest) => {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: user } = await supabase
      .from("users")
      .select("id, email, full_name")
      .eq("email", session.user.email)
      .single();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const year = req.nextUrl.searchParams.get("year") || new Date().getFullYear().toString();
    const startDate = `${year}-01-01T00:00:00.000Z`;
    const endDate = `${year}-12-31T23:59:59.999Z`;

    const { data: invoices, error } = await supabase
      .from("invoices")
      .select(`
        id, invoice_number, document_type, status,
        total_amount, currency, created_at, paid_at,
        has_subscription, monthly_price
      `)
      .eq("user_id", user.id)
      .eq("document_type", "invoice")
      .eq("status", "paid")
      .gte("paid_at", startDate)
      .lte("paid_at", endDate)
      .order("paid_at", { ascending: true });

    if (error) {
      console.error("Error fetching annual summary:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch data" },
        { status: 500 }
      );
    }

    const totalPaid = (invoices || []).reduce((sum, inv) => sum + Number(inv.total_amount), 0);
    const recurringTotal = (invoices || []).filter(i => i.has_subscription).reduce((sum, inv) => sum + Number(inv.total_amount), 0);
    const oneTimeTotal = (invoices || []).filter(i => !i.has_subscription).reduce((sum, inv) => sum + Number(inv.total_amount), 0);

    // Monthly breakdown
    const monthlyBreakdown: Record<string, number> = {};
    for (const inv of invoices || []) {
      const month = new Date(inv.paid_at!).toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
      monthlyBreakdown[month] = (monthlyBreakdown[month] || 0) + Number(inv.total_amount);
    }

    return NextResponse.json({
      success: true,
      year,
      customerName: user.full_name || user.email,
      summary: {
        totalPaid,
        recurringTotal,
        oneTimeTotal,
        invoiceCount: (invoices || []).length,
        monthlyBreakdown,
      },
      invoices: invoices || [],
    });
  } catch (error) {
    console.error("Error in annual summary API:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
});
