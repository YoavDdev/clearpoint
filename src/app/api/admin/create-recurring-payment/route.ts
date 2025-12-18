import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createRecurringSubscription } from "@/lib/payplus";

export const dynamic = 'force-dynamic';

/**
 * API ליצירת הוראת קבע חודשית ישירות דרך PayPlus
 * הזרימה:
 * 1. יוצר recurring payment ב-PayPlus (ללא חיוב ראשון)
 * 2. PayPlus מחזיר לינק לדף תשלום
 * 3. לקוח נכנס ללינק, מזין כרטיס, ומאשר
 * 4. PayPlus יוצר הוראת קבע + מחייב מחודש 2
 * 5. Webhook שלנו מקבל הודעה ומעדכן DB
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, monthlyPrice } = await req.json();

    if (!userId || !monthlyPrice) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // קבלת פרטי משתמש
    const { data: user } = await supabase
      .from("users")
      .select("id, full_name, email, phone, plan_id")
      .eq("id", userId)
      .single();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // תאריך התחלה - חודש מהיום
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() + 1);

    console.log("🔄 Creating recurring payment in PayPlus...");
    console.log("User:", user.full_name, user.email);
    console.log("Amount:", monthlyPrice, "ILS/month");
    console.log("Start date:", startDate.toISOString().split('T')[0]);

    // יצירת הוראת קבע ב-PayPlus
    const recurringResponse = await createRecurringSubscription({
      customer_id: userId,
      amount: monthlyPrice,
      currency: "ILS",
      description: `מנוי חודשי Clearpoint Security - ${user.full_name}`,
      customer_name: user.full_name,
      customer_email: user.email,
      customer_phone: user.phone || "",
      billing_cycle: "monthly",
      start_date: startDate.toISOString().split('T')[0],
      notify_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/payplus`,
    });

    if (recurringResponse.status !== "1" || !recurringResponse.data) {
      console.error("❌ PayPlus recurring payment failed:", recurringResponse);
      return NextResponse.json(
        { 
          success: false, 
          error: "Failed to create recurring payment", 
          details: recurringResponse.err 
        },
        { status: 500 }
      );
    }

    console.log("✅ PayPlus recurring payment created:", recurringResponse.data);

    // שמירת pending subscription ב-DB (יושלם אחרי שהלקוח יאשר)
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .insert({
        user_id: userId,
        plan_id: user.plan_id || 'monthly-service',
        status: 'pending', // ממתין לאישור לקוח
        billing_cycle: 'monthly',
        amount: monthlyPrice,
        currency: 'ILS',
        next_billing_date: startDate.toISOString().split('T')[0],
        payment_provider: 'payplus',
        provider_subscription_id: recurringResponse.data.transactionId || recurringResponse.data.processId,
        metadata: {
          payplus_response: recurringResponse.data,
          payment_link: recurringResponse.data.pageUrl,
        },
      })
      .select()
      .single();

    if (subError) {
      console.error("❌ Failed to save subscription to DB:", subError);
      return NextResponse.json(
        { success: false, error: "Failed to save subscription" },
        { status: 500 }
      );
    }

    console.log("✅ Subscription saved to DB:", subscription.id);

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: 'pending',
        amount: monthlyPrice,
        next_billing_date: startDate.toISOString().split('T')[0],
      },
      paymentUrl: recurringResponse.data.pageUrl,
      message: "הוראת קבע נוצרה. שלח את הלינק ללקוח כדי שיאשר.",
    });
  } catch (error) {
    console.error("Error in create-recurring-payment:", error);
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
