import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

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

    // קבלת פרטי המנוי
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select(`
        *,
        plan:plans(*)
      `)
      .eq("user_id", payment.user_id)
      .eq("status", "active")
      .single();

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
          description: subscription?.plan
            ? `מנוי חודשי - ${subscription.plan.name_he || subscription.plan.name}`
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
      period: subscription
        ? `${new Date().toLocaleDateString("he-IL")} - ${new Date(
            new Date().setMonth(new Date().getMonth() + 1)
          ).toLocaleDateString("he-IL")}`
        : "חודש נוכחי",
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
