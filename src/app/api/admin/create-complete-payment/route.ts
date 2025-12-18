import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createRecurringSubscription, calculateNextBillingDate } from "@/lib/payplus";

export const dynamic = 'force-dynamic';

/**
 * יצירת תשלום מושלם: חשבונית התקנה + מנוי חודשי
 * POST /api/admin/create-complete-payment
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("📥 Request body:", JSON.stringify(body, null, 2));
    
    const { userId, planId, monthlyPrice, installationItems, notes } = body;

    if (!userId || !planId || !monthlyPrice || !installationItems) {
      console.error("❌ Missing fields:", { userId, planId, monthlyPrice, hasItems: !!installationItems });
      return NextResponse.json(
        { 
          success: false, 
          error: "Missing required fields",
          missing: {
            userId: !userId,
            planId: !planId,
            monthlyPrice: !monthlyPrice,
            installationItems: !installationItems
          }
        },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log(`💎 Creating complete payment for user: ${userId}`);

    // קבלת פרטי המשתמש
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // חישוב סה"כ התקנה
    const installationTotal = installationItems.reduce(
      (sum: number, item: any) => sum + item.price * item.quantity,
      0
    );

    console.log(`💰 Installation total: ₪${installationTotal}`);
    console.log(`🔄 Monthly subscription: ₪${monthlyPrice}`);

    // ===== שלב 1: יצירת חשבונית התקנה =====
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        user_id: userId,
        total_amount: installationTotal,
        currency: "ILS",
        status: "pending",
        notes: notes || null,
      })
      .select()
      .single();

    if (invoiceError || !invoice) {
      console.error("Failed to create invoice:", invoiceError);
      return NextResponse.json(
        { success: false, error: "Failed to create invoice" },
        { status: 500 }
      );
    }

    console.log(`✅ Invoice created: ${invoice.id}`);

    // יצירת פריטי החשבונית
    const invoiceItemsData = installationItems.map((item: any) => ({
      invoice_id: invoice.id,
      name: item.name,
      description: item.description || null,
      quantity: item.quantity,
      price: item.price,
      category: item.category || "other",
    }));

    await supabase.from("invoice_items").insert(invoiceItemsData);

    // ===== שלב 2: יצירת מנוי חודשי =====
    
    // בדיקה אם יש מנוי קיים
    const { data: existingSubscription } = await supabase
      .from("subscriptions")
      .select("id, status")
      .eq("user_id", userId)
      .single();

    // מחיקת מנוי ישן אם קיים
    if (existingSubscription) {
      console.log(`🗑️ Deleting old subscription: ${existingSubscription.id}`);
      await supabase.from("subscriptions").delete().eq("id", existingSubscription.id);
    }

    // חישוב תאריך חיוב ראשון (חודש אחרי ההתקנה)
    const now = new Date();
    const nextBillingDate = calculateNextBillingDate("monthly", now);

    // יצירת המנוי
    const { data: subscription, error: subscriptionError } = await supabase
      .from("subscriptions")
      .insert({
        user_id: userId,
        plan_id: planId,
        status: "pending_activation",
        billing_cycle: "monthly",
        amount: monthlyPrice,
        currency: "ILS",
        next_billing_date: nextBillingDate.toISOString().split("T")[0],
        billing_day: nextBillingDate.getDate(),
        payment_provider: "grow",
      })
      .select()
      .single();

    if (subscriptionError || !subscription) {
      console.error("Failed to create subscription:", subscriptionError);
      return NextResponse.json(
        { success: false, error: "Failed to create subscription" },
        { status: 500 }
      );
    }

    console.log(`✅ Subscription created: ${subscription.id}`);

    // ===== שלב 3: יצירת תשלום משולב ב-Grow =====
    
    // יצירת תשלום ההתקנה + הגדרת מנוי חוזר
    const growSubscription = await createRecurringSubscription({
      customer_id: userId,
      amount: installationTotal, // תשלום ההתקנה עכשיו
      currency: "ILS",
      description: `Clearpoint Security - התקנה (₪${installationTotal}) + מנוי חודשי (₪${monthlyPrice})`,
      customer_name: user.full_name || user.email,
      customer_email: user.email,
      customer_phone: user.phone || "",
      billing_cycle: "monthly",
      start_date: nextBillingDate.toISOString().split("T")[0], // חיוב חודשי מתחיל בעוד חודש
      recurring_amount: monthlyPrice, // סכום החיוב החודשי
    });

    if (!growSubscription.data?.pageUrl) {
      console.error("Failed to create PayPlus payment");
      return NextResponse.json(
        { success: false, error: "Failed to create PayPlus payment" },
        { status: 500 }
      );
    }

    console.log(`✅ PayPlus payment created`);

    // עדכון החשבונית והמנוי עם פרטי PayPlus
    await supabase
      .from("invoices")
      .update({
        provider_payment_id: growSubscription.data.processId,
        provider_transaction_id: growSubscription.data.transactionId,
      })
      .eq("id", invoice.id);

    await supabase
      .from("subscriptions")
      .update({
        provider_subscription_id: growSubscription.data.processId,
        provider_customer_id: growSubscription.data.transactionId,
      })
      .eq("id", subscription.id);

    // יצירת רשומת תשלום
    await supabase.from("payments").insert({
      user_id: userId,
      payment_type: "installation_with_subscription",
      amount: installationTotal,
      currency: "ILS",
      status: "pending",
      payment_provider: "grow",
      provider_payment_id: growSubscription.data.processId,
      provider_transaction_id: growSubscription.data.transactionId,
      description: `התקנה + מנוי חודשי`,
      metadata: {
        invoice_id: invoice.id,
        subscription_id: subscription.id,
        installation_amount: installationTotal,
        monthly_amount: monthlyPrice,
      },
    });

    console.log(`💎 Complete payment created successfully!`);

    return NextResponse.json({
      success: true,
      invoiceId: invoice.id,
      subscriptionId: subscription.id,
      paymentUrl: growSubscription.data.pageUrl,
      installationTotal,
      monthlyPrice,
      nextBillingDate: nextBillingDate.toISOString(),
    });
  } catch (error) {
    console.error("Create complete payment error:", error);
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
