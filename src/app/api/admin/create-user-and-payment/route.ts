import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createOneTimePayment } from "@/lib/payplus";

// Admin API - צריך להיות מוגן!
export async function POST(req: NextRequest) {
  try {
    const { requestId, planId } = await req.json();

    if (!requestId || !planId) {
      return NextResponse.json(
        { success: false, error: "Missing requestId or planId" },
        { status: 400 }
      );
    }

    // יצירת Supabase client עם service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. קבלת פרטי הבקשה
    const { data: request, error: requestError } = await supabase
      .from("subscription_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (requestError || !request) {
      return NextResponse.json(
        { success: false, error: "Request not found" },
        { status: 404 }
      );
    }

    // 2. בדיקה אם המשתמש כבר קיים
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("email", request.email)
      .single();

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "User already exists" },
        { status: 400 }
      );
    }

    // 3. קבלת פרטי התוכנית
    const { data: plan, error: planError } = await supabase
      .from("plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (planError || !plan) {
      return NextResponse.json(
        { success: false, error: "Plan not found" },
        { status: 404 }
      );
    }

    // 4. יצירת משתמש חדש (ללא auth בינתיים - רק רשומה ב-users)
    const temporaryPassword = Math.random().toString(36).slice(-8);
    
    const { data: newUser, error: userError } = await supabase
      .from("users")
      .insert({
        email: request.email,
        full_name: request.full_name,
        phone: request.phone,
        address: request.address,
        plan_id: planId,
        status: "pending_payment",
        role: "user",
      })
      .select()
      .single();

    if (userError || !newUser) {
      console.error("Error creating user:", userError);
      return NextResponse.json(
        { success: false, error: "Failed to create user", details: userError },
        { status: 500 }
      );
    }

    // 5. יצירת רשומת תשלום ב-DB
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        user_id: newUser.id,
        payment_type: "one_time",
        amount: plan.setup_price.toString(),
        currency: "ILS",
        status: "pending",
        description: `תשלום התקנה - ${plan.name_he || plan.name}`,
        items: [
          {
            name: plan.name_he || plan.name,
            quantity: 1,
            price: plan.setup_price,
            description: `התקנה ראשונית - ${plan.name_he}`,
          },
        ],
        metadata: {
          plan_id: planId,
          plan_name: plan.name,
          plan_name_he: plan.name_he,
          connection_type: plan.connection_type,
          request_id: requestId,
        },
      })
      .select()
      .single();

    if (paymentError || !payment) {
      console.error("Error creating payment:", paymentError);
      return NextResponse.json(
        { success: false, error: "Failed to create payment record" },
        { status: 500 }
      );
    }

    // 6. יצירת לינק תשלום דרך PayPlus
    const returnUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/payment-success?payment_id=${payment.id}`;
    const cancelUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/payment-cancelled`;

    const payplusResponse = await createOneTimePayment({
      sum: plan.setup_price,
      description: `התקנה - ${plan.name_he || plan.name}`,
      customer_name: request.full_name,
      customer_email: request.email,
      customer_phone: request.phone,
      items: [
        {
          name: plan.name_he || plan.name,
          quantity: 1,
          price: plan.setup_price,
          description: `התקנה ראשונית`,
        },
      ],
      success_url: returnUrl,
      cancel_url: cancelUrl,
    });

    if (payplusResponse.status !== '1' || !payplusResponse.data) {
      console.error("PayPlus payment creation failed:", payplusResponse);
      return NextResponse.json(
        { success: false, error: "Failed to create payment link", details: payplusResponse.err },
        { status: 500 }
      );
    }

    // 7. עדכון רשומת התשלום עם פרטי PayPlus
    await supabase
      .from("payments")
      .update({
        payment_provider: "payplus",
        provider_transaction_id: payplusResponse.data.processId,
        provider_payment_url: payplusResponse.data.pageUrl,
        provider_response: payplusResponse.data,
      })
      .eq("id", payment.id);

    // 8. עדכון סטטוס הבקשה
    await supabase
      .from("subscription_requests")
      .update({
        status: "payment_link_sent",
        payment_link: payplusResponse.data.pageUrl,
        user_id: newUser.id,
      })
      .eq("id", requestId);

    // 9. TODO: שליחת SMS/אימייל ללקוח עם הלינק
    // כאן נוסיף אינטגרציה עם שירות SMS בעתיד

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        full_name: newUser.full_name,
      },
      payment: {
        id: payment.id,
        amount: payment.amount,
        paymentUrl: payplusResponse.data.pageUrl,
        processId: payplusResponse.data.processId,
      },
    });
  } catch (error) {
    console.error("Error in create-user-and-payment:", error);
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
