import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic';

/**
 * 🧪 API לסימולציה של תשלום חוזר (מנוי)
 * משמש לבדיקת המערכת ללא צורך לחכות לתשלום אמיתי מPayPlus
 * 
 * Usage:
 * POST /api/admin/simulate-recurring-payment
 * Body: { userId: "user-id-here" }
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId is required" },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // מצא את המנוי הפעיל של המשתמש
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "active")
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { success: false, error: "No active subscription found for this user" },
        { status: 404 }
      );
    }

    console.log("🔄 Simulating recurring payment for subscription:", subscription.id);

    // חישוב תאריך חיוב הבא
    const nextBillingDate = new Date(subscription.next_billing_date);
    if (subscription.billing_cycle === "monthly") {
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
    } else if (subscription.billing_cycle === "yearly") {
      nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
    }

    // עדכון המנוי
    await supabase
      .from("subscriptions")
      .update({
        last_billing_date: new Date().toISOString().split("T")[0],
        next_billing_date: nextBillingDate.toISOString().split("T")[0],
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.id);

    console.log("✅ Subscription updated - next billing:", nextBillingDate.toISOString());

    // יצירת רשומת payment
    const { data: newPayment } = await supabase
      .from("payments")
      .insert({
        user_id: userId,
        amount: subscription.custom_price || subscription.amount,
        currency: "ILS",
        status: "completed",
        payment_type: "recurring",
        description: `חיוב חודשי אוטומטי - סימולציה - ${new Date().toLocaleDateString('he-IL')}`,
        payment_provider: "payplus",
        provider_payment_id: `SIM-${Date.now()}`,
        provider_transaction_id: `SIM-${Date.now()}`,
        paid_at: new Date().toISOString(),
      })
      .select()
      .single();

    console.log("✅ Payment record created:", newPayment?.id);

    // יצירת חשבונית אוטומטית
    if (newPayment) {
      const { data: invoiceNumber } = await supabase.rpc("generate_invoice_number");
      
      const { data: newInvoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          user_id: userId,
          invoice_number: invoiceNumber || `INV-${Date.now()}`,
          status: "paid",
          total_amount: subscription.custom_price || subscription.amount,
          currency: "ILS",
          payment_id: newPayment.id,
          has_subscription: true,
          monthly_price: subscription.custom_price || subscription.amount,
          notes: `תשלום חודשי אוטומטי - סימולציה\nתאריך: ${new Date().toLocaleDateString('he-IL')}\nעסקה: SIM-${Date.now()}`,
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (!invoiceError && newInvoice) {
        await supabase
          .from("invoice_items")
          .insert({
            invoice_id: newInvoice.id,
            item_type: "subscription",
            item_name: "מנוי חודשי",
            item_description: `מנוי לשירות Clearpoint Security - ${new Date().toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}`,
            quantity: 1,
            unit_price: subscription.custom_price || subscription.amount,
            total_price: subscription.custom_price || subscription.amount,
            sort_order: 0,
          });

        console.log(`✅ Invoice created: ${newInvoice.invoice_number}`);

        // שליחת אימייל ללקוח עם החשבונית
        try {
          const { data: user } = await supabase
            .from("users")
            .select("full_name, email")
            .eq("id", userId)
            .single();

          if (user) {
            const { sendInvoiceEmail } = await import('@/lib/email');
            await sendInvoiceEmail({
              customerName: user.full_name || user.email,
              customerEmail: user.email,
              invoiceNumber: newInvoice.invoice_number,
              invoiceDate: new Date().toLocaleDateString('he-IL'),
              totalAmount: subscription.custom_price || subscription.amount,
              items: [{
                name: "מנוי חודשי",
                description: `מנוי לשירות Clearpoint Security - ${new Date().toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}`,
                quantity: 1,
                price: subscription.custom_price || subscription.amount,
              }],
              invoiceUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/invoice/${newInvoice.id}`,
              isMonthlyRecurring: true,
            });
            console.log('📧 Monthly invoice email sent to customer');
          }
        } catch (emailError) {
          console.error('⚠️ Failed to send invoice email:', emailError);
          // לא עוצרים את הזרימה - החשבונית כבר נוצרה
        }

        return NextResponse.json({
          success: true,
          message: "Recurring payment simulated successfully",
          data: {
            subscription: {
              id: subscription.id,
              next_billing_date: nextBillingDate.toISOString().split("T")[0],
            },
            payment: {
              id: newPayment.id,
              amount: newPayment.amount,
            },
            invoice: {
              id: newInvoice.id,
              invoice_number: newInvoice.invoice_number,
              url: `${process.env.NEXT_PUBLIC_BASE_URL}/invoice/${newInvoice.id}`,
            },
          },
        });
      } else {
        return NextResponse.json({
          success: false,
          error: "Payment created but invoice failed",
          details: invoiceError,
        }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: false,
      error: "Failed to create payment",
    }, { status: 500 });

  } catch (error) {
    console.error("❌ Simulation error:", error);
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
