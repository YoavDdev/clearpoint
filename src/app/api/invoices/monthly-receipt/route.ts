import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

/**
 * יצירת קבלה חודשית לתשלום מנוי
 * GET /api/invoices/monthly-receipt?paymentId=xxx
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const paymentId = searchParams.get("paymentId");

    if (!paymentId) {
      return NextResponse.json(
        { success: false, error: "Missing paymentId" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // קבלת פרטי התשלום
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select(`
        *,
        user:users(
          id,
          full_name,
          email,
          phone,
          address
        )
      `)
      .eq("id", paymentId)
      .single();

    if (paymentError || !payment) {
      return NextResponse.json(
        { success: false, error: "Payment not found" },
        { status: 404 }
      );
    }

    // קבלת פרטי המנוי מ-recurring_payments
    const { data: recurringPayment } = await supabase
      .from("recurring_payments")
      .select(`
        id, amount, plan_id,
        plan:plans(*)
      `)
      .eq("user_id", payment.user_id)
      .eq("is_active", true)
      .eq("is_valid", true)
      .maybeSingle();

    // יצירת קבלה
    const receipt = {
      receiptNumber: `REC-${paymentId.substring(0, 8).toUpperCase()}`,
      date: new Date(payment.paid_at || payment.created_at).toLocaleDateString("he-IL"),
      customer: {
        name: payment.user.full_name || payment.user.email,
        email: payment.user.email,
        phone: payment.user.phone,
        address: payment.user.address,
      },
      items: [
        {
          description: (recurringPayment as any)?.plan
            ? `מנוי חודשי - ${(recurringPayment as any).plan.name_he || (recurringPayment as any).plan.name}`
            : "מנוי חודשי - Clearpoint Security",
          quantity: 1,
          price: parseFloat(payment.amount),
          total: parseFloat(payment.amount),
        },
      ],
      subtotal: parseFloat(payment.amount),
      tax: 0, // ללא מע"מ
      total: parseFloat(payment.amount),
      paymentMethod: "כרטיס אשראי",
      paymentStatus: payment.status === "completed" ? "שולם" : "ממתין",
      period: `${new Date().toLocaleDateString("he-IL")} - ${new Date(
          new Date().setMonth(new Date().getMonth() + 1)
        ).toLocaleDateString("he-IL")}`,
    };

    return NextResponse.json({
      success: true,
      receipt,
    });
  } catch (error) {
    console.error("Error generating receipt:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate receipt",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
