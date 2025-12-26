import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/create-manual-subscription-payplus
 * יצירת subscription ידנית ללקוח שיש לו הוראת קבע ב-PayPlus
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      user_id, 
      plan_id = 'basic',
      amount = 1,
      payplus_customer_uid,
      recurring_uid,
      billing_cycle = 'monthly'
    } = body;

    if (!user_id) {
      return NextResponse.json(
        { success: false, error: "Missing user_id" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. בדוק אם יש כבר subscription
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", user_id)
      .single();

    if (existingSub) {
      return NextResponse.json(
        { success: false, error: "Subscription already exists for this user" },
        { status: 400 }
      );
    }

    // 2. בדוק שהמשתמש קיים
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id, full_name, email")
      .eq("id", user_id)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // 3. צור subscription חדש
    const nextPaymentDate = new Date();
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .insert({
        user_id: user_id,
        plan_id: plan_id,
        status: 'active',
        billing_cycle: billing_cycle,
        amount: amount,
        currency: 'ILS',
        payment_method: 'credit_card',
        provider: 'payplus',
        payplus_customer_uid: payplus_customer_uid || null,
        recurring_uid: recurring_uid || null,
        start_date: new Date().toISOString(),
        next_payment_date: nextPaymentDate.toISOString(),
        last_payment_date: new Date().toISOString(),
        payment_failures: 0,
        auto_renew: true,
      })
      .select()
      .single();

    if (subError) {
      console.error("Error creating subscription:", subError);
      return NextResponse.json(
        { success: false, error: subError.message },
        { status: 500 }
      );
    }

    console.log(`✅ Created subscription for user ${user.full_name} (${user_id})`);

    return NextResponse.json({
      success: true,
      subscription: subscription,
      message: `Subscription created successfully for ${user.full_name}`,
    });

  } catch (error: any) {
    console.error("Error in create-manual-subscription-payplus:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint לבדיקה
export async function GET() {
  return NextResponse.json({
    message: "Create Manual Subscription for PayPlus",
    method: "POST only",
    requiredFields: ["user_id"],
    optionalFields: ["plan_id", "amount", "payplus_customer_uid", "recurring_uid", "billing_cycle"],
  });
}
