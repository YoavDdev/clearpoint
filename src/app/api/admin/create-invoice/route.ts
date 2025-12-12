import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createOneTimePayment, createRecurringSubscription } from "@/lib/payplus";

export async function POST(req: NextRequest) {
  try {
    const { 
      userId, 
      items, 
      notes, 
      customerName, 
      customerEmail,
      includeSubscription,
      monthlyPrice 
    } = await req.json();

    if (!userId || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // חישוב סכום כולל (ציוד + התקנה)
    // ⚠️ חודש ראשון חינם! לא מחייבים אותו בתשלום הראשוני
    const installationTotal = items.reduce(
      (sum: number, item: any) => sum + (item.total_price || 0),
      0
    );
    // תמיד רק ציוד + התקנה, בלי חודש ראשון
    const totalAmount = installationTotal;

    // יצירת מספר חשבונית
    const { data: invoiceNumber } = await supabase.rpc("generate_invoice_number");

    // יצירת חשבונית
    const { data: invoice, error: invoiceError } = await supabase
      .from("invoices")
      .insert({
        user_id: userId,
        invoice_number: invoiceNumber || `INV-${Date.now()}`,
        status: "draft",
        total_amount: totalAmount,
        currency: "ILS",
        notes: notes || null,
        has_subscription: includeSubscription || false,
        monthly_price: includeSubscription ? monthlyPrice : null,
      })
      .select()
      .single();

    if (invoiceError || !invoice) {
      console.error("Error creating invoice:", invoiceError);
      return NextResponse.json(
        { success: false, error: "Failed to create invoice" },
        { status: 500 }
      );
    }

    // הוספת פריטים לחשבונית
    const invoiceItems = items.map((item: any, index: number) => ({
      invoice_id: invoice.id,
      item_type: item.item_type,
      item_name: item.item_name,
      item_description: item.item_description || null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price,
      camera_type: item.camera_type || null,
      sort_order: index,
    }));

    const { error: itemsError } = await supabase
      .from("invoice_items")
      .insert(invoiceItems);

    if (itemsError) {
      console.error("Error creating invoice items:", itemsError);
      // מחיקת החשבונית אם נכשלה הוספת הפריטים
      await supabase.from("invoices").delete().eq("id", invoice.id);
      return NextResponse.json(
        { success: false, error: "Failed to create invoice items" },
        { status: 500 }
      );
    }

    // יצירת רשומת תשלום
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        user_id: userId,
        payment_provider: "payplus",
        payment_type: "one_time",
        amount: totalAmount.toString(),
        currency: "ILS",
        status: "pending",
        description: `חשבונית #${invoice.invoice_number}`,
        items: items.map((item: any) => ({
          name: item.item_name,
          quantity: item.quantity,
          price: item.unit_price,
          description: item.item_description,
        })),
        metadata: {
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
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

    // יצירת לינק תשלום דרך PayPlus
    const returnUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/invoice-payment-success?invoice_id=${invoice.id}`;
    const cancelUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/payment-cancelled`;

    const payplusResponse = await createOneTimePayment({
      sum: totalAmount,
      description: includeSubscription 
        ? `חשבונית #${invoice.invoice_number} (כולל מנוי) - ${customerName}`
        : `חשבונית #${invoice.invoice_number} - ${customerName}`,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: "", // נוסיף אם יש
      items: items.map((item: any) => ({
        name: item.item_name,
        quantity: item.quantity,
        price: item.unit_price,
        description: item.item_description || "",
      })),
      success_url: returnUrl,
      cancel_url: cancelUrl,
      // מידע נוסף למצב Mock
      monthly_price: includeSubscription ? monthlyPrice : undefined,
    });

    if (payplusResponse.status !== "1" || !payplusResponse.data) {
      console.error("PayPlus payment creation failed:", payplusResponse);
      return NextResponse.json(
        { success: false, error: "Failed to create payment link", details: payplusResponse.err },
        { status: 500 }
      );
    }

    // עדכון רשומת התשלום עם פרטי PayPlus
    await supabase
      .from("payments")
      .update({
        provider_transaction_id: payplusResponse.data.processId,
        provider_payment_url: payplusResponse.data.pageUrl,
        provider_response: payplusResponse.data,
      })
      .eq("id", payment.id);

    // עדכון החשבונית עם פרטי התשלום
    await supabase
      .from("invoices")
      .update({
        payment_id: payment.id,
        payment_link: payplusResponse.data.pageUrl,
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", invoice.id);

    // יצירת מנוי חודשי אם נדרש
    let subscriptionId = null;
    if (includeSubscription && monthlyPrice) {
      console.log('🔄 Creating recurring subscription...');
      
      // תאריך התחלה - חודש מהיום
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() + 1);
      
      const subscriptionResponse = await createRecurringSubscription({
        amount: monthlyPrice,
        currency: 'ILS',
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: '',
        customer_id: userId,
        billing_cycle: 'monthly',
        description: `מנוי חודשי - ${customerName}`,
        start_date: startDate.toISOString().split('T')[0],
        notify_url: `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/payplus/recurring`,
      });

      if (subscriptionResponse.status === '1' && subscriptionResponse.data) {
        console.log('✅ Subscription created:', subscriptionResponse.data.transactionId);
        
        // שמירת המנוי ב-DB
        const { data: subscription, error: subError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: userId,
            plan_id: 'monthly-service', // או ID של תוכנית
            status: 'active',
            billing_cycle: 'monthly',
            amount: monthlyPrice,
            currency: 'ILS',
            next_billing_date: startDate.toISOString().split('T')[0],
            started_at: new Date().toISOString(),
            payment_provider: 'payplus',
            provider_subscription_id: subscriptionResponse.data.transactionId,
            metadata: subscriptionResponse.data,
          })
          .select()
          .single();

        if (!subError && subscription) {
          subscriptionId = subscription.id;
          console.log('✅ Subscription saved to DB:', subscriptionId);
          
          // עדכון users.plan_duration_days (14 ימים עם מנוי)
          await supabase
            .from('users')
            .update({
              plan_duration_days: 14,
              subscription_active: true
            })
            .eq('id', userId);
          
          console.log('✅ Updated user plan_duration_days = 14');
        } else {
          console.error('❌ Failed to save subscription to DB:', subError);
        }
      } else {
        console.error('❌ Failed to create PayPlus subscription:', subscriptionResponse.err);
      }
    }

    // לינק לדף החשבונית שלנו (לא ישר ל-PayPlus)
    const invoiceUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/invoice/${invoice.id}`;

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        total_amount: totalAmount,
        has_subscription: includeSubscription,
        monthly_price: monthlyPrice,
      },
      payment: {
        id: payment.id,
        amount: totalAmount,
        paymentUrl: payplusResponse.data.pageUrl,
        processId: payplusResponse.data.processId,
      },
      subscription: subscriptionId ? { id: subscriptionId } : null,
      invoiceUrl: invoiceUrl, // לינק לחשבונית שלנו
      paymentUrl: payplusResponse.data.pageUrl, // לינק ל-PayPlus (לשימוש פנימי)
    });
  } catch (error) {
    console.error("Error in create-invoice:", error);
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
